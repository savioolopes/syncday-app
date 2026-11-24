import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../../core/theme';
import { Wordmark } from '../../components/brand/Logo';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { SmartBackButton } from '../../components/ui/SmartBackButton';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { Typography } from '../../components/ui/Typography';
import { useSession } from '../../providers/SessionProvider';
import { useToast } from '../../providers/ToastProvider';
import { useApp } from '../../providers/AppProviders';
import { getUserFriendlyErrorMessage } from '../../../core/utils/errors';
import { AuthGuard } from '../../components/auth/AuthGuard';

interface LojistaProfileData {
  idLojista: string;
  nome: string;
  logoKey: string;
  cnpj: string;
  email: string;
  endereco?: {
    tipoLogradouro: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cep: string;
    municipio: string;
    unidadeFederativa: string;
  };
  ativo: boolean;
}

interface FormData {
  nome: string;
  logoKey: string;
  cnpj: string;
  email: string;
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
  municipio: string;
  unidadeFederativa: string;
}

const INITIAL_FORM: FormData = {
  nome: '',
  logoKey: '',
  cnpj: '',
  email: '',
  tipoLogradouro: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cep: '',
  municipio: '',
  unidadeFederativa: '',
};

function LojistaProfileScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useSession();
  const { usecases } = useApp();
  const toast = useToast();

  const [profile, setProfile] = useState<LojistaProfileData | null>(null);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  // Load profile data
  useEffect(() => {
    if (!session || session.activeProfile !== 'lojista') return;
    const lojistaProfile = session.profiles.find((p) => p.kind === 'lojista');
    if (!lojistaProfile) return;

    const loadProfile = async () => {
      try {
        const lojistaData = await usecases.authentication.getLojistaById(lojistaProfile.id, session.token);
        if (lojistaData) {
          // Map idLojista (backend) to idLojista (frontend)
          setProfile({ ...lojistaData, idLojista: lojistaData.idLojista });
          setForm({
            nome: lojistaData.nome,
            logoKey: lojistaData.logoKey,
            cnpj: lojistaData.cnpj,
            email: lojistaData.email,
            tipoLogradouro: lojistaData.endereco?.tipoLogradouro || '',
            logradouro: lojistaData.endereco?.logradouro || '',
            numero: lojistaData.endereco?.numero || '',
            complemento: lojistaData.endereco?.complemento || '',
            bairro: lojistaData.endereco?.bairro || '',
            cep: lojistaData.endereco?.cep || '',
            municipio: lojistaData.endereco?.municipio || '',
            unidadeFederativa: lojistaData.endereco?.unidadeFederativa || '',
          });
        }
      } catch (error) {
        toast.show(getUserFriendlyErrorMessage(error));
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [session, usecases, toast]);

  // Fetch address from CEP
  const handleCepBlur = async () => {
    const cep = form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        redirect: 'manual',
      });
      if (response.redirected || (response.status >= 300 && response.status < 400)) {
        throw new Error('Redirect not allowed');
      }
      const data = await response.json();
      if (!data.erro) {
        setForm((prev) => ({
          ...prev,
          tipoLogradouro: '',
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          municipio: data.localidade || '',
          unidadeFederativa: data.uf || '',
        }));
      }
    } catch {
      // Ignore CEP errors
    } finally {
      setCepLoading(false);
    }
  };

  const handleSave = async () => {
    if (!session || !profile) return;

    setSaving(true);
    try {
      // Prepare update data - exclude email and cnpj (immutable)
      const updateData = {
        nome: form.nome,
        logoKey: form.logoKey,
        endereco: {
          tipoLogradouro: form.tipoLogradouro,
          logradouro: form.logradouro,
          numero: form.numero,
          complemento: form.complemento || undefined,
          bairro: form.bairro,
          cep: form.cep.replace(/\D/g, ''),
          municipio: form.municipio,
          unidadeFederativa: form.unidadeFederativa,
        },
      };

      await usecases.updateLojistaProfile.execute(profile.idLojista, session.token, updateData);
      toast.show('Perfil atualizado com sucesso!');
      router.back();
    } catch (error) {
      toast.show(getUserFriendlyErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Screen background={colors.bg}>
        <ScreenHeader
          title="Meu Perfil"
          left={<SmartBackButton compact fallbackHref="/agenda-lojista" />}
        />
      </Screen>
    );
  }

  const isFormValid = form.nome.trim() && form.logoKey.trim() && form.logradouro.trim() && form.numero.trim() && form.bairro.trim() && form.cep.trim() && form.municipio.trim() && form.unidadeFederativa.trim();

  return (
    <Screen background={colors.bg}>
      <ScreenHeader
        title="Meu Perfil"
        left={<SmartBackButton compact fallbackHref="/agenda-lojista" />}
      />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Typography variant="label" color={colors.tinta} style={styles.sectionTitle}>
            Dados do Lojista
          </Typography>

          <View style={styles.field}>
            <Typography variant="label" color={colors.tinta}>Nome empresarial</Typography>
            <TextInput
              style={styles.input}
              value={form.nome}
              onChangeText={(nome) => setForm((prev) => ({ ...prev, nome }))}
              placeholder="Nome da empresa"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Typography variant="label" color={colors.tinta}>Chave do logotipo</Typography>
            <TextInput
              style={styles.input}
              value={form.logoKey}
              onChangeText={(logoKey) => setForm((prev) => ({ ...prev, logoKey }))}
              placeholder="/logo.png"
              autoCapitalize="none"
            />
            <Typography variant="caption" color={colors.muted} style={styles.helperText}>
              Caminho do logotipo no storage (ex: /logo.png)
            </Typography>
          </View>

          <View style={styles.field}>
            <Typography variant="label" color={colors.tinta}>CNPJ</Typography>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={form.cnpj}
              editable={false}
              placeholder="CNPJ não pode ser alterado"
            />
            <Typography variant="caption" color={colors.muted} style={styles.helperText}>
              O CNPJ não pode ser alterado
            </Typography>
          </View>

          <View style={styles.field}>
            <Typography variant="label" color={colors.tinta}>Email</Typography>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={form.email}
              editable={false}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Email não pode ser alterado"
            />
            <Typography variant="caption" color={colors.muted} style={styles.helperText}>
              O email é usado para login e não pode ser alterado
            </Typography>
          </View>
        </View>

        <View style={styles.section}>
          <Typography variant="label" color={colors.tinta} style={styles.sectionTitle}>
            Endereço
          </Typography>

          <View style={styles.field}>
            <Typography variant="label" color={colors.tinta}>CEP</Typography>
            <TextInput
              style={styles.input}
              value={form.cep}
              onChangeText={(cep) => setForm((prev) => ({ ...prev, cep }))}
              placeholder="00000-000"
              keyboardType="numeric"
              maxLength={9}
              onBlur={handleCepBlur}
            />
            {cepLoading && <Typography variant="caption" color={colors.cobalto}>Buscando endereço...</Typography>}
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Typography variant="label" color={colors.tinta}>Tipo de logradouro</Typography>
              <TextInput
                style={styles.input}
                value={form.tipoLogradouro}
                onChangeText={(tipoLogradouro) => setForm((prev) => ({ ...prev, tipoLogradouro }))}
                placeholder="Rua, Avenida, etc."
              />
            </View>
            <View style={{ flex: 2 }}>
              <Typography variant="label" color={colors.tinta}>Logradouro</Typography>
              <TextInput
                style={styles.input}
                value={form.logradouro}
                onChangeText={(logradouro) => setForm((prev) => ({ ...prev, logradouro }))}
                placeholder="Nome da rua/avenida"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Typography variant="label" color={colors.tinta}>Número</Typography>
              <TextInput
                style={styles.input}
                value={form.numero}
                onChangeText={(numero) => setForm((prev) => ({ ...prev, numero }))}
                placeholder="Nº"
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 2 }}>
              <Typography variant="label" color={colors.tinta}>Complemento</Typography>
              <TextInput
                style={styles.input}
                value={form.complemento}
                onChangeText={(complemento) => setForm((prev) => ({ ...prev, complemento }))}
                placeholder="Sala, andar, etc. (opcional)"
              />
            </View>
          </View>

          <View style={styles.field}>
            <Typography variant="label" color={colors.tinta}>Bairro</Typography>
            <TextInput
              style={styles.input}
              value={form.bairro}
              onChangeText={(bairro) => setForm((prev) => ({ ...prev, bairro }))}
              placeholder="Bairro"
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 2, marginRight: 8 }}>
              <Typography variant="label" color={colors.tinta}>Cidade</Typography>
              <TextInput
                style={styles.input}
                value={form.municipio}
                onChangeText={(municipio) => setForm((prev) => ({ ...prev, municipio }))}
                placeholder="Cidade"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Typography variant="label" color={colors.tinta}>UF</Typography>
              <TextInput
                style={styles.input}
                value={form.unidadeFederativa}
                onChangeText={(unidadeFederativa) => setForm((prev) => ({ ...prev, unidadeFederativa }))}
                placeholder="UF"
                maxLength={2}
              />
            </View>
          </View>
        </View>

        <View style={styles.saveButtonContainer}>
          <Button
            label={saving ? 'Salvando...' : 'Salvar alterações'}
            variant="accent"
            onPress={handleSave}
            disabled={saving || !isFormValid}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

export default function LojistaProfileScreen() {
  return (
    <AuthGuard requiredProfile="lojista">
      <LojistaProfileScreenContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { marginTop: 16, lineHeight: 34, textAlign: 'center' },
  content: { paddingHorizontal: spacing.screen, paddingTop: 24, gap: 24 },
  section: { gap: 16 },
  sectionTitle: { marginBottom: 8 },
  field: { gap: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  input: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  inputDisabled: {
    backgroundColor: colors.nevoa,
    color: colors.muted,
  },
  helperText: { marginTop: 4 },
  saveButtonContainer: { marginTop: 8 },
});