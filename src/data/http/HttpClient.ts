/** Cliente HTTP mínimo. Centraliza base URL, headers, token e tratamento de erro. */
export class HttpError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export interface RefreshHandler {
  (): Promise<void>;
}

export interface RefreshFailureHandler {
  (): void;
}

export class HttpClient {
  private refreshHandler?: RefreshHandler;
  private refreshFailureHandler?: RefreshFailureHandler;
  private isRefreshing = false;
  private pendingRequests: Array<(token: string) => void> = [];
  private refreshError?: Error;

  constructor(
    private readonly baseUrl: string,
    private readonly getToken?: () => string | undefined,
    private readonly getRefreshToken?: () => string | undefined,
    private readonly setTokens?: (access: string, refresh: string) => void
  ) {}

  /** Define o handler de refresh de token (chamado quando recebe 401) */
  setRefreshHandler(handler: RefreshHandler) {
    this.refreshHandler = handler;
  }

  /** Define o handler chamado quando o refresh falha (ex: refresh token expirado) */
  setRefreshFailureHandler(handler: RefreshFailureHandler) {
    this.refreshFailureHandler = handler;
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = this.getToken?.();
    const url = `${this.baseUrl.replace(/\/+$/, '')}${path}`;

    const makeRequest = async (currentToken?: string): Promise<Response> => {
      return fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { Authorization: `Bearer ${currentToken}` } : {}),
          ...(init.headers ?? {}),
        },
      });
    };

    let res = await makeRequest(token);

    // Se 401 e temos handler de refresh, tenta renovar o token
    if (res.status === 401 && this.refreshHandler && this.getRefreshToken?.()) {
      return this.handleTokenRefresh(path, init, makeRequest);
    }

    if (!res.ok) {
      const body = await res.text();
      // Durante static rendering (Node.js), não falha o build em 401 apenas para GET requests
      // Isso evita que o build quebre em rotas protegidas durante exportação estática
      const isStaticRendering = typeof window === 'undefined' && typeof process !== 'undefined' && process.env?.NEXT_PHASE?.includes?.('export');
      if (isStaticRendering && res.status === 401 && init.method !== 'POST' && init.method !== 'PUT' && init.method !== 'PATCH' && init.method !== 'DELETE') {
        return [] as unknown as T;
      }
      throw new HttpError(body || `Erro ${res.status} ao falar com o servidor.`, res.status);
    }
    if (res.status === 204) return undefined as T;
    const body = await res.text();
    if (!body) return undefined as T;
    return res.headers.get('Content-Type')?.includes('json')
      ? JSON.parse(body) as T
      : body as T;
  }

  private async handleTokenRefresh<T>(path: string, init: RequestInit, makeRequest: (token?: string) => Promise<Response>): Promise<T> {
    // Se já está renovando, espera a renovação terminar
    if (this.isRefreshing) {
      return new Promise((resolve, reject) => {
        this.pendingRequests.push((newToken: string) => {
          // Sentinel value: refresh failed, reject with stored error
          if (newToken === '__REFRESH_FAILED__') {
            reject(this.refreshError ?? new Error('Token refresh failed'));
            return;
          }
          makeRequest(newToken).then(res => {
            if (!res.ok) {
              const body = res.text().then(b => { throw new HttpError(b || `Erro ${res.status}`, res.status); });
              return reject(new HttpError('Erro após refresh', res.status));
            }
            if (res.status === 204) return resolve(undefined as T);
            const body = res.text();
            body.then(b => {
              if (!b) return resolve(undefined as T);
              resolve(res.headers.get('Content-Type')?.includes('json') ? JSON.parse(b) as T : b as T);
            });
          }).catch(reject);
        });
      });
    }

    this.isRefreshing = true;

    let newToken: string | undefined;

    try {
      // Tenta renovar o token - qualquer erro aqui é falha de refresh
      await this.refreshHandler!();
      newToken = this.getToken?.();
      if (!newToken) throw new Error('Token não disponível após refresh');
    } catch (error) {
      // Falha no refresh: notifica requisições pendentes e chama handler de falha
      this.refreshError = error as Error;
      this.pendingRequests.forEach(cb => cb('__REFRESH_FAILED__'));
      this.pendingRequests = [];
      this.refreshFailureHandler?.();
      throw error;
    } finally {
      this.isRefreshing = false;
      this.refreshError = undefined;
    }

    // Refresh funcionou - notifica requisições pendentes
    this.pendingRequests.forEach(cb => cb(newToken!));
    this.pendingRequests = [];

    // Refaz a requisição original com o novo token - erros aqui NÃO são falha de refresh
    const res = await makeRequest(newToken!);
    if (!res.ok) {
      const body = await res.text();
      throw new HttpError(body || `Erro ${res.status} ao falar com o servidor.`, res.status);
    }
    if (res.status === 204) return undefined as T;
    const body = await res.text();
    if (!body) return undefined as T;
    return res.headers.get('Content-Type')?.includes('json')
      ? JSON.parse(body) as T
      : body as T;
  }

  get<T>(path: string) {
    return this.request<T>(path);
  }

  post<T>(path: string, body: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, { method: 'POST', body: JSON.stringify(body), headers });
  }

  put<T>(path: string, body: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, { method: 'PUT', body: JSON.stringify(body), headers });
  }

  patch<T>(path: string, body: unknown, headers?: Record<string, string>) {
    return this.request<T>(path, { method: 'PATCH', body: JSON.stringify(body), headers });
  }

  async delete(path: string, headers?: Record<string, string>): Promise<void> {
    await this.request<unknown>(path, { method: 'DELETE', headers });
  }
}