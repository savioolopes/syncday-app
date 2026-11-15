import { RegistrationInput, RegistrationRepository } from '../../domain/repositories';
import { HttpClient, HttpError } from './HttpClient';
import { AuthApiClient } from './AuthApiClient';
import { getAccessToken, setTokens, clearTokens } from './accessToken';

interface LoginResponseDto {
  token: string;
}

interface CreatedClientDto {
  idCliente: string;
}

function apiMessage(error: unknown) {
  if (!(error instanceof HttpError)) {
    return error instanceof Error ? error.message : 'Erro inesperado.';
  }

  try {
    const body = JSON.parse(error.message) as Record<string, unknown>;
    const message = body.mensagem ?? body.titulo ?? body.message ?? body.detail;
    if (typeof message === 'string' && message.trim()) return message;
  } catch {
    return error.message;
  }
  return error.message || `A API respondeu com HTTP ${error.status}.`;
}

export class HttpRegistrationRepository implements RegistrationRepository {
  private authClient: AuthApiClient;

  constructor(
    private readonly schedulingApiUrl: string,
    private readonly clientApiUrl: string,
    private readonly lojistaApiUrl: string,
    private readonly authApiUrl: string
  ) {
    this.authClient = new AuthApiClient(
      authApiUrl,
      getAccessToken,
      () => undefined, // refresh token não disponível durante registro
      setTokens,
      clearTokens
    );
  }

  async register(input: RegistrationInput, onProgress: (message: string) => void) {
    const profileApiUrl = input.kind === 'cliente' ? this.clientApiUrl : this.lojistaApiUrl;
    const profileApiName = input.kind === 'cliente' ? 'Cliente' : 'Lojista';
    const login = input.email.trim().toLowerCase();

    const step = async <T,>(
      progressMessage: string,
      errorMessage: string,
      action: () => Promise<T>
    ) => {
      onProgress(progressMessage);
      try {
        return await action();
      } catch (error) {
        throw new Error(`${errorMessage} ${apiMessage(error)}`);
      }
    };

    // 1. Registra o usuário no IdP centralizado (usuario-service)
    const authRole = input.kind === 'cliente' ? 'CLIENTE' : 'LOJISTA';
    onProgress(`Criando conta no serviço de Autenticação...`);
    try {
      await this.authClient.register({
        login,
        password: input.password,
        role: authRole,
      });
    } catch (registrationError) {
      if (!(registrationError instanceof HttpError) || ![400, 409].includes(registrationError.status)) {
        throw new Error(`Não foi possível criar a conta no serviço de Autenticação. ${apiMessage(registrationError)}`);
      }
      // Se já existe (400/409), continua - pode tentar login depois
    }

    // 2. Faz login para obter tokens
    onProgress(`Autenticando no serviço de Autenticação...`);
    const authResponse = await this.authClient.login(login, input.password);

    // 3. Cria perfil no serviço correspondente (Cliente ou Lojista)
    const profileHttp = new HttpClient(profileApiUrl, () => getAccessToken());

    if (input.kind === 'cliente') {
      await step(
        'Criando o perfil de Cliente...',
        'A conta foi criada, mas não foi possível cadastrar o perfil de Cliente.',
        () =>
        profileHttp.post<CreatedClientDto>('/clientes', {
          idAplicacao: '123e4567-e89b-12d3-a456-426614174000',
          nome: input.nome,
          cpf: input.documento.replace(/\D/g, ''),
          email: login,
          endereco: input.endereco ? {
            tipoLogradouro: input.endereco.tipoLogradouro || 'RUA',
            logradouro: input.endereco.logradouro || '',
            numero: input.endereco.numero || '',
            complemento: input.endereco.complemento,
            bairro: input.endereco.bairro || '',
            cep: input.endereco.cep?.replace(/\D/g, '') || '',
            municipio: input.endereco.municipio || '',
            unidadeFederativa: input.endereco.unidadeFederativa || '',
          } : {
            tipoLogradouro: 'RUA',
            logradouro: '',
            numero: '',
            bairro: '',
            cep: '',
            municipio: '',
            unidadeFederativa: '',
          },
        })
      );
      return { clientId: (await profileHttp.get<{ idCliente: string }[]>('/clientes?email=' + encodeURIComponent(login)))[0]?.idCliente };
    }

    await step(
      'Criando o perfil de Lojista...',
      'A conta foi criada, mas não foi possível cadastrar o perfil de Lojista.',
      () => profileHttp.post('/lojistas', {
        idAplicacao: '123e4567-e89b-12d3-a456-426614174000',
        nome: input.nome,
        cnpj: input.documento.replace(/\D/g, ''),
        email: login,
        logoKey: input.logoKey ?? '/logo.png',
        endereco: input.endereco ? {
          tipoLogradouro: input.endereco.tipoLogradouro || 'RUA',
          logradouro: input.endereco.logradouro || '',
          numero: input.endereco.numero || '',
          complemento: input.endereco.complemento,
          bairro: input.endereco.bairro || '',
          cep: input.endereco.cep?.replace(/\D/g, '') || '',
          municipio: input.endereco.municipio || '',
          unidadeFederativa: input.endereco.unidadeFederativa || '',
        } : {
          tipoLogradouro: 'RUA',
          logradouro: '',
          numero: '',
          bairro: '',
          cep: '',
          municipio: '',
          unidadeFederativa: '',
        },
      })
    );
    return {};
  }
}

const step = async <T,>(
  progressMessage: string,
  errorMessage: string,
  action: () => Promise<T>
) => {
  try {
    return await action();
  } catch (error) {
    throw new Error(`${errorMessage} ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
};