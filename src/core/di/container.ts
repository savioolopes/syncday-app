import { HttpClient } from '../../data/http/HttpClient';
import { AuthApiClient } from '../../data/http/AuthApiClient';
import { getAccessToken, getRefreshToken, getLojistaAccessToken, setTokens, clearTokens } from '../../data/http/accessToken';
import { HttpRegistrationRepository } from '../../data/http/HttpRegistrationRepository';
import { HttpAppointmentRepository, HttpAuthenticationRepository, HttpServiceRepository } from '../../data/http/httpRepositories';
import { HttpLojistaManagementRepository } from '../../data/http/lojistaManagementRepository';
import {
  MockAppointmentRepository,
  MockAuthenticationRepository,
  MockLojistaManagementRepository,
  MockRegistrationRepository,
  MockServiceRepository,
} from '../../data/mock/mockRepositories';
import { AppointmentRepository, AuthenticationRepository, LojistaManagementRepository, RegistrationRepository, ServiceRepository } from '../../domain/repositories';
import { CreateAppointment, GetAppointments, GetAppointmentsForLojista, GetAvailableSlots, GetService, GetServices, Login, ManageLojistaConfiguration, RegisterAccount, CancelAppointment, UpdateClientProfile, UpdateLojistaProfile } from '../../domain/usecases';

interface Repositories {
  appointments: AppointmentRepository;
  services: ServiceRepository;
  authentication: AuthenticationRepository;
  registration: RegistrationRepository;
  lojistaManagement: LojistaManagementRepository;
}

function createRepositories(): Repositories {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (apiUrl) {
    // At runtime in browser: if current origin differs from API origin, use relative URLs (nginx proxy)
    // During static rendering (Node.js) or same-origin: use absolute URLs from .env
    const isBrowser = typeof window !== 'undefined';
    const currentOrigin = isBrowser ? window.location.origin : '';
    let apiOrigin = '';
    try {
      apiOrigin = new URL(apiUrl).origin;
    } catch {
      apiOrigin = '';
    }
    const useRelativeUrls = isBrowser && currentOrigin !== '' && apiOrigin !== '' && currentOrigin !== apiOrigin;

    const deriveApiUrl = (override: string | undefined, port: string) => {
      if (override) return override;
      const url = new URL(apiUrl);
      url.port = port;
      return url.toString().replace(/\/$/, '');
    };

    // If using relative URLs at runtime (nginx proxy), use path prefixes
    // During static rendering or same-origin, use absolute URLs with ports
    // All API routes now under /api/ to avoid conflicts with frontend routes
    // Note: authApiUrl is empty string for relative URLs because nginx location /api/auth
    // already maps to usuario-app:8092/api/auth, and AuthApiClient calls /api/auth/*
    const schedulingApiUrl = useRelativeUrls ? '/api' : apiUrl.replace(/\/$/, '');
    const clientApiUrl = useRelativeUrls ? '/api' : deriveApiUrl(process.env.EXPO_PUBLIC_CLIENTE_API_URL, '8091');
    const lojistaApiUrl = useRelativeUrls ? '/api' : deriveApiUrl(process.env.EXPO_PUBLIC_LOJISTA_API_URL, '8090');
    const authApiUrl = useRelativeUrls ? '' : (process.env.EXPO_PUBLIC_AUTH_API_URL || deriveApiUrl(undefined, '8092'));

    // HttpClient principal (agendamento) com suporte a refresh via AuthApiClient
    const http = new HttpClient(
      schedulingApiUrl,
      getAccessToken,
      getRefreshToken,
      (access: string, refresh: string) => {
        // setTokens já atualiza as variáveis globais
      }
    );

    // AuthApiClient para o usuario-service (IdP)
    const authClient = new AuthApiClient(
      authApiUrl,
      getAccessToken,
      getRefreshToken,
      (access: string, refresh: string) => {
        // setTokens já atualiza as variáveis globais
      },
      () => {} // clearTokens
    );

    // Configura o handler de refresh no HttpClient principal
    http.setRefreshHandler(async () => {
      await authClient.refresh();
    });

    // Handler para quando o refresh falha (refresh token expirado/inválido)
    http.setRefreshFailureHandler(() => {
      clearTokens();
      // Also clear the session from localStorage to prevent reload loop
      if (typeof window !== 'undefined') {
        localStorage.removeItem('syncday.api-session');
        window.dispatchEvent(new CustomEvent('auth:refresh-failed'));
      }
    });

    // HttpClients para serviços específicos
    const clientHttp = new HttpClient(clientApiUrl, getAccessToken);
    const lojistaHttp = new HttpClient(lojistaApiUrl, getLojistaAccessToken);

    return {
      appointments: new HttpAppointmentRepository(http),
      services: new HttpServiceRepository(http),
      authentication: new HttpAuthenticationRepository(schedulingApiUrl, clientApiUrl, lojistaApiUrl, authApiUrl),
      registration: new HttpRegistrationRepository(schedulingApiUrl, clientApiUrl, lojistaApiUrl, authApiUrl),
      lojistaManagement: new HttpLojistaManagementRepository(lojistaHttp, http),
    };
  }
  return {
    appointments: new MockAppointmentRepository(),
    services: new MockServiceRepository(),
    authentication: new MockAuthenticationRepository(),
    registration: new MockRegistrationRepository(),
    lojistaManagement: new MockLojistaManagementRepository(),
  };
}

export function createContainer(repos: Repositories = createRepositories()) {
  return {
    usecases: {
      getAppointments: new GetAppointments(repos.appointments),
      getAppointmentsForLojista: new GetAppointmentsForLojista(repos.appointments),
      getServices: new GetServices(repos.services),
      getService: new GetService(repos.services),
      getAvailableSlots: new GetAvailableSlots(repos.services),
      createAppointment: new CreateAppointment(repos.appointments),
      cancelAppointment: new CancelAppointment(repos.appointments),
      login: new Login(repos.authentication),
      registerAccount: new RegisterAccount(repos.registration),
      manageLojistaConfiguration: new ManageLojistaConfiguration(repos.lojistaManagement),
      updateClientProfile: new UpdateClientProfile(repos.authentication),
      updateLojistaProfile: new UpdateLojistaProfile(repos.authentication),
      authentication: repos.authentication,
    },
  };
}

export type AppContainer = ReturnType<typeof createContainer>;