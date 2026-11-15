import React, { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, spacing } from '../../../core/theme';
import { AccountProfile } from '../../../domain/repositories';
import { Wordmark } from '../../components/brand/Logo';
import { BlueHeader } from '../../components/ui/BlueHeader';
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
                <Typography variant="label" color={colors.orange}>Sair</Typography>
              </Pressable>
            </View>
          </Pressable>
        </>
      )}
      <BlueHeader>
        <View style={styles.headerContent}>
          <View style={styles.topRow}>
            <View style={styles.wordmarkWrapper}>
              <Wordmark color={colors.white} size={30} />
            </View>
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
          </View>

          <View style={styles.spacer} />

          <Typography variant="heading" size={20} color={colors.white} style={styles.title}>
            Selecione qual conta deseja acessar
          </Typography>
        </View>
      </BlueHeader>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 100 + insets.bottom }]} showsVerticalScrollIndicator={false}>
        {session.profiles.map((profile) => (
          <Card key={profile.kind} style={styles.profileCard}>
            <Typography variant="heading">
              {profile.kind === 'cliente' ? 'Cliente' : 'Lojista'}
            </Typography>
            <Typography variant="body" color={colors.muted}>{profile.name}</Typography>
            <Button
              label={profile.kind === 'cliente' ? 'Acessar como Cliente' : 'Acessar como Lojista'}
              disabled={selecting}
              loading={selecting}
              onPress={() => void choose(profile)}
            />
          </Card>
        ))}

        {/* Micro-copy under cards */}
        <Typography variant="caption" color={colors.muted} style={styles.microCopy}>
          Alterne entre perfis a qualquer momento nas configurações
        </Typography>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerContent: { flex: 1, flexDirection: 'column', paddingBottom: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  wordmarkWrapper: { flex: 1, alignItems: 'center' },
  userMenuTrigger: { padding: 2, position: 'absolute', right: 0 },
  userAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.white, backgroundColor: colors.glass, justifyContent: 'center', alignItems: 'center' },
  spacer: { flex: 1 },
  title: { lineHeight: 28, textAlign: 'center', marginBottom: 4 },
  content: { paddingHorizontal: spacing.screen, paddingTop: 24, gap: 20 },
  profileCard: { gap: 10, marginBottom: 8, width: '100%', maxWidth: 340, alignSelf: 'center' },
  microCopy: { textAlign: 'center', marginTop: 8 },
  userMenuBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50 },
  userMenuPanelWrapper: { position: 'absolute', zIndex: 51, width: 180 },
  userMenuPanel: { backgroundColor: colors.white, borderRadius: radius.md, padding: 4, shadowColor: colors.ink, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 10 },
  userMenuItem: { paddingVertical: 18, paddingHorizontal: 20, borderRadius: radius.sm, width: '100%' },
  userMenuItemDestructive: { backgroundColor: colors.orange + '10' },
});