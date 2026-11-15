import React, { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../../core/theme';
import { Wordmark } from '../../components/brand/Logo';
import { BlueHeader } from '../../components/ui/BlueHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { FooterBar } from '../../components/ui/FooterBar';
import { Screen } from '../../components/ui/Screen';
import { Typography } from '../../components/ui/Typography';
import { AppointmentCard } from './AppointmentCard';
import { useWeekAgenda } from './useWeekAgenda';
import { WeekStrip } from './WeekStrip';
import { useSession } from '../../providers/SessionProvider';
import { useToast } from '../../providers/ToastProvider';
import { hasBothProfiles } from '../../navigation/profileRoutes';
import { useApp } from '../../providers/AppProviders';
import { getUserFriendlyErrorMessage } from '../../../core/utils/errors';
import { usePreventAutoFocus } from '../../hooks/usePreventAutoFocus';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';

const ACCENTS = [colors.blue, colors.orange, colors.ink];

function AppointmentsScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const agenda = useWeekAgenda();
  const { session, clearProfileSelection, signOut } = useSession();
  const { usecases } = useApp();
  const toast = useToast();

  usePreventAutoFocus();

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
    router.push('/perfil-cliente' as any);
  };

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

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<View>(null);

  const userInitial = agenda.userName?.charAt(0).toUpperCase() ?? 'U';
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

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
              >
                <Typography variant="label" color={colors.ink}>Meu perfil</Typography>
              </Pressable>
              {session && hasBothProfiles(session.profiles) ? (
                <Pressable
                  style={styles.userMenuItem}
                  onPress={() => { closeMenu(); void switchProfile(); }}
                  accessibilityRole="menuitem"
                >
                  <Typography variant="label" color={colors.ink}>Trocar perfil</Typography>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.userMenuItem, styles.userMenuItemDestructive]}
                onPress={() => { closeMenu(); void signOut().catch((error) => toast.show(getUserFriendlyErrorMessage(error))); }}
                accessibilityRole="menuitem"
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
              <View style={[styles.userAvatar, styles.userAvatarPlaceholder]}>
                <Typography variant="label" color={colors.white} size={16}>{userInitial}</Typography>
              </View>
            </Pressable>
          </View>
        </View>

        <Typography variant="display" size={28} color={colors.white} style={styles.greeting}>
          Oi, {agenda.userName || 'Usuário'}.
        </Typography>
        <Typography variant="body" color={colors.whiteMuted} style={styles.summary}>
          {agenda.summaryText}
        </Typography>

        <WeekStrip days={agenda.days} selectedISO={agenda.selected} onSelect={agenda.select} />
      </BlueHeader>

      {agenda.loading ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={[styles.list, { paddingBottom: 110 + insets.bottom }]} showsVerticalScrollIndicator={false}>
          {agenda.error ? <Typography variant="body" color={colors.orange}>{agenda.error}</Typography> : null}
          {agenda.appointments.length === 0 && <EmptyState message="Nada marcado para hoje." />}
          {agenda.appointments.map((item, i) => (
            <AppointmentCard
              key={item.id}
              item={item}
              accent={ACCENTS[i % ACCENTS.length]}
              onCancel={handleCancel}
              onOpenCancelConfirm={openCancelConfirm}
            />
          ))}
        </ScrollView>
      )}

      <FooterBar>
        <Button label="+ Marcar novo horário" variant="accent" onPress={() => router.push('/novo-agendamento')} />
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

export default function AppointmentsScreen() {
  return (
    <AuthGuard requiredProfile="cliente">
      <AppointmentsScreenContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12, position: 'relative' },
  list: { paddingHorizontal: spacing.screen, paddingTop: 16, gap: 12 },
  greeting: { marginTop: 16, lineHeight: 34 },
  summary: { marginTop: 4 },
  userMenuTrigger: { padding: 2 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.white },
  userAvatarPlaceholder: { backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  userMenuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  userMenuPanelWrapper: { position: 'absolute', zIndex: 51, width: 180 },
  userMenuPanel: { backgroundColor: colors.white, borderRadius: radius.md, padding: 4, shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
  userMenuItem: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: radius.sm, width: '100%' },
  userMenuItemDestructive: { backgroundColor: colors.orange + '10' },
  spacer: { width: 36 },
});
