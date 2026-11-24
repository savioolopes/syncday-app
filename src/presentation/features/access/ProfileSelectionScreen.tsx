import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../../core/theme';
import { AccountProfile } from '../../../domain/repositories';
import { Wordmark } from '../../components/brand/Logo';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import { Typography } from '../../components/ui/Typography';
import { getProfileRoute } from '../../navigation/profileRoutes';
import { useSession } from '../../providers/SessionProvider';
import { useToast } from '../../providers/ToastProvider';
import { getUserFriendlyErrorMessage } from '../../../core/utils/errors';
import { AuthGuard } from '../../components/auth/AuthGuard';

export default function ProfileSelectionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { ready, session, selectProfile, signOut } = useSession();
  const [selecting, setSelecting] = useState(false);

  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<View>(null);
  const [menuPosition, setMenuPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace('/');
    else if (session.profiles.length < 2 || session.activeProfile) router.replace(getProfileRoute(session));
  }, [ready, session, router]);

  const choose = async (profile: AccountProfile) => {
    setSelecting(true);
    try {
      await selectProfile(profile.kind);
      router.replace(profile.kind === 'cliente' ? '/agendamentos' : '/agenda-lojista');
    } catch (error) {
      toast.show(getUserFriendlyErrorMessage(error));
    } finally {
      setSelecting(false);
    }
  };

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

  const handleSignOut = async () => {
    closeMenu();
    try {
      await signOut();
      router.replace('/');
    } catch (error) {
      toast.show((error as Error).message || 'Não foi possível sair.');
    }
  };

  if (!session || session.profiles.length < 2) return null;

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
                style={[styles.userMenuItem, styles.userMenuItemDestructive]}
                onPress={handleSignOut}
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
        title="Selecione a conta"
        right={
          <Pressable
            ref={userMenuRef}
            style={styles.userMenuTrigger}
            onPress={openMenu}
            accessibilityRole="button"
            accessibilityLabel="Menu do usuário"
            hitSlop={10}
          >
            <View style={styles.userAvatar}>
              <Typography variant="label" color={colors.white} size={16}>
                {session.profiles[0]?.name?.charAt(0).toUpperCase() ?? 'U'}
              </Typography>
            </View>
          </Pressable>
        }
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {session.profiles.map((profile) => {
          const isCliente = profile.kind === 'cliente';
          const accentColor = isCliente ? colors.cobalto : colors.coral;
          const bgColor = isCliente ? colors.blueSoft : colors.coralSoft;
          const buttonVariant = isCliente ? 'primary' : 'accent' as const;
          return (
            <Card key={profile.kind} accent={accentColor} style={[styles.profileCard, { backgroundColor: bgColor }]}>
              <View style={styles.cardHeader}>
                <Typography variant="title" color={accentColor}>
                  {isCliente ? 'Cliente' : 'Lojista'}
                </Typography>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: accentColor,
                  }}
                />
              </View>
              <Typography variant="body" color={colors.tinta}>{profile.name}</Typography>
              <Button
                label={isCliente ? 'Acessar como Cliente' : 'Acessar como Lojista'}
                variant={buttonVariant}
                disabled={selecting}
                loading={selecting}
                onPress={() => void choose(profile)}
                style={styles.profileButton}
              />
            </Card>
          );
        })}

        {/* Micro-copy under cards */}
        <Typography variant="caption" color={colors.muted} style={styles.microCopy}>
          Alterne entre perfis nas configurações
        </Typography>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContent: { flex: 1, flexDirection: 'column', paddingBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  wordmarkWrapper: { flex: 1, alignItems: 'center' },
  userMenuTrigger: { padding: 2 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  spacer: { width: 36 },
  title: { lineHeight: 28, textAlign: 'center', marginBottom: 4 },
  content: { paddingHorizontal: spacing.screen, paddingTop: 16, gap: 12 },
  profileCard: { gap: 10, padding: 18, width: '100%', maxWidth: 340, alignSelf: 'center' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  profileButton: { width: '100%', marginTop: 2 },
  microCopy: { textAlign: 'center', marginTop: 12 },
  userMenuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 200 },
  userMenuPanelWrapper: { position: 'absolute', zIndex: 201, width: 180 },
  userMenuPanel: { backgroundColor: colors.white, borderRadius: radius.md, padding: 4, shadowColor: colors.tinta, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
  userMenuItem: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: radius.sm, width: '100%' },
  userMenuItemDestructive: { backgroundColor: colors.coral + '10' },
});