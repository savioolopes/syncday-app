import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createContainer } from '../../core/di/container';
import { setAccessToken, setLojistaAccessToken, setRefreshToken, getRefreshToken, clearTokens, getAccessToken, onTokensRefreshedSubscribe, onTokensRefreshedUnsubscribe } from '../../data/http/accessToken';
import { AuthApiClient } from '../../data/http/AuthApiClient';
import { AccountProfile, ProfileKind } from '../../domain/repositories';

const SESSION_KEY = 'syncday.api-session';
const REFRESH_TOKEN_KEY = 'syncday.refresh-token';

export interface Session {
  login: string;
  token: string;
  refreshToken?: string;
  profiles: AccountProfile[];
  activeProfile?: ProfileKind;
  lojistaToken?: string;
}

interface SessionContextValue {
  session: Session | null;
  ready: boolean;
  initializationError?: string;
  signIn: (login: string, password: string, knownClientId?: string, knownClientName?: string) => Promise<Session>;
  selectProfile: (kind: ProfileKind) => Promise<void>;
  clearProfileSelection: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

function persistSession(session: Session | null) {
  if (typeof window === 'undefined') return;
  if (session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
}

function restoreSession(): Session | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    return normalizeStoredSession(JSON.parse(stored));
  } catch {
    return null;
  }
}

function normalizeStoredSession(value: unknown): Session {
  if (!value || typeof value !== 'object') throw new Error('A sessão salva está inválida. Entre novamente.');
  const stored = value as Partial<Session> & { clientId?: string; name?: string };
  if (!stored.login || !stored.token) throw new Error('A sessão salva está inválida. Entre novamente.');

  const profiles = stored.profiles ?? (stored.clientId
    ? [{ kind: 'cliente' as const, id: stored.clientId, name: stored.name ?? stored.login }]
    : []);
  if (profiles.length === 0) throw new Error('A sessão salva não tem um perfil válido. Entre novamente.');

  return {
    login: stored.login,
    token: stored.token,
    refreshToken: stored.refreshToken,
    profiles,
    activeProfile: stored.activeProfile ?? (profiles.length === 1 ? profiles[0].kind : undefined),
    lojistaToken: stored.lojistaToken,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [initializationError, setInitializationError] = useState<string>();

  useEffect(() => {
    let active = true;
    const restore = async () => {
      try {
        let restored: Session | null = null;
        if (Platform.OS !== 'web') {
          const stored = await SecureStore.getItemAsync(SESSION_KEY);
          const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
          if (stored) {
            restored = normalizeStoredSession(JSON.parse(stored));
            if (storedRefresh) {
              restored.refreshToken = storedRefresh;
            }
          }
        } else {
          // Web: restaura do localStorage
          restored = restoreSession();
        }

        if (restored) {
          setAccessToken(restored.token);
          setLojistaAccessToken(restored.lojistaToken);
          if (restored.refreshToken) {
            setRefreshToken(restored.refreshToken);
          }
          if (active) setSession(restored);
        }
      } catch (error) {
        if (active) setInitializationError((error as Error).message);
      } finally {
        if (active) setReady(true);
      }
    };
    void restore();
    return () => {
      active = false;
    };
  }, []);

  // Escuta falha no refresh token para limpar sessão e redirecionar para login
  useEffect(() => {
    const handleRefreshFailed = () => {
      setSession(null);
      setInitializationError('Sessão expirada. Faça login novamente.');
      // Redireciona para login (usando setTimeout para evitar problemas de renderização)
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }, 0);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('auth:refresh-failed', handleRefreshFailed);
      return () => window.removeEventListener('auth:refresh-failed', handleRefreshFailed);
    }
  }, []);

  // Escuta refresh de tokens bem-sucedido para atualizar sessão
  useEffect(() => {
    const handleTokensRefreshed = (newAccess: string, newRefresh: string) => {
      setSession((current) => {
        if (!current) return null;
        const updated = { ...current, token: newAccess, refreshToken: newRefresh };
        // Persist updated session
        if (Platform.OS !== 'web') {
          SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(updated));
        } else {
          persistSession(updated);
        }
        return updated;
      });
    };

    onTokensRefreshedSubscribe(handleTokensRefreshed);
    return () => onTokensRefreshedUnsubscribe();
  }, []);

  const signIn = useCallback(async (
    login: string,
    password: string,
    knownClientId?: string,
    knownClientName?: string
  ) => {
    const result = await createContainer().usecases.login.execute(
      login,
      password,
      knownClientId,
      knownClientName
    );
    const nextSession: Session = {
      login: login.trim(),
      token: result.token,
      refreshToken: result.refreshToken,
      profiles: result.profiles,
      activeProfile: result.profiles.length === 1 ? result.profiles[0].kind : undefined,
      lojistaToken: result.lojistaToken,
    };
    if (Platform.OS !== 'web') {
      await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(nextSession));
      if (result.refreshToken) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refreshToken);
      }
    } else {
      persistSession(nextSession);
    }
    setAccessToken(result.token);
    setLojistaAccessToken(result.lojistaToken);
    if (result.refreshToken) {
      setRefreshToken(result.refreshToken);
    }
    setSession(nextSession);
    setInitializationError(undefined);
    return nextSession;
  }, []);

  const selectProfile = useCallback(async (kind: ProfileKind) => {
    if (!session?.profiles.some((profile) => profile.kind === kind)) {
      throw new Error('Esse perfil não está disponível para a conta.');
    }
    const nextSession = { ...session, activeProfile: kind };
    if (Platform.OS !== 'web') await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(nextSession));
    else persistSession(nextSession);
    setSession(nextSession);
  }, [session]);

  const clearProfileSelection = useCallback(async () => {
    if (!session) return;
    const nextSession = { ...session, activeProfile: undefined };
    if (Platform.OS !== 'web') await SecureStore.setItemAsync(SESSION_KEY, JSON.stringify(nextSession));
    else persistSession(nextSession);
    setSession(nextSession);
  }, [session]);

  const signOut = useCallback(async () => {
    // Chama logout no IdP antes de limpar tokens locais
    try {
      const authApiUrl = process.env.EXPO_PUBLIC_AUTH_API_URL ||
        (process.env.EXPO_PUBLIC_API_URL ? new URL(process.env.EXPO_PUBLIC_API_URL).origin.replace(/:8093$/, ':8092') : 'http://localhost:8092');

      const authClient = new AuthApiClient(
        authApiUrl,
        getAccessToken,
        getRefreshToken,
        () => {}, // setTokens - not needed for logout
        () => {}  // clearTokens - not needed for logout
      );

      await authClient.logout();
    } catch {
      // Ignora erros de logout no IdP - continua com limpeza local
    } finally {
      // Garante limpeza mesmo se houver erro inesperado
      if (Platform.OS !== 'web') {
        await SecureStore.deleteItemAsync(SESSION_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      } else {
        persistSession(null);
      }
      clearTokens();
      setSession(null);
    }
  }, []);

  const value = useMemo(
    () => ({ session, ready, initializationError, signIn, selectProfile, clearProfileSelection, signOut }),
    [session, ready, initializationError, signIn, selectProfile, clearProfileSelection, signOut]
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession deve ser usado dentro de <SessionProvider>');
  return value;
}
