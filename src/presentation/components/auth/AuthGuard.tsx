import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../providers/SessionProvider';
import { getUserFriendlyErrorMessage } from '../../../core/utils/errors';

/**
 * AuthGuard - Componente de segurança global para telas autenticadas
 *
 * Responsabilidades:
 * - Verifica se a sessão está válida antes de renderizar o conteúdo
 * - Redireciona para login se não há sessão ativa
 * - Escuta eventos de falha no refresh token para redirecionamento automático
 * - Fornece loading state enquanto verifica a sessão
 */
export function AuthGuard({
  children,
  requiredProfile,
  fallback = null
}: {
  children: React.ReactNode;
  requiredProfile?: 'cliente' | 'lojista';
  fallback?: React.ReactNode;
}) {
  const router = useRouter();
  const { ready, session, initializationError } = useSession();

  // Redireciona para login se não há sessão ou perfil incorreto
  useEffect(() => {
    if (!ready) return;

    if (!session) {
      router.replace('/');
      return;
    }

    // Permitir activeProfile === undefined (tela de seleção de perfil)
    if (requiredProfile && session.activeProfile && session.activeProfile !== requiredProfile) {
      router.replace(requiredProfile === 'cliente' ? '/agendamentos' : '/agenda-lojista');
      return;
    }
  }, [ready, session, requiredProfile, router]);

  // Se ainda não está pronto, mostra loading
  if (!ready) {
    return fallback ?? (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // Se há erro de inicialização (ex: sessão expirada), redireciona para login
  if (initializationError) {
    return null; // O SessionProvider já redireciona via auth:refresh-failed
  }

  // Se não há sessão válida, não renderiza
  if (!session) {
    return null;
  }

  // Verifica se o perfil requerido existe nos perfis da sessão (síncrono - antes de renderizar children)
  if (requiredProfile && !session.profiles.some((p) => p.kind === requiredProfile)) {
    // Redireciona no próximo tick para evitar warning de render
    setTimeout(() => {
      router.replace(requiredProfile === 'cliente' ? '/agendamentos' : '/agenda-lojista');
    }, 0);
    return null;
  }

  return <>{children}</>;
}

/**
 * Hook para tratamento unificado de erros de autenticação em telas autenticadas
 * Detecta automaticamente erros de token expirado e trata de forma consistente
 */
export function useAuthErrorHandler() {
  const { signOut } = useSession();
  const router = useRouter();

  const handleError = (error: unknown): string => {
    // Se é um HttpError com status 401, verifica se é token expirado
    if (error && typeof error === 'object' && 'status' in error && error.status === 401) {
      // Força logout e redireciona para login
      // O SessionProvider já escuta auth:refresh-failed e redireciona
      void signOut();
      router.replace('/');
      return 'Sessão expirada. Redirecionando para login...';
    }

    // Para outros erros, usa o mapeamento padrão
    return getUserFriendlyErrorMessage(error);
  };

  return { handleError };
}