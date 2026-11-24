import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '../../../core/theme';
import { LogoMark } from '../../components/brand/Logo';
import { Appointment } from '../../../domain/entities/appointment';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { EmptyState, LoadingState, SkeletonList, SkeletonWeekStrip } from '../../components/ui/States';
import { StatusLabel } from '../../components/ui/StatusLabel';
import { WeekStrip } from './WeekStrip';
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
import { Ionicons } from '@expo/vector-icons';

const ACCENTS = [colors.cobalto, colors.coral, colors.tinta];

function formatCountdown(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/** Calcula segundos até o próximo marco :00 ou :30 */
function getSecondsToNextMark(): number {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();

  // Próximo marco: se minutes < 30 -> :30, senão -> próxima hora :00
  let targetMinutes: number;
  let targetHours = now.getHours();

  if (minutes < 30) {
    targetMinutes = 30;
  } else {
    targetMinutes = 0;
    targetHours = (targetHours + 1) % 24;
  }

  const target = new Date(now);
  target.setHours(targetHours, targetMinutes, 0, 0);

  // Se o alvo for no passado (edge case), adiciona 30 min
  if (target <= now) {
    target.setMinutes(target.getMinutes() + 30);
  }

  return Math.ceil((target.getTime() - now.getTime()) / 1000);
}

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

  const statusTone = {
    confirmed: 'success',
    reminder: 'pending',
    cancelled: 'cancelled',
    missed: 'missed',
  }[item.status] as 'success' | 'pending' | 'cancelled' | 'missed';

  return (
    <Card accent={accent} style={styles.appointment}>
      <Typography variant="monoBold" style={styles.time}>{item.time}</Typography>
      <View style={styles.details}>
        <Typography variant="title">{clientDisplay}</Typography>
        <Typography variant="body" color={colors.muted}>
          {serviceDisplay} · {establishmentDisplay}
        </Typography>
        <StatusLabel tone={statusTone} label={status} />
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

  // Auto-refresh at fixed :00 and :30 marks with dynamic countdown
  const [refreshCountdown, setRefreshCountdown] = useState(getSecondsToNextMark());
  const prevCountdownRef = useRef(getSecondsToNextMark());
  const reloadTriggeredRef = useRef(false);

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) return getSecondsToNextMark();
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Trigger auto-refresh when countdown reaches 0 (at the mark)
  useEffect(() => {
    if (refreshCountdown <= 0 && !reloadTriggeredRef.current) {
      reloadTriggeredRef.current = true;
      agenda.reload();
      // Reset flag after a moment to allow next cycle
      setTimeout(() => {
        reloadTriggeredRef.current = false;
      }, 2000);
    }
  }, [refreshCountdown, agenda]);

  // Sync ref when countdown resets (after auto-refresh or manual)
  useEffect(() => {
    prevCountdownRef.current = refreshCountdown;
  }, [refreshCountdown]);

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
                  <Typography variant="label" color={colors.tinta}>Meu perfil</Typography>
                </Pressable>
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
                  onPress={() => { closeMenu(); void signOut().catch((error) => toast.show(getUserFriendlyErrorMessage(error))); }}
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
          title="Minha agenda"
          right={
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
                  <LogoMark size={20} />
                </View>
              )}
            </Pressable>
          }
        />

        <ScrollView
            contentContainerStyle={[styles.list, { paddingBottom: 150 + insets.bottom }]}
            showsVerticalScrollIndicator={false}
          >
            {agenda.loading ? (
              <SkeletonWeekStrip count={agenda.days.length || 5} />
            ) : agenda.days.length > 0 && (
              <WeekStrip days={agenda.days} selectedISO={agenda.selectedDate} onSelect={agenda.selectDate} />
            )}
            {agenda.loading ? (
              <SkeletonList count={3} />
            ) : (
              <>
                {agenda.error ? <Typography variant="body" color={colors.coral}>{agenda.error}</Typography> : null}
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
              </>
            )}
          </ScrollView>
        )}

        <FooterBar solid>
          <View style={styles.footerContent}>
            {/* Row 1: Countdown + Refresh icon */}
            <View style={styles.refreshRow}>
              <Typography variant="caption" color={colors.muted} style={styles.countdownText}>
                {formatCountdown(refreshCountdown)}
              </Typography>
              <Pressable
                onPress={() => {
                  if (!agenda.profileId) {
                    toast.show('Não foi possível identificar o perfil Lojista.');
                    return;
                  }
                  agenda.reload();
                  setRefreshCountdown(getSecondsToNextMark());
                }}
                accessibilityRole="button"
                accessibilityLabel="Atualizar agora"
                hitSlop={12}
                style={styles.refreshIcon}
              >
                <Ionicons name="refresh" size={22} color={colors.cobalto} />
              </Pressable>
            </View>
            {/* Row 2: Configurar atendimento button full width */}
            <Button
              label="Configurar atendimento"
              variant="outline"
              size="sm"
              onPress={() => router.push('/gestao-lojista')}
              style={styles.configButton}
            />
          </View>
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
  lojistaLogo: { width: 48, height: 48, borderRadius: radius.md },
  logoPlaceholder: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: spacing.screen, paddingTop: 8, gap: 8 },
  appointment: { flexDirection: 'row', alignItems: 'flex-start', gap: 14, paddingRight: 16 },
  time: { width: 56, paddingTop: 2 },
  details: { flex: 1, gap: 3 },
  cancelButton: { paddingVertical: 6, paddingHorizontal: 12, marginLeft: 8, borderRadius: radius.sm, backgroundColor: colors.coral + '15', userSelect: 'none' },
  userMenuTrigger: { padding: 2 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.white },
  userAvatarPlaceholder: { backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  userMenuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 },
  userMenuPanelWrapper: { position: 'absolute', zIndex: 201, width: 180 },
  userMenuPanel: { backgroundColor: colors.white, borderRadius: radius.md, padding: 4, shadowColor: colors.tinta, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
  userMenuItem: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: radius.sm, width: '100%' },
  userMenuItemDestructive: { backgroundColor: colors.coral + '10' },
  footerContent: { flexDirection: 'column', gap: 8 },
  refreshRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  countdownText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 18 },
  refreshIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cobalto + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configButton: { width: '100%' },
});
