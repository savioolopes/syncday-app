import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../../core/theme';
import { formatShort, fromISO, monthYearLabel } from '../../../core/utils/dates';
import { LogoMark, Wordmark } from '../../components/brand/Logo';
import { Appointment } from '../../../domain/entities/appointment';
import { BlueHeader } from '../../components/ui/BlueHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { FooterBar } from '../../components/ui/FooterBar';
import { Screen } from '../../components/ui/Screen';
import { Typography } from '../../components/ui/Typography';
import { hasBothProfiles } from '../../navigation/profileRoutes';
import { useSession } from '../../providers/SessionProvider';
import { useToast } from '../../providers/ToastProvider';
import { useLojistaAgenda } from './useLojistaAgenda';
import { useApp } from '../../providers/AppProviders';
import { getUserFriendlyErrorMessage } from '../../../core/utils/errors';
import { usePreventAutoFocus } from '../../hooks/usePreventAutoFocus';
import { AuthGuard } from '../../components/auth/AuthGuard';

const ACCENTS = [colors.blue, colors.orange, colors.ink];

interface EnrichedAppointment extends Appointment {
  clientName?: string;
  serviceName?: string;
  establishmentName?: string;
}

function LojistaAppointmentCard({
  item,
  accent,
  onCancel,
  onOpenCancelConfirm
}: { item: EnrichedAppointment; accent: string; onCancel: (id: string) => void; onOpenCancelConfirm?: (id: string) => void }) {
  const status = {
    confirmed: 'Realizado',
    reminder: 'Agendado',
    cancelled: 'Cancelado',
    missed: 'Não compareceu',
  }[item.status];
  const clientDisplay = item.clientName ?? (item.clientId ? `Cliente ${item.clientId.slice(0, 8)}` : '—');
  const serviceDisplay = item.serviceName ?? (item.serviceId ? `Serviço ${item.serviceId.slice(0, 8)}` : '—');
  const establishmentDisplay = item.establishmentName ?? (item.establishmentId ? `Unidade ${item.establishmentId.slice(0, 8)}` : '—');
  const canCancel = item.status === 'reminder' || item.status === 'confirmed';

  return (
    <Card accent={accent} style={styles.appointment}>
      <Typography variant="monoBold" style={styles.time}>{item.time}</Typography>
      <View style={styles.details}>
        <Typography variant="title">{clientDisplay}</Typography>
        <Typography variant="body" color={colors.muted}>
          {serviceDisplay} · {establishmentDisplay}
        </Typography>
        <Typography variant="label" color={item.status === 'confirmed' ? colors.green : colors.orange}>
          {status}
        </Typography>
      </View>
      {canCancel && (
        <Pressable
          style={styles.cancelButton}
          onPress={() => onOpenCancelConfirm?.(item.id)}
          hitSlop={{ left: 10, right: 10, top: 10, bottom: 10 }}
        >
          <Typography variant="label" color={colors.orange}>Cancelar</Typography>
        </Pressable>
      )}
    </Card>
  );
}

function LojistaAgendaScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const agenda = useLojistaAgenda();
  const { session, clearProfileSelection, signOut } = useSession();
  const { usecases } = useApp();
  const toast = useToast();

  usePreventAutoFocus();

  const [cancelAppointmentId, setCancelAppointmentId] = useState<string | null>(null);

  const handleCancel = useCallback(async (appointmentId: string) => {
    try {
      await usecases.cancelAppointment.execute(appointmentId);
      toast.show('Agendamento cancelado com sucesso.');
      agenda.reload();
    } catch (error) {
      toast.show(getUserFriendlyErrorMessage(error));
    }
  }, [usecases, toast, agenda]);

  const openCancelConfirm = (appointmentId: string) => {
    setCancelAppointmentId(appointmentId);
  };

  const closeCancelConfirm = () => {
    setCancelAppointmentId(null);
  };

  const confirmCancel = () => {
    if (cancelAppointmentId) {
      handleCancel(cancelAppointmentId);
    }
    closeCancelConfirm();
  };

  const switchProfile = async () => {
    try {
      await clearProfileSelection();
      router.replace('/selecionar-perfil');
    } catch (error) {
      toast.show(getUserFriendlyErrorMessage(error));
    }
  };

  const openProfile = () => {
    closeMenu();
    router.push('/perfil-lojista' as any);
  };

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const userMenuRef = useRef<View>(null);

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

  return (
      <Screen background={colors.bg}>
        {showUserMenu && menuPosition && (
          <>
            <Pressable style={styles.userMenuBackdrop} onPress={closeMenu} />
            <Pressable
              style={[styles.userMenuPanelWrapper, { left: menuPosition.x, top: menuPosition.y }]}
              onPress={() => {}}
            >
              <View style={styles.userMenuPanel}>
                <Pressable
                  style={styles.userMenuItem}
                  onPress={() => { closeMenu(); void openProfile(); }}
                  accessibilityRole="menuitem"
                  hitSlop={{ left: 20, right: 20, top: 10, bottom: 10 }}
                >
                  <Typography variant="label" color={colors.ink}>Meu perfil</Typography>
                </Pressable>
                {session && hasBothProfiles(session.profiles) ? (
                  <Pressable
                    style={styles.userMenuItem}
                    onPress={() => { closeMenu(); void switchProfile(); }}
                    accessibilityRole="menuitem"
                    hitSlop={{ left: 20, right: 20, top: 10, bottom: 10 }}
                  >
                    <Typography variant="label" color={colors.ink}>Trocar perfil</Typography>
                  </Pressable>
                ) : null}
                <Pressable
                  style={[styles.userMenuItem, styles.userMenuItemDestructive]}
                  onPress={() => { closeMenu(); void signOut().catch((error) => toast.show(getUserFriendlyErrorMessage(error))); }}
                  accessibilityRole="menuitem"
                  hitSlop={{ left: 20, right: 20, top: 10, bottom: 10 }}
                >
                  <Typography variant="label" color={colors.orange}>Sair</Typography>
                </Pressable>
              </View>
            </Pressable>
          </>
        )}
        <BlueHeader>
          <View style={styles.topRow}>
            <View style={styles.spacer} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Wordmark color={colors.white} size={30} />
            </View>
            <View style={styles.actions}>
              <Pressable
                ref={userMenuRef}
                style={styles.userMenuTrigger}
                onPress={openMenu}
                accessibilityRole="button"
                accessibilityLabel="Menu do usuário"
                hitSlop={10}
              >
                {agenda.lojistaLogo ? (
                  <Image
                    source={{ uri: agenda.lojistaLogo }}
                    style={styles.userAvatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                    <LogoMark size={20} main={colors.white} />
                  </View>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.greetingRow}>
            <Typography variant="display" size={28} color={colors.white} style={styles.greeting}>
              Olá, {agenda.userName}.
            </Typography>
          </View>
          <Typography variant="body" color={colors.whiteMuted} style={styles.weekLabel}>
            {monthYearLabel(agenda.days[0] ?? fromISO(agenda.selectedDate))}
          </Typography>

          <ScrollView
            horizontal
            style={styles.calendar}
            contentContainerStyle={styles.calendarContent}
            showsHorizontalScrollIndicator={false}
          >
            {agenda.days.map((day) => {
              const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
              const label = formatShort(day);
              const selected = date === agenda.selectedDate;
              return (
                <Pressable
                  key={date}
                  accessibilityRole="button"
                  accessibilityLabel={label}
                  accessibilityState={{ selected }}
                  onPress={() => agenda.selectDate(date)}
                  style={[styles.day, selected && styles.daySelected]}
                >
                  <Typography variant="label" size={13} color={selected ? colors.blue : colors.white}>
                    {label}
                  </Typography>
                </Pressable>
              );
            })}
          </ScrollView>
        </BlueHeader>

        {agenda.loading ? (
          <LoadingState />
        ) : (
          <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: 150 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {agenda.error ? <Typography variant="body" color={colors.orange}>{agenda.error}</Typography> : null}
            {agenda.appointments.length === 0 && <EmptyState message="Nenhum agendamento para hoje." />}
            {agenda.appointments.map((item, index) => (
              <LojistaAppointmentCard
                key={item.id}
                item={item}
                accent={ACCENTS[index % ACCENTS.length]}
                onCancel={handleCancel}
                onOpenCancelConfirm={openCancelConfirm}
              />
            ))}
          </ScrollView>
        )}

        <FooterBar>
          <Button
            label="Configurar atendimento"
            onPress={() => router.push('/gestao-lojista')}
          />
          <Button
            label="Atualizar agenda"
            variant="outline"
            onPress={() => {
              if (!agenda.profileId) {
                toast.show('Não foi possível identificar o perfil Lojista.');
                return;
              }
              agenda.reload();
            }}
          />
        </FooterBar>

        <ConfirmationModal
          visible={!!cancelAppointmentId}
          title="Cancelar agendamento"
          message="Tem certeza que deseja cancelar este agendamento? Esta ação é irreversível."
          confirmText="Sim, cancelar"
          cancelText="Não"
          onConfirm={confirmCancel}
          onCancel={closeCancelConfirm}
          destructive
        />
      </Screen>
  );
}

export default function LojistaAgendaScreen() {
  return (
    <AuthGuard requiredProfile="lojista">
      <LojistaAgendaScreenContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  spacer: { width: 36 },
  greetingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  greeting: { marginTop: 0, lineHeight: 34, flex: 1 },
  lojistaLogo: { width: 48, height: 48, borderRadius: radius.md },
  logoPlaceholder: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  weekLabel: { marginTop: 4 },
  calendar: {
    marginTop: 12,
    backgroundColor: colors.glass,
    borderRadius: radius.md,
    padding: 5,
  },
  calendarContent: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  noDates: { paddingHorizontal: 8, paddingVertical: 8 },
  day: { alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: radius.sm },
  daySelected: { backgroundColor: colors.white },
  list: { paddingHorizontal: spacing.screen, paddingTop: 16, gap: 12 },
  appointment: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingRight: 16 },
  time: { width: 56, paddingTop: 2 },
  details: { flex: 1, gap: 3 },
  cancelButton: { paddingVertical: 6, paddingHorizontal: 12, marginLeft: 8, borderRadius: radius.sm, backgroundColor: colors.orange + '15', userSelect: 'none' },
  userMenuTrigger: { padding: 2 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.white },
  userAvatarPlaceholder: { backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  userMenuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  userMenuPanelWrapper: { position: 'absolute', zIndex: 51, width: 180 },
  userMenuPanel: { backgroundColor: colors.white, borderRadius: radius.md, padding: 4, shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
  userMenuItem: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: radius.sm, width: '100%' },
  userMenuItemDestructive: { backgroundColor: colors.orange + '10' },
});
