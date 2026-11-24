/** Gerenciamento de tokens de acesso e refresh. */
const ACCESS_TOKEN_KEY = 'syncday_access_token';
const REFRESH_TOKEN_KEY = 'syncday_refresh_token';
const LOJISTA_ACCESS_TOKEN_KEY = 'syncday_lojista_access_token';

let accessToken: string | undefined;
let refreshToken: string | undefined;
let lojistaAccessToken: string | undefined;

// Callbacks for token changes
let onTokensRefreshed: ((access: string, refresh: string) => void) | undefined;

// Inicializa do localStorage no browser
if (typeof window !== 'undefined') {
  accessToken = localStorage.getItem(ACCESS_TOKEN_KEY) || undefined;
  refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) || undefined;
  lojistaAccessToken = localStorage.getItem(LOJISTA_ACCESS_TOKEN_KEY) || undefined;
}

function persistAccessToken(token: string | undefined) {
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem(ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

function persistRefreshToken(token: string | undefined) {
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem(REFRESH_TOKEN_KEY, token);
    else localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

function persistLojistaAccessToken(token: string | undefined) {
  if (typeof window !== 'undefined') {
    if (token) localStorage.setItem(LOJISTA_ACCESS_TOKEN_KEY, token);
    else localStorage.removeItem(LOJISTA_ACCESS_TOKEN_KEY);
  }
}

export function setAccessToken(token: string | undefined) {
  accessToken = token;
  persistAccessToken(token);
}

export function getAccessToken() {
  return accessToken;
}

export function setRefreshToken(token: string | undefined) {
  refreshToken = token;
  persistRefreshToken(token);
}

export function getRefreshToken() {
  return refreshToken;
}

export function setTokens(access: string, refresh: string) {
  accessToken = access;
  refreshToken = refresh;
  persistAccessToken(access);
  persistRefreshToken(refresh);
  // Notify listeners of successful refresh
  onTokensRefreshed?.(access, refresh);
}

export function clearTokens() {
  accessToken = undefined;
  refreshToken = undefined;
  lojistaAccessToken = undefined;
  if (typeof window !== 'undefined') {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(LOJISTA_ACCESS_TOKEN_KEY);
    // Remove legacy key from old 'logista' spelling
    localStorage.removeItem('syncday_logista_access_token');
  }
}

export function setLojistaAccessToken(token: string | undefined) {
  lojistaAccessToken = token;
  persistLojistaAccessToken(token);
}

export function getLojistaAccessToken() {
  return lojistaAccessToken;
}

/** Subscribe to token refresh events */
export function onTokensRefreshedSubscribe(callback: (access: string, refresh: string) => void) {
  onTokensRefreshed = callback;
}

/** Unsubscribe from token refresh events */
export function onTokensRefreshedUnsubscribe() {
  onTokensRefreshed = undefined;
}