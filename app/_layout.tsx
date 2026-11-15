import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { BricolageGrotesque_700Bold } from '@expo-google-fonts/bricolage-grotesque';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { GeistMono_400Regular, GeistMono_700Bold } from '@expo-google-fonts/geist-mono';
import { colors } from '../src/core/theme';
import { AppProviders } from '../src/presentation/providers/AppProviders';
import { SessionProvider } from '../src/presentation/providers/SessionProvider';

// Only statically render public routes during SSG to avoid auth-required API calls
export const unstable_settings = {
  staticRoutes: ['/', '/login', '/cadastro', '/selecionar-perfil', '/perfil-cliente', '/perfil-lojista'],
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    BricolageGrotesque_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    GeistMono_400Regular,
    GeistMono_700Bold,
  });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  const bgColor = colors?.bg ?? '#F2F4FB';

  return (
    <SessionProvider>
      <AppProviders>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: bgColor } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="cadastro" />
          <Stack.Screen name="selecionar-perfil" />
          <Stack.Screen name="agendamentos" options={{ gestureEnabled: false }} />
          <Stack.Screen name="agenda-lojista" options={{ gestureEnabled: false }} />
          <Stack.Screen name="gestao-lojista" />
          <Stack.Screen name="novo-agendamento" />
        </Stack>
      </AppProviders>
    </SessionProvider>
  );
}
