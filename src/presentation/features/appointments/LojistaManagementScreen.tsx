import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AvailabilityGrid,
  AvailabilityGridInput,
  Establishment,
  EstablishmentInput,
  OfferedService,
  OfferedServiceInput,
  RegistrationAddress,
} from '../../../domain/repositories';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { Screen } from '../../components/ui/Screen';
import { Typography } from '../../components/ui/Typography';
import { SmartBackButton } from '../../components/ui/SmartBackButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Wordmark } from '../../components/brand/Logo';
import { colors, radius, spacing } from '../../../core/theme';
import { useApp } from '../../providers/AppProviders';
import { useSession } from '../../providers/SessionProvider';
import { useToast } from '../../providers/ToastProvider';
import { hasBothProfiles } from '../../navigation/profileRoutes';
import { getUserFriendlyErrorMessage } from '../../../core/utils/errors';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { isSafeImageUrl } from '../../../core/utils/imageValidation';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_PATTERN.test(id);

type Section = 'establishments' | 'services' | 'grids';
type DeleteTarget = { section: Section; id: string; name: string };

interface Configuration {
  establishments: Establishment[];
  services: OfferedService[];
  grids: AvailabilityGrid[];
}

interface FormValues {
  name: string;
  cnpj: string;
  email: string;
  logoKey: string;
  streetType: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  postalCode: string;
  city: string;
  state: string;
  price: string;
  description: string;
  establishmentIds: string[];
  establishmentId: string;
  serviceId: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: string;
  capacity: string;
  periodDays: string;
  startDate: string;
  endDate: string;
}

const EMPTY_FORM: FormValues = {
  name: '',
  cnpj: '',
  email: '',
  logoKey: '/logo.png',
  streetType: 'RUA',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  postalCode: '',
  city: '',
  state: '',
  price: '',
  description: '',
  establishmentIds: [],
  establishmentId: '',
  serviceId: '',
  weekdays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '18:00',
  intervalMinutes: '30',
  capacity: '1',
  periodDays: '30',
  startDate: localToday(),
  endDate: '',
};

const SECTIONS: { id: Section; title: string }[] = [
  { id: 'establishments', title: 'Unidades' },
  { id: 'services', title: 'Serviços' },
  { id: 'grids', title: 'Grades' },
];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function localToday() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  maxLength?: number;
}) {
  return (
    <View style={styles.field}>
      <Typography variant="label" color={colors.tinta}>{label}</Typography>
      <TextInput
        accessibilityLabel={label}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        keyboardType={keyboardType}
        maxLength={maxLength}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function dateToDisplay(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function parsePositiveInteger(value: string, label: string) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${label} deve ser um número inteiro maior que zero.`);
  return parsed;
}

function validateDate(value: string, label: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`${label}: use o formato AAAA-MM-DD.`);
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  if (
    date.getFullYear() !== Number(match[1])
    || date.getMonth() !== Number(match[2]) - 1
    || date.getDate() !== Number(match[3])
  ) {
    throw new Error(`${label}: use o formato AAAA-MM-DD.`);
  }
}

function timeToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match || Number(match[1]) > 23 || Number(match[2]) > 59) return undefined;
  return Number(match[1]) * 60 + Number(match[2]);
}

function LojistaManagementScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { usecases } = useApp();
  const { session, clearProfileSelection, signOut } = useSession();
  const lojistaProfile = session?.profiles.find((profile) => profile.kind === 'lojista');
  const [section, setSection] = useState<Section>('establishments');
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>();
  const [cepStatus, setCepStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const userMenuRef = useRef<View>(null);
  const userInitial = lojistaProfile?.name?.charAt(0).toUpperCase() ?? 'L';

  const openMenu = () => {
    userMenuRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setMenuPosition({ x: pageX + width - 180, y: pageY + height + 8 });
      setShowUserMenu(true);
    });
  };

  const closeMenu = () => {
    setShowUserMenu(false);
    setMenuPosition(null);
  };

  const switchProfile = async () => {
    try {
      await clearProfileSelection();
      router.replace('/selecionar-perfil');
    } catch (error) {
      // Error handled by provider
    }
    closeMenu();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      // Error handled by provider
    }
    closeMenu();
  };

  const load = useCallback(async (): Promise<Configuration> => {
    if (!lojistaProfile) throw new Error('Não foi possível identificar o perfil Lojista da sessão.');
    if (!session?.lojistaToken) throw new Error('Sua sessão expirou. Saia e entre novamente.');
    const establishments = await usecases.manageLojistaConfiguration.listEstablishments(lojistaProfile.id);
    const [services, grids] = await Promise.all([
      usecases.manageLojistaConfiguration.listServices(establishments.map((item) => item.id)),
      usecases.manageLojistaConfiguration.listGrids(lojistaProfile.id),
    ]);
    return { establishments, services, grids };
  }, [lojistaProfile, session?.lojistaToken, usecases]);
  const configuration = useAsync(load, [load]);
  useRefreshOnFocus(configuration.reload);

  const data = configuration.data;
  const selectedServices = useMemo(() => {
    if (!form.establishmentId) return [];
    return (data?.services ?? []).filter((service) =>
      service.active && service.establishmentIds.includes(form.establishmentId)
    );
  }, [data?.services, form.establishmentId]);

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingId(undefined);
    setForm(EMPTY_FORM);
  };

  const startNew = () => {
    const firstEstablishment = data?.establishments[0];
    const firstService = data?.services.find((item) =>
      item.active && item.establishmentIds.includes(firstEstablishment?.id ?? '')
    );
    setEditingId(undefined);
    setForm({
      ...EMPTY_FORM,
      establishmentIds: firstEstablishment ? [firstEstablishment.id] : [],
      establishmentId: firstEstablishment?.id ?? '',
      serviceId: firstService?.id ?? '',
    });
    setFormOpen(true);
    setDeleteTarget(undefined);
  };

  const startEditEstablishment = (item: Establishment) => {
    if (!isValidUUID(item.id)) return;
    setSection('establishments');
    setEditingId(item.id);
    setForm({
      ...EMPTY_FORM,
      name: item.name,
      cnpj: item.cnpj,
      email: item.email,
      streetType: item.address.tipoLogradouro,
      street: item.address.logradouro,
      number: item.address.numero,
      complement: item.address.complemento ?? '',
      neighborhood: item.address.bairro,
      postalCode: item.address.cep,
      city: item.address.municipio,
      state: item.address.unidadeFederativa,
    });
    setFormOpen(true);
    setDeleteTarget(undefined);
  };

  const startEditService = (item: OfferedService) => {
    if (!isValidUUID(item.id)) return;
    setSection('services');
    setEditingId(item.id);
    setForm({
      ...EMPTY_FORM,
      name: item.name,
      price: item.price === null ? '' : String(item.price),
      description: item.description,
      establishmentIds: item.establishmentIds,
    });
    setFormOpen(true);
    setDeleteTarget(undefined);
  };

  const startEditGrid = (item: AvailabilityGrid) => {
    if (!isValidUUID(item.id)) return;
    setSection('grids');
    setEditingId(item.id);
    setForm({
      ...EMPTY_FORM,
      establishmentId: item.establishmentId,
      serviceId: item.serviceId,
      weekdays: item.weekdays,
      startTime: item.startTime,
      endTime: item.endTime,
      intervalMinutes: String(item.intervalMinutes),
      capacity: String(item.capacity),
      periodDays: String(item.periodDays),
      startDate: item.startDate,
      endDate: item.endDate ?? '',
    });
    setFormOpen(true);
    setDeleteTarget(undefined);
  };

  const save = async () => {
    if (!lojistaProfile) return;
    setSaving(true);
    try {
      if (section === 'establishments') {
        const cnpj = form.cnpj.replace(/\D/g, '');
        if (!form.name.trim()) throw new Error('Informe o nome da unidade.');
        if (cnpj.length !== 14) throw new Error('Informe um CNPJ com 14 dígitos.');
        if (!EMAIL_PATTERN.test(form.email.trim())) throw new Error('Informe um e-mail válido.');
        const addressFields = [
          form.street, form.number, form.neighborhood, form.postalCode, form.city, form.state,
        ];
        if (addressFields.some((value) => !value.trim())) throw new Error('Preencha todos os campos obrigatórios do endereço.');
        if (form.postalCode.replace(/\D/g, '').length !== 8) throw new Error('O CEP deve ter 8 dígitos.');
        if (form.state.trim().length !== 2) throw new Error('A UF deve ter 2 letras.');
        const address: RegistrationAddress = {
          tipoLogradouro: form.streetType,
          logradouro: form.street.trim(),
          numero: form.number.trim(),
          complemento: form.complement.trim() || undefined,
          bairro: form.neighborhood.trim(),
          cep: form.postalCode.replace(/\D/g, ''),
          municipio: form.city.trim(),
          unidadeFederativa: form.state.trim().toUpperCase(),
        };
        const input: EstablishmentInput = {
          name: form.name.trim(),
          cnpj,
          email: form.email.trim(),
          address,
          logoKey: form.logoKey?.trim() || '/logo.png',
        };
        await usecases.manageLojistaConfiguration.saveEstablishment(lojistaProfile.id, input, editingId);
      } else if (section === 'services') {
        if (!form.name.trim()) throw new Error('Informe o nome do serviço.');
        if (form.establishmentIds.length === 0) throw new Error('Associe o serviço a pelo menos uma unidade.');
        const normalizedPrice = form.price.trim().replace(',', '.');
        const price = normalizedPrice ? Number(normalizedPrice) : null;
        if (price !== null && (!Number.isFinite(price) || price < 0)) throw new Error('Informe um preço válido.');
        const input: OfferedServiceInput = {
          name: form.name.trim(),
          price,
          description: form.description.trim(),
          establishmentIds: form.establishmentIds,
        };
        await usecases.manageLojistaConfiguration.saveService(input, editingId);
      } else {
        if (!form.establishmentId) throw new Error('Cadastre e selecione uma unidade antes de criar a grade.');
        if (!form.serviceId) throw new Error('Cadastre e selecione um serviço para esta unidade.');
        if (!selectedServices.some((item) => item.id === form.serviceId)) {
          throw new Error('O serviço selecionado não está associado à unidade escolhida.');
        }
        if (form.weekdays.length === 0) throw new Error('Selecione pelo menos um dia da semana.');
        const startMinutes = timeToMinutes(form.startTime);
        const endMinutes = timeToMinutes(form.endTime);
        if (startMinutes === undefined || endMinutes === undefined) {
          throw new Error('Informe os horários no formato HH:MM.');
        }
        if (startMinutes >= endMinutes) throw new Error('O horário final deve ser posterior ao inicial.');
        validateDate(form.startDate, 'Data de início');
        if (form.endDate) {
          validateDate(form.endDate, 'Data final');
          if (form.endDate < form.startDate) throw new Error('A data final deve ser igual ou posterior à inicial.');
        }
        const input: AvailabilityGridInput = {
          establishmentId: form.establishmentId,
          serviceId: form.serviceId,
          weekdays: form.weekdays,
          startTime: form.startTime,
          endTime: form.endTime,
          intervalMinutes: parsePositiveInteger(form.intervalMinutes, 'O intervalo'),
          capacity: parsePositiveInteger(form.capacity, 'A capacidade'),
          periodDays: parsePositiveInteger(form.periodDays, 'O período'),
          startDate: form.startDate,
          endDate: form.endDate || undefined,
        };
        await usecases.manageLojistaConfiguration.saveGrid(lojistaProfile.id, input, editingId);
      }
      closeForm();
      configuration.reload();
      toast.show(editingId ? 'Alterações salvas.' : 'Cadastro criado.');
    } catch (error) {
      toast.show(getUserFriendlyErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || !lojistaProfile) return;
    setSaving(true);
    try {
      if (deleteTarget.section === 'establishments') {
        await usecases.manageLojistaConfiguration.deleteEstablishment(deleteTarget.id);
      } else if (deleteTarget.section === 'services') {
        await usecases.manageLojistaConfiguration.deleteService(deleteTarget.id);
      } else {
        await usecases.manageLojistaConfiguration.deleteGrid(deleteTarget.id);
      }
      setDeleteTarget(undefined);
      configuration.reload();
      toast.show('Item excluído.');
    } catch (error) {
      toast.show(getUserFriendlyErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const switchSection = (nextSection: Section) => {
    setSection(nextSection);
    setFormOpen(false);
    setEditingId(undefined);
    setForm(EMPTY_FORM);
    setDeleteTarget(undefined);
  };

  const establishments = data?.establishments ?? [];
  const services = data?.services ?? [];
  const grids = data?.grids ?? [];

  return (
    <Screen statusBar="dark" background={colors.bg}>
      {showUserMenu && menuPosition && (
        <>
          <Pressable style={styles.userMenuBackdrop} onPress={closeMenu} />
          <Pressable
            style={[styles.userMenuPanelWrapper, { left: menuPosition.x, top: menuPosition.y }]}
            onPress={() => {}}
          >
            <View style={styles.userMenuPanel}>
              {session && hasBothProfiles(session.profiles) ? (
                <Pressable
                  style={styles.userMenuItem}
                  onPress={() => { closeMenu(); void switchProfile(); }}
                  accessibilityRole="menuitem"
                  hitSlop={{ left: 20, right: 20, top: 10, bottom: 10 }}
                >
                  <Typography variant="label" color={colors.tinta}>Trocar perfil</Typography>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.userMenuItem, styles.userMenuItemDestructive]}
                onPress={() => { closeMenu(); void handleSignOut(); }}
                accessibilityRole="menuitem"
                hitSlop={{ left: 20, right: 20, top: 10, bottom: 10 }}
              >
                <Typography variant="label" color={colors.coral}>Sair</Typography>
              </Pressable>
            </View>
          </Pressable>
        </>
      )}
      <ScreenHeader
        title="Configurar atendimento"
        left={<SmartBackButton compact fallbackHref="/agenda-lojista" />}
        right={
          <Pressable
            ref={userMenuRef}
            style={styles.userMenuTrigger}
            onPress={openMenu}
            accessibilityRole="button"
            accessibilityLabel="Menu do usuário"
            hitSlop={10}
          >
            <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
              <Typography variant="label" color={colors.white} size={16}>{userInitial}</Typography>
            </View>
          </Pressable>
        }
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.root}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingTop: 16, paddingBottom: Math.max(insets.bottom, 32) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sectionTabs}>
            {SECTIONS.map(({ id, title }) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected: section === id }}
                onPress={() => switchSection(id)}
                style={[styles.sectionTab, section === id && styles.sectionTabSelected]}
              >
                <Typography
                  variant="label"
                  size={14}
                  color={section === id ? colors.white : colors.tinta}
                >
                  {title}
                </Typography>
              </Pressable>
            ))}
          </View>

          {configuration.loading && !data ? <LoadingState /> : null}
          {configuration.error ? (
            <Card style={styles.errorCard}>
              <Typography variant="body" color={colors.coral}>
                {getUserFriendlyErrorMessage(configuration.error)}
              </Typography>
              <Button label="Tentar novamente" variant="outline" onPress={configuration.reload} />
            </Card>
          ) : null}

          {!configuration.loading && !configuration.error && !formOpen && (
            <Button
              label={
                section === 'establishments'
                  ? 'Adicionar unidade'
                  : section === 'services'
                    ? 'Adicionar serviço'
                    : 'Criar grade'
              }
              onPress={startNew}
              style={styles.addButton}
            />
          )}

          {formOpen ? (
            <Card style={styles.formCard}>
              <Typography variant="heading">
                {editingId ? 'Editar ' : 'Novo '}
                {section === 'establishments' ? 'unidade' : section === 'services' ? 'serviço' : 'grade'}
              </Typography>
              {section === 'establishments' ? (
                <>
                  <InputField label="Nome da unidade" value={form.name} onChangeText={(value) => update('name', value)} maxLength={150} />
                  <InputField label="CNPJ" value={form.cnpj} onChangeText={(value) => update('cnpj', value.replace(/\D/g, ''))} keyboardType="number-pad" maxLength={14} />
                  <InputField label="E-mail de contato" value={form.email} onChangeText={(value) => update('email', value)} keyboardType="email-address" autoCapitalize="none" />
                  <InputField label="Logo (chave)" value={form.logoKey} onChangeText={(value) => update('logoKey', value)} placeholder="/logo.png" autoCapitalize="none" />
                  <View style={styles.cepInputWrapper}>
                    <InputField
                      label="CEP"
                      value={form.postalCode}
                      onChangeText={async (text) => {
                        const clean = text.replace(/\D/g, '');
                        update('postalCode', clean);
                        if (clean.length === 8) {
                          setCepStatus('loading');
                          try {
                            const resp = await fetch(`https://viacep.com.br/ws/${clean}/json/`, {
                              redirect: 'manual',
                            });
                            if (resp.redirected || (resp.status >= 300 && resp.status < 400)) {
                              throw new Error('Redirect not allowed');
                            }
                            const data = await resp.json();
                            if (!data.erro) {
                              update('street', data.logradouro ?? '');
                              update('neighborhood', data.bairro ?? '');
                              update('city', data.localidade ?? '');
                              update('state', data.uf ?? '');
                              update('streetType', data.tipo_logradouro ?? 'RUA');
                              setCepStatus('success');
                              setTimeout(() => setCepStatus('idle'), 2000);
                            } else {
                              setCepStatus('error');
                              setTimeout(() => setCepStatus('idle'), 2000);
                            }
                          } catch {
                            setCepStatus('error');
                            setTimeout(() => setCepStatus('idle'), 2000);
                          }
                        } else {
                          update('street', '');
                          update('neighborhood', '');
                          update('city', '');
                          update('state', '');
                          update('streetType', 'RUA');
                          setCepStatus('idle');
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={8}
                    />
                    <View style={styles.cepStatus}>
                      {cepStatus === 'loading' && <ActivityIndicator size="small" color={colors.cobalto} />}
                      {cepStatus === 'success' && (
                        <Typography variant="caption" color={colors.menta}>✓</Typography>
                      )}
                      {cepStatus === 'error' && (
                        <Typography variant="caption" color={colors.coral}>✗</Typography>
                      )}
                    </View>
                  </View>
                  <InputField label="Logradouro" value={form.street} onChangeText={(value) => update('street', value)} maxLength={255} />
                  <View style={styles.row}>
                    <View style={styles.half}><InputField label="Número" value={form.number} onChangeText={(value) => update('number', value)} maxLength={10} /></View>
                    <View style={styles.half}><InputField label="Complemento" value={form.complement} onChangeText={(value) => update('complement', value)} maxLength={60} /></View>
                  </View>
                  <InputField label="Bairro" value={form.neighborhood} onChangeText={(value) => update('neighborhood', value)} maxLength={100} />
                  <View style={styles.row}>
                    <View style={styles.half}><InputField label="UF" value={form.state} onChangeText={(value) => update('state', value.toUpperCase())} autoCapitalize="characters" maxLength={2} /></View>
                    <View style={styles.half}><InputField label="Município" value={form.city} onChangeText={(value) => update('city', value)} maxLength={150} /></View>
                  </View>
                </>
              ) : null}

              {section === 'services' ? (
                <>
                  <InputField label="Nome do serviço" value={form.name} onChangeText={(value) => update('name', value)} maxLength={150} />
                  <InputField label="Preço (opcional)" value={form.price} onChangeText={(value) => update('price', value)} placeholder="Ex.: 49,90" keyboardType="decimal-pad" />
                  <InputField label="Descrição (opcional)" value={form.description} onChangeText={(value) => update('description', value)} maxLength={500} />
                  <Typography variant="label">Unidades que oferecem o serviço</Typography>
                  {establishments.length === 0 ? (
                    <Typography variant="caption" color={colors.muted}>Cadastre uma unidade antes de associar um serviço.</Typography>
                  ) : (
                    <View style={styles.choices}>
                      {establishments.map((item) => (
                        <ChoiceChip
                          key={item.id}
                          label={item.name}
                          selected={form.establishmentIds.includes(item.id)}
                          onPress={() => update(
                            'establishmentIds',
                            form.establishmentIds.includes(item.id)
                              ? form.establishmentIds.filter((id) => id !== item.id)
                              : [...form.establishmentIds, item.id]
                          )}
                        />
                      ))}
                    </View>
                  )}
                </>
              ) : null}

              {section === 'grids' ? (
                <>
                  {establishments.length === 0 ? (
                    <Typography variant="body" color={colors.orange}>
                      Cadastre uma unidade antes de criar uma grade.
                    </Typography>
                  ) : (
                    <>
                      <Typography variant="label">Unidade</Typography>
                      <View style={styles.choices}>
                        {establishments.map((item) => (
                          <ChoiceChip
                            key={item.id}
                            label={item.name}
                            selected={form.establishmentId === item.id}
                            onPress={() => {
                              const nextServices = services.filter((service) =>
                                service.active && service.establishmentIds.includes(item.id)
                              );
                              setForm((current) => ({
                                ...current,
                                establishmentId: item.id,
                                serviceId: nextServices.some((service) => service.id === current.serviceId)
                                  ? current.serviceId
                                  : nextServices[0]?.id ?? '',
                              }));
                            }}
                          />
                        ))}
                      </View>
                      <Typography variant="label">Serviço</Typography>
                      {selectedServices.length === 0 ? (
                        <Typography variant="caption" color={colors.muted}>Associe um serviço à unidade escolhida antes de criar a grade.</Typography>
                      ) : (
                        <View style={styles.choices}>
                          {selectedServices.map((item) => (
                            <ChoiceChip key={item.id} label={item.name} selected={form.serviceId === item.id} onPress={() => update('serviceId', item.id)} />
                          ))}
                        </View>
                      )}
                      <Typography variant="label">Dias de atendimento</Typography>
                      <View style={styles.chips}>
                        {WEEKDAYS.map((day, weekday) => (
                          <ChoiceChip
                            key={day}
                            label={day}
                            selected={form.weekdays.includes(weekday)}
                            onPress={() => update(
                              'weekdays',
                              form.weekdays.includes(weekday)
                                ? form.weekdays.filter((value) => value !== weekday)
                                : [...form.weekdays, weekday].sort((a, b) => a - b)
                            )}
                          />
                        ))}
                      </View>
                      <View style={styles.row}>
                        <View style={styles.half}><InputField label="Início (HH:MM)" value={form.startTime} onChangeText={(value) => update('startTime', value)} placeholder="09:00" maxLength={5} /></View>
                        <View style={styles.half}><InputField label="Fim (HH:MM)" value={form.endTime} onChangeText={(value) => update('endTime', value)} placeholder="18:00" maxLength={5} /></View>
                      </View>
                      <View style={styles.row}>
                        <View style={styles.half}><InputField label="Intervalo (minutos)" value={form.intervalMinutes} onChangeText={(value) => update('intervalMinutes', value.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
                        <View style={styles.half}><InputField label="Capacidade por horário" value={form.capacity} onChangeText={(value) => update('capacity', value.replace(/\D/g, ''))} keyboardType="number-pad" /></View>
                      </View>
                      <InputField label="Disponibilidade gerada (dias)" value={form.periodDays} onChangeText={(value) => update('periodDays', value.replace(/\D/g, ''))} keyboardType="number-pad" />
                      <InputField label="Data de início (AAAA-MM-DD)" value={form.startDate} onChangeText={(value) => update('startDate', value)} placeholder="2026-10-20" maxLength={10} />
                      <InputField label="Data final (opcional, AAAA-MM-DD)" value={form.endDate} onChangeText={(value) => update('endDate', value)} placeholder="Sem limite fixo" maxLength={10} />
                    </>
                  )}
                </>
              ) : null}
              <View style={styles.formActions}>
                <Button label="Cancelar" variant="outline" disabled={saving} onPress={closeForm} style={styles.actionButton} />
                <Button label={editingId ? 'Salvar alterações' : 'Salvar'} loading={saving} onPress={() => void save()} style={styles.actionButton} />
              </View>
            </Card>
          ) : null}

          {!configuration.loading && !configuration.error && !formOpen && (
            <View style={styles.list}>
              {section === 'establishments' && establishments.length === 0 ? <EmptyState message="Nenhuma unidade cadastrada ainda." /> : null}
              {section === 'services' && services.length === 0 ? <EmptyState message="Nenhum serviço cadastrado para suas unidades." /> : null}
              {section === 'grids' && grids.length === 0 ? <EmptyState message="Nenhuma grade de atendimento cadastrada ainda." /> : null}
              {section === 'establishments' && establishments.map((item) => (
                <ResourceCard
                  key={item.id}
                  title={item.name}
                  subtitle={`${item.address.municipio} · ${item.email}`}
                  active={item.active}
                  onEdit={() => startEditEstablishment(item)}
                  onDelete={() => setDeleteTarget({ section, id: item.id, name: item.name })}
                  logoKey={item.logoKey}
                />
              ))}
              {section === 'services' && services.map((item) => (
                <ResourceCard
                  key={item.id}
                  title={item.name}
                  subtitle={`${item.price === null ? 'Preço não informado' : `R$ ${item.price.toFixed(2).replace('.', ',')}`} · ${item.establishmentIds.length} unidade(s)`}
                  active={item.active}
                  onEdit={() => startEditService(item)}
                  onDelete={() => setDeleteTarget({ section, id: item.id, name: item.name })}
                />
              ))}
              {section === 'grids' && grids.map((item) => {
                const establishment = establishments.find((value) => value.id === item.establishmentId);
                const service = services.find((value) => value.id === item.serviceId);
                const days = item.weekdays.map((weekday) => WEEKDAYS[weekday]).join(', ');
                return (
                  <ResourceCard
                    key={item.id}
                    title={service?.name ?? 'Serviço'}
                    subtitle={`${establishment?.name ?? 'Unidade'} · ${days} · ${item.startTime}–${item.endTime}`}
                    detail={`${item.intervalMinutes} min por horário · capacidade ${item.capacity} · ${dateToDisplay(item.startDate)}${item.endDate ? ` a ${dateToDisplay(item.endDate)}` : ''}`}
                    active={item.active}
                    onEdit={() => startEditGrid(item)}
                    onDelete={() => setDeleteTarget({ section, id: item.id, name: service?.name ?? 'grade' })}
                  />
                );
              })}
            </View>
          )}

          {deleteTarget ? (
            <Card style={styles.deleteCard}>
              <Typography variant="title">Excluir {deleteTarget.name}?</Typography>
              <Typography variant="caption" color={colors.muted}>
                {deleteTarget.section === 'establishments'
                  ? 'Isso também removerá associações dessa unidade com serviços. Grades relacionadas podem precisar ser removidas separadamente.'
                  : 'Essa ação não pode ser desfeita.'}
              </Typography>
              <View style={styles.formActions}>
                <Button label="Cancelar" variant="outline" disabled={saving} onPress={() => setDeleteTarget(undefined)} style={styles.actionButton} />
                <Button label="Excluir" variant="accent" loading={saving} onPress={() => void confirmDelete()} style={styles.actionButton} />
              </View>
            </Card>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

export default function LojistaManagementScreen() {
  return (
    <AuthGuard requiredProfile="lojista">
      <LojistaManagementScreenContent />
    </AuthGuard>
  );
}

function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Typography variant="caption" size={13} color={selected ? colors.white : colors.ink}>{label}</Typography>
    </Pressable>
  );
}

function ResourceCard({
  title,
  subtitle,
  detail,
  active,
  onEdit,
  onDelete,
  logoKey,
}: {
  title: string;
  subtitle: string;
  detail?: string;
  active: boolean;
  onEdit: () => void;
  onDelete: () => void;
  logoKey?: string;
}) {
  const safeLogoKey = logoKey && isSafeImageUrl(logoKey) ? logoKey : undefined;
  return (
    <Card style={styles.resource}>
      <View style={styles.resourceHeader}>
        <View style={styles.resourceLogoWrapper}>
          {safeLogoKey ? (
            <Image source={{ uri: safeLogoKey }} style={styles.resourceLogo} resizeMode="contain" />
          ) : (
            <View style={[styles.resourceLogo, styles.resourceLogoPlaceholder]} />
          )}
        </View>
        <View style={styles.resourceText}>
          <Typography variant="title">{title}</Typography>
          <Typography variant="caption" color={colors.muted}>{subtitle}</Typography>
          {detail ? <Typography variant="caption" color={colors.muted}>{detail}</Typography> : null}
        </View>
        <Typography variant="label" size={13} color={active ? colors.menta : colors.muted}>
          {active ? 'Ativo' : 'Inativo'}
        </Typography>
      </View>
      <View style={styles.resourceActions}>
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.textAction}>
          <Typography variant="label" color={colors.cobalto}>Editar</Typography>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onDelete} style={styles.textAction}>
          <Typography variant="label" color={colors.coral}>Excluir</Typography>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.screen, gap: 14 },
  intro: { marginTop: -8 },
  sectionTabs: { flexDirection: 'row', backgroundColor: colors.disabled, padding: 4, borderRadius: radius.md },
  sectionTab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  sectionTabSelected: { backgroundColor: colors.cobalto },
  notice: { padding: 12 },
  errorCard: { gap: 10 },
  addButton: { marginTop: 2 },
  formCard: { gap: 14 },
  field: { gap: 6 },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    color: colors.tinta,
    backgroundColor: colors.white,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, minWidth: 0 },
  cepInputWrapper: { position: 'relative' },
  cepStatus: { position: 'absolute', right: 14, top: '50%', transform: [{ translateY: -10 }] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choices: { gap: 8 },
  chip: { minHeight: 38, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  chipSelected: { borderColor: colors.cobalto, backgroundColor: colors.cobalto },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  actionButton: { flex: 1 },
  list: { gap: 12 },
  resource: { gap: 14 },
  resourceHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  resourceLogoWrapper: { width: 48, height: 48, flexShrink: 0, borderRadius: radius.md, backgroundColor: colors.disabled, alignItems: 'center', justifyContent: 'center' },
  resourceLogo: { width: 48, height: 48, borderRadius: radius.md },
  resourceLogoPlaceholder: { backgroundColor: colors.disabled },
  resourceText: { flex: 1, gap: 4 },
  resourceActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 20 },
  textAction: { padding: 6 },
  deleteCard: { gap: 12, borderWidth: 1, borderColor: colors.coral },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userMenuTrigger: { padding: 2 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.white },
  userAvatarPlaceholder: { backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  userMenuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 },
  userMenuPanelWrapper: { position: 'absolute', zIndex: 201, width: 180 },
  userMenuPanel: { backgroundColor: colors.white, borderRadius: radius.md, padding: 4, shadowColor: colors.tinta, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
  userMenuItem: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: radius.sm, width: '100%' },
  userMenuItemDestructive: { backgroundColor: colors.coral + '10' },
});
