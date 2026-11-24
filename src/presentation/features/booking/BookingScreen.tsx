import React, { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, layout, radius, spacing } from '../../../core/theme';
import { Wordmark } from '../../components/brand/Logo';
import { SmartBackButton } from '../../components/ui/SmartBackButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, LoadingState } from '../../components/ui/States';
import { FooterBar } from '../../components/ui/FooterBar';
import { Screen } from '../../components/ui/Screen';
import { Typography } from '../../components/ui/Typography';
import { BookingSummary } from './BookingSummary';
import { DateSelector } from './DateSelector';
import { ReminderNote } from './ReminderNote';
import { ServiceSummaryCard } from './ServiceSummaryCard';
import { TimeSlotGrid } from './TimeSlotGrid';
import { useBooking } from './useBooking';
import { useSession } from '../../providers/SessionProvider';
import { hasBothProfiles } from '../../navigation/profileRoutes';
import { AuthGuard } from '../../components/auth/AuthGuard';
import { isSafeImageUrl } from '../../../core/utils/imageValidation';

function BookingScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { serviceId } = useLocalSearchParams<{ serviceId?: string }>();
  const booking = useBooking(serviceId);
  const { session, clearProfileSelection, signOut } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const userMenuRef = useRef<View>(null);
  const userName = session?.profiles.find((p) => p.kind === 'cliente')?.name ?? '';
  const userInitial = userName.charAt(0).toUpperCase() ?? 'U';

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
        title="Marcar novo horário"
        left={<SmartBackButton compact fallbackHref="/agendamentos" />}
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

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 200 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {booking.serviceLoading && booking.serviceId ? (
          <LoadingState />
        ) : !booking.service ? (
          <View>
            <Typography variant="heading">Escolha um serviço</Typography>
            {booking.loadingServices ? <LoadingState /> : null}
            {booking.servicesError ? <Typography variant="body" color={colors.coral}>{booking.servicesError}</Typography> : null}
            {!booking.loadingServices && booking.services.length === 0
              ? <EmptyState message="Nenhuma grade ativa foi encontrada." />
              : null}
            <View style={styles.serviceList}>
              {booking.services.map((item) => (
                <Pressable key={item.id} onPress={() => booking.selectService(item.id)}>
                  <Card style={styles.serviceOption}>
                    <View style={styles.serviceOptionContent}>
                      {item.logoKey && isSafeImageUrl(item.logoKey) ? (
                        <Image
                          source={{ uri: item.logoKey }}
                          style={styles.serviceLogo}
                          resizeMode="contain"
                        />
                      ) : null}
                      <View style={styles.serviceOptionText}>
                        <Typography variant="title">{item.enrichedName ?? item.name}</Typography>
                        <Typography variant="body" color={colors.muted} style={styles.optionDetail}>
                          {item.enrichedPlace ?? item.place}
                        </Typography>
                      </View>
                    </View>
                  </Card>
                </Pressable>
              ))}
            </View>
          </View>
        ) : (
          <>
            <ServiceSummaryCard service={booking.service} />

            <Typography variant="heading" style={styles.section}>
              Escolha a data
            </Typography>
            <DateSelector
              monthLabel={booking.monthLabel}
              days={booking.days}
              selectedISO={booking.date}
              isClosed={booking.isClosed}
              canGoBack={booking.canGoBack}
              onPrev={booking.goPrev}
              onNext={booking.goNext}
              onSelect={booking.selectDate}
            />

            <View style={styles.sectionRow}>
              <Typography variant="heading" style={styles.section}>
                Escolha o horário
              </Typography>
              <Typography variant="caption" color={colors.muted}>
                {booking.availableCount} disponíveis
              </Typography>
            </View>
            {booking.loadingSlots ? <LoadingState /> : null}
            {booking.slotsError ? (
              <View style={styles.slotError}>
                <Typography variant="body" color={colors.coral}>{booking.slotsError}</Typography>
                <Button label="Tentar novamente" variant="outline" onPress={booking.reloadSlots} />
              </View>
            ) : null}
            {!booking.loadingSlots && !booking.slotsError && booking.slots.length === 0
              ? <EmptyState message="Nenhum horário disponível nesta data." />
              : null}
            {!booking.loadingSlots && !booking.slotsError && booking.slots.length > 0
              ? <TimeSlotGrid slots={booking.slots} selected={booking.time} onSelect={booking.selectTime} />
              : null}

            <ReminderNote />
          </>
        )}
      </ScrollView>

      {booking.service ? (
        <FooterBar solid>
          <BookingSummary value={booking.summaryText} price={booking.service.price} />
          <Button
            label="Confirmar agendamento"
            variant="accent"
            disabled={!booking.canSubmit}
            loading={booking.submitting}
            onPress={() => booking.submit(() => router.replace('/agendamentos'))}
          />
        </FooterBar>
      ) : null}
    </Screen>
  );
}

export default function BookingScreen() {
  return (
    <AuthGuard requiredProfile="cliente">
      <BookingScreenContent />
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { paddingHorizontal: spacing.screen, paddingTop: 20, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  section: { marginTop: 26 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  serviceList: { gap: 12, marginTop: 16 },
  serviceOption: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12 },
  serviceOptionContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  serviceLogo: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.disabled },
  serviceOptionText: { flex: 1, gap: 2 },
  optionDetail: { marginTop: 3, marginBottom: 6 },
  slotError: { gap: 10, marginTop: 16 },
  catalogNote: { marginTop: 12 },
  userMenuTrigger: { padding: 2 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.white },
  userAvatarPlaceholder: { backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  userMenuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 },
  userMenuPanelWrapper: { position: 'absolute', zIndex: 201, width: 180 },
  userMenuPanel: { backgroundColor: colors.white, borderRadius: radius.md, padding: 4, shadowColor: colors.tinta, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
  userMenuItem: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: radius.sm, width: '100%' },
  userMenuItemDestructive: { backgroundColor: colors.coral + '10' },
});
