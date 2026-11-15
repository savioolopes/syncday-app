/** Cliente HTTP dedicado ao serviço de Autenticação (usuario/IdP - porta 8092). */
import { HttpClient, HttpError } from './HttpClient';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    login: string;
    role: string;
    permissions: string[];
    authorizedServices: string[];
  };
}

export interface RegisterRequest {
  login: string;
  password: string;
  role: 'USER' | 'ADMIN' | 'CLIENTE' | 'LOJISTA';
}

export interface RegisterResponse {
  // Registro retorna 200 OK sem body
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: {
    id: string;
    login: string;
    role: string;
    permissions: string[];
    authorizedServices: string[];
  };
}

export interface JwksResponse {
  keys: Array<{
    kty: string;
    use: string;
    kid: string;
    n: string;
    e: string;
    alg: string;
  }>;
}

export class AuthApiClient {
  private http: HttpClient;

  constructor(
    baseUrl: string,
    private getAccessToken: () => string | undefined,
    private getRefreshToken: () => string | undefined,
    private setTokens: (access: string, refresh: string) => void,
    private clearTokens: () => void
  ) {
    this.http = new HttpClient(baseUrl, getAccessToken);
  }

  /** Login no IdP (usuario-service) */
  async login(login: string, password: string): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/api/auth/login', {
      login: login.trim(),
      password,
    });
    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  /** Registro no IdP (usuario-service) */
  async register(data: RegisterRequest): Promise<void> {
    await this.http.post<void>('/api/auth/register', data);
    // Registro não faz login automático - o front deve chamar login depois
  }

  /** Refresh do access token usando refresh token */
  async refresh(): Promise<LoginResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('Refresh token não disponível');
    }

    const response = await this.http.post<RefreshResponse>('/api/auth/refresh', {
      refreshToken,
    });
    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  /** Logout - adiciona token à blocklist */
  async logout(): Promise<void> {
    try {
      await this.http.post<void>('/api/auth/logout', {});
    } finally {
      this.clearTokens();
    }
  }

  /** Busca chaves públicas JWKS para validação de JWT (público, sem auth) */
  async getJwks(): Promise<JwksResponse> {
    const res = await fetch(`${this.http['baseUrl'].replace(/\/+$/, '')}/.well-known/jwks.json`);
    if (!res.ok) throw new HttpError('Falha ao buscar JWKS', res.status);
    return res.json();
  }

  /** Verifica se um token está na blocklist (público) */
  async checkBlocklist(jti: string): Promise<boolean> {
    const res = await fetch(`${this.http['baseUrl'].replace(/\/+$/, '')}/api/auth/blocklist/check/${jti}`);
    if (!res.ok) throw new HttpError('Falha ao verificar blocklist', res.status);
    const data = await res.json();
    return data as boolean;
  }
}