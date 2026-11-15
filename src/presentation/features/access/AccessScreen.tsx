import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { layout, spacing, colors } from '../../../core/theme';
import { Logo } from '../../components/brand/Logo';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { useSession } from '../../providers/SessionProvider';
import { getProfileRoute } from '../../navigation/profileRoutes';

export default function AccessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { ready, session } = useSession();

  useEffect(() => {
    if (ready && session) router.replace(getProfileRoute(session));
  }, [ready, session, router]);

  return (
    <Screen statusBar="dark" background={colors.bg}>
      <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.logoArea}>
          <Logo />
        </View>
        <View style={styles.actions}>
          <Button label="Entrar na minha conta" variant="primary" onPress={() => router.push('/login')} />
          <Button label="Criar uma conta" variant="outline" onPress={() => router.push('/cadastro')} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: spacing.screen },
  logoArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  actions: { gap: 14, width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center', paddingBottom: 8 },
});
