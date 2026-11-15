import { HttpError } from '../../data/http/HttpClient';

/**
 * Mapeia erros técnicos para mensagens amigáveis ao usuário
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  // Erro de rede/sem conexão
  if (error instanceof TypeError && error.message.includes('Network')) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente novamente.';
  }

  // HttpError do nosso HttpClient
  if (error instanceof HttpError) {
    return mapHttpError(error);
  }

  // Erro genérico
  if (error instanceof Error) {
    // Se já é uma mensagem amigável (não parece técnica), usa ela
    const msg = error.message;
    if (!msg.includes('Erro ') && !msg.includes('status') && !msg.includes('HTTP') && !msg.includes('fetch')) {
      return msg;
    }
  }

  return 'Ocorreu um erro inesperado. Tente novamente.';
}

function mapHttpError(error: HttpError): string {
  switch (error.status) {
    case 400:
      return 'Dados inválidos. Verifique as informações e tente novamente.';
    case 401:
      // Tenta extrair mensagem do body se for JSON
      try {
        const body = JSON.parse(error.message);
        if (body?.message) {
          return mapAuthErrorMessage(body.message);
        }
        // Se o body tem erro mas sem message, pode ser token expirado
        if (body?.error || body?.code) {
          return mapAuthErrorMessage(JSON.stringify(body));
        }
      } catch {
        // Não é JSON, verifica se a mensagem indica token expirado
        const msg = error.message.toLowerCase();
        if (msg.includes('expired') || msg.includes('expirad') || msg.includes('token') || msg.includes('unauthorized') || msg.includes('não autorizado')) {
          return 'Sessão expirada. Faça login novamente.';
        }
      }
      // Para 401 sem body informativo, assume token expirado em telas autenticadas
      // O HttpClient já tenta refresh automaticamente, então se chegou aqui é falha de refresh
      return 'Sessão expirada. Faça login novamente.';
    case 403:
      return 'Você não tem permissão para acessar este recurso.';
    case 404:
      return 'Recurso não encontrado.';
    case 409:
      return 'Este e-mail já está cadastrado. Se você já tem conta, use a mesma senha para adicionar outro perfil (Cliente ou Lojista).';
    case 422:
      return 'Dados inválidos. Verifique os campos destacados.';
    case 429:
      return 'Muitas tentativas. Aguarde um momento e tente novamente.';
    case 500:
      return 'Erro interno do servidor. Nossa equipe foi notificada.';
    case 502:
    case 503:
    case 504:
      return 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
    default:
      return `Erro ao comunicar com o servidor (${error.status}). Tente novamente.`;
  }
}

function mapAuthErrorMessage(backendMessage: string): string {
  const msg = backendMessage.toLowerCase();

  // Mapeia mensagens comuns do backend de autenticação
  // Usa mensagem genérica para evitar enumeração de contas
  if (msg.includes('invalid credentials') || msg.includes('credenciais inválidas') || msg.includes('wrong password') || msg.includes('senha incorreta')) {
    return 'E-mail ou senha incorretos. Tente novamente.';
  }
  if (msg.includes('user not found') || msg.includes('usuário não encontrado') || msg.includes('não encontrado')) {
    return 'E-mail ou senha incorretos. Tente novamente.';
  }
  if (msg.includes('account locked') || msg.includes('conta bloqueada') || msg.includes('bloqueada')) {
    return 'Conta bloqueada por segurança. Entre em contato com o suporte.';
  }
  if (msg.includes('disabled') || msg.includes('desativad') || msg.includes('inativ')) {
    return 'Esta conta está desativada. Entre em contato com o suporte.';
  }
  if (msg.includes('expired') || msg.includes('expirad') || msg.includes('token') || msg.includes('unauthorized') || msg.includes('não autorizado')) {
    return 'Sessão expirada. Faça login novamente.';
  }

  // Se não mapeou, para 401 assume token expirado (já tentou refresh)
  return 'Sessão expirada. Faça login novamente.';
}

/**
 * Hook para tratamento de erros em componentes
 */
export function useErrorHandler() {
  return (error: unknown) => getUserFriendlyErrorMessage(error);
}