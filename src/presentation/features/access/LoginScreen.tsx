import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { colors, radius, spacing } from '../../../core/theme';
import { getProfileRoute } from '../../navigation/profileRoutes';
import { Button } from '../../components/ui/Button';
import { Screen } from '../../components/ui/Screen';
import { useSession } from '../../providers/SessionProvider';
import { useToast } from '../../providers/ToastProvider';
import { Logo } from '../../components/brand/Logo';

export default function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const { session, ready, initializationError, signIn } = useSession();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (ready && session) router.replace(getProfileRoute(session));
  }, [ready, session, router]);

  const submit = async () => {
    const normalizedLogin = login.trim();
    if (!normalizedLogin) {
      toast.show('Informe seu e-mail.');
      return;
    }
    if (!password) {
      toast.show('Informe sua senha.');
      return;
    }
    setSubmitting(true);
    try {
      const nextSession = await signIn(normalizedLogin, password);
      router.replace(getProfileRoute(nextSession));
    } catch (error) {
      toast.show('Não foi possível entrar. Verifique suas credenciais.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen statusBar="dark" background={colors.bg}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.root}>

        {/* Hero moment - brand */}
        <View style={styles.hero}>
          <Logo />
        </View>

        {initializationError ? (
          <Text style={styles.error}>
            Não foi possível restaurar a sessão. Tente novamente.
          </Text>
        ) : null}
        {!process.env.EXPO_PUBLIC_API_URL ? (
          <Text style={styles.error}>
            Configure EXPO_PUBLIC_API_URL para conectar ao backend.
          </Text>
        ) : null}

        {/* Form card with constrained width - no labels, only placeholders */}
        <View style={styles.formCard}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            editable={!submitting}
            keyboardType="email-address"
            onChangeText={setLogin}
            placeholder="seu@email.com"
            placeholderTextColor={colors.disabledText}
            style={styles.inputEmail}
            value={login}
          />
          <TextInput
            autoCapitalize="none"
            editable={!submitting}
            onChangeText={setPassword}
            onSubmitEditing={() => void submit()}
            placeholder="Sua senha"
            placeholderTextColor={colors.disabledText}
            secureTextEntry
            style={styles.inputPassword}
            value={password}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => toast.show('Recuperação de senha em breve. Entre em contato com o suporte.')}
          style={styles.forgotPassword}
          hitSlop={{ left: 12, right: 12, top: 6, bottom: 6 }}
        >
          <Text style={styles.linkText}>Esqueci a senha</Text>
        </Pressable>

        <View style={styles.buttonWrapper}>
          <Button label="Entrar" loading={submitting} disabled={!ready || !process.env.EXPO_PUBLIC_API_URL} onPress={() => void submit()} style={styles.button} />
        </View>

        {/* Micro-copy under button - active, specific */}
        <Text style={styles.microCopy}>
          Entre e veja sua agenda em segundos
        </Text>

        <Pressable accessibilityRole="button" onPress={() => router.push('/cadastro')} style={styles.signupLink} hitSlop={{ left: 12, right: 12, top: 6, bottom: 6 }}>
          <Text style={styles.linkText}>Não tem conta? Crie a sua</Text>
        </Pressable>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.screen, gap: 24 },
  hero: { alignItems: 'center', marginBottom: 4 },
  error: { color: colors.orange, textAlign: 'center', marginBottom: 8 },
  formCard: { width: '100%', maxWidth: 340, alignSelf: 'center', gap: 0, marginBottom: 16 },
  inputEmail: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  inputPassword: {
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: radius.md,
    borderBottomRightRadius: radius.md,
    paddingHorizontal: 16,
    color: colors.ink,
    backgroundColor: colors.white,
  },
  buttonWrapper: { width: '100%', maxWidth: 340, alignSelf: 'center', marginBottom: 8 },
  signupLink: { alignItems: 'center', paddingVertical: 8, alignSelf: 'center' },
  forgotPassword: { alignItems: 'center', paddingVertical: 8, alignSelf: 'center' },
  microCopy: { color: colors.muted, textAlign: 'center', marginTop: 12 },
  button: { width: '100%' },
  linkText: { color: colors.blue },
});
