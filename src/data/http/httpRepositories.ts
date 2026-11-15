import { Appointment, NewAppointment } from '../../domain/entities/appointment';
import { Service, Slot } from '../../domain/entities/service';
import {
  AccountProfile,
  AppointmentRepository,
  AuthenticationRepository,
  AuthenticationResult,
  ServiceRepository,
} from '../../domain/repositories';
import { fromISO } from '../../core/utils/dates';
import { HttpClient, HttpError } from './HttpClient';
import { AuthApiClient } from './AuthApiClient';
import { getAccessToken, getRefreshToken, setTokens, clearTokens, setLojistaAccessToken, getLojistaAccessToken } from './accessToken';

interface GradeDto {
  idGrade: string;
  lojista: string;
  estabelecimento: string;
  servico: string;
  segundaFeira: boolean;
  tercaFeira: boolean;
  quartaFeira: boolean;
  quintaFeira: boolean;
  sextaFeira: boolean;
  sabado: boolean;
  domingo: boolean;
  dataInicioVigor: string;
  dataFimVigor?: string;
  ativo: boolean;
}

interface AvailabilityDto {
  data: string;
  horas: { gradeHorario: string; hora: string }[];
}

interface AppointmentDto {
  idAgendamento: string;
  lojista: string;
  estabelecimento: string;
  servico: string;
  cliente: string;
  statusAgendamento: 'EFETUADO' | 'AGENDADO' | 'CANCELADO' | 'NAO_COMPARECEU';
  dataAgendamento: string;
  horaAgendamento: string;
}

interface LoginResponseDto {
  token: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Validates UUID format to prevent path traversal / SSRF in API calls */
const isValidUUID = (id: string): boolean => UUID_PATTERN.test(id);

const asIsoDate = (date: string) => {
  const [day, month, year] = date.split('/');
  if (!day || !month || !year) throw new Error(`Data inválida recebida da API: ${date}`);
  return `${year}-${month}-${day}`;
};

const asApiDate = (date: string) => {
  const parsed = fromISO(date);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(parsed.getDate())}/${pad(parsed.getMonth() + 1)}/${parsed.getFullYear()}`;
};

const mapGrade = (grade: GradeDto): Service => {
  const weekdays = [
    grade.domingo,
    grade.segundaFeira,
    grade.tercaFeira,
    grade.quartaFeira,
    grade.quintaFeira,
    grade.sextaFeira,
    grade.sabado,
  ];
  const closedWeekdays = weekdays.flatMap((enabled, weekday) => (enabled ? [] : [weekday]));
  return {
    id: grade.idGrade,
    name: `Serviço ${grade.servico.slice(0, 8)}`,
    place: `Estabelecimento ${grade.estabelecimento.slice(0, 8)}`,
    lojista: grade.lojista,
    estabelecimento: grade.estabelecimento,
    servico: grade.servico,
    ativo: grade.ativo,
    diasAtendimento: weekdays.flatMap((enabled, weekday) => (enabled ? [weekday === 0 ? 7 : weekday] : [])),
    dataInicioVigor: asIsoDate(grade.dataInicioVigor),
    dataFimVigor: grade.dataFimVigor ? asIsoDate(grade.dataFimVigor) : undefined,
    closedWeekdays,
  };
};

const mapAppointment = (appointment: AppointmentDto): Appointment => ({
  id: appointment.idAgendamento,
  title: `Serviço ${appointment.servico.slice(0, 8)}`,
  place: `Unidade ${appointment.estabelecimento.slice(0, 8)}`,
  date: asIsoDate(appointment.dataAgendamento),
  time: appointment.horaAgendamento.slice(0, 5),
  status: ({
    EFETUADO: 'confirmed',
    AGENDADO: 'reminder',
    CANCELADO: 'cancelled',
    NAO_COMPARECEU: 'missed',
  } as const)[appointment.statusAgendamento],
  clientId: appointment.cliente,
  serviceId: appointment.servico,
  establishmentId: appointment.estabelecimento,
  lojistaId: appointment.lojista,
});

/** Repositório de autenticação que usa o usuario-service (IdP) centralizado */
export class HttpAuthenticationRepository implements AuthenticationRepository {
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
      getRefreshToken,
      setTokens,
      clearTokens
    );
  }

  async login(
    login: string,
    password: string,
    knownClientId?: string,
    knownClientName?: string
  ): Promise<AuthenticationResult> {
    const normalizedLogin = login.trim();

    // 1. Login no IdP centralizado (usuario-service)
    const authResponse = await this.authClient.login(normalizedLogin, password);
    const accessToken = authResponse.accessToken;
    const refreshToken = authResponse.refreshToken;
    const user = authResponse.user;

    // 2. Descobre perfis disponíveis (cliente e/ou lojista)
    const profiles: AccountProfile[] = [];

    // Se o login é um UUID, assume que é cliente direto
    if (UUID_PATTERN.test(normalizedLogin)) {
      return {
        token: accessToken,
        refreshToken,
        profiles: [{ kind: 'cliente', id: normalizedLogin, name: normalizedLogin.slice(0, 8) }],
      };
    }

    const email = normalizedLogin.toLowerCase();

    // Busca perfil de cliente (se existir)
    // Se knownClientId/knownClientName forem fornecidos, usa-os diretamente (pós-registro)
    if (knownClientId && knownClientName) {
      profiles.push({ kind: 'cliente', id: knownClientId, name: knownClientName });
    } else {
      try {
        const clientHttp = new HttpClient(this.clientApiUrl, () => accessToken);
        const clients = await clientHttp.get<{ idCliente: string; nome: string; email: string }[]>(
          `/clientes?email=${encodeURIComponent(email)}`
        );
        const client = clients.find((item) => item.email.toLowerCase() === email);
        if (client) {
          profiles.push({ kind: 'cliente', id: client.idCliente, name: client.nome });
        }
      } catch (error) {
        if (!(error instanceof HttpError && error.status === 404)) throw error;
      }
    }

    // Busca perfil de lojista (se existir)
    try {
      const lojistaHttp = new HttpClient(this.lojistaApiUrl, () => accessToken);
      const lojistas = await lojistaHttp.get<{ idLojista: string; nome: string; email: string }[]>(
        `/lojistas?email=${encodeURIComponent(email)}`
      );
      const lojista = lojistas.find((item) => item.email.toLowerCase() === email);
      if (lojista) {
        profiles.push({ kind: 'lojista', id: lojista.idLojista, name: lojista.nome });
      }
    } catch (error) {
      if (!(error instanceof HttpError && error.status === 404)) throw error;
    }

    if (profiles.length === 0) {
      throw new Error('Não foi encontrado um perfil de Cliente ou Lojista para este login.');
    }

    const hasLojistaProfile = profiles.some((p) => p.kind === 'lojista');

    return {
      token: accessToken,
      refreshToken,
      profiles,
      lojistaToken: hasLojistaProfile ? accessToken : undefined,
    };
  }

  /** Busca cliente por ID (para enriquecer agenda do lojista) */
  async getClientById(clientId: string, accessToken: string): Promise<{ idCliente: string; nome: string; cpf: string; email: string; endereco?: any; ativo: boolean } | null> {
    if (!isValidUUID(clientId)) throw new Error('Invalid client ID format');
    try {
      const clientHttp = new HttpClient(this.clientApiUrl, () => accessToken);
      const client = await clientHttp.get<{ idCliente: string; nome: string; cpf: string; email: string; endereco?: any; ativo: boolean }>(
        `/clientes/${clientId}`
      );
      return client ?? null;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  /** Busca estabelecimento por ID (para enriquecer serviços na tela de agendamento) */
  async getEstablishmentById(establishmentId: string, lojistaToken: string): Promise<{ idEstabelecimento: string; nome: string; cnpj: string; email: string; endereco: any; ativo: boolean; logoKey?: string } | null> {
    if (!isValidUUID(establishmentId)) throw new Error('Invalid establishment ID format');
    try {
      const lojistaHttp = new HttpClient(this.lojistaApiUrl, () => lojistaToken);
      const establishment = await lojistaHttp.get<{ idEstabelecimento: string; nome: string; cnpj: string; email: string; endereco: any; ativo: boolean; logoKey?: string }>(
        `/estabelecimentos/${establishmentId}`
      );
      return establishment ?? null;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  /** Busca serviço por ID (para enriquecer serviços na tela de agendamento) */
  async getServiceById(serviceId: string, lojistaToken: string): Promise<{ idServico: string; nome: string; preco: number | null; descricao: string; estabelecimentos: string[]; ativo: boolean } | null> {
    if (!isValidUUID(serviceId)) throw new Error('Invalid service ID format');
    try {
      const lojistaHttp = new HttpClient(this.lojistaApiUrl, () => lojistaToken);
      const service = await lojistaHttp.get<{ idServico: string; nome: string; preco: number | null; descricao: string; estabelecimentos: string[]; ativo: boolean }>(
        `/servicos/${serviceId}`
      );
      return service ?? null;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  /** Busca lojista por ID (para obter logo e nome) */
  async getLojistaById(lojistaId: string, accessToken: string): Promise<{ idLojista: string; nome: string; logoKey: string; cnpj: string; email: string; endereco?: any; ativo: boolean } | null> {
    if (!isValidUUID(lojistaId)) throw new Error('Invalid lojista ID format');
    try {
      const lojistaHttp = new HttpClient(this.lojistaApiUrl, () => accessToken);
      const lojista = await lojistaHttp.get<{ idLojista: string; nome: string; logoKey: string; cnpj: string; email: string; endereco?: any; ativo: boolean }>(
        `/lojistas/${lojistaId}`
      );
      return lojista ?? null;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  /** Atualiza dados do cliente (PATCH parcial) */
  async updateClient(clientId: string, accessToken: string, data: Partial<{ nome: string; cpf: string; email: string; endereco: any }>): Promise<{ idCliente: string; nome: string; cpf: string; email: string; endereco?: any; ativo: boolean } | null> {
    if (!isValidUUID(clientId)) throw new Error('Invalid client ID format');
    try {
      const clientHttp = new HttpClient(this.clientApiUrl, () => accessToken);
      const updated = await clientHttp.patch<{ idCliente: string; nome: string; cpf: string; email: string; endereco?: any; ativo: boolean }>(
        `/clientes/${clientId}`,
        data
      );
      return updated ?? null;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  /** Atualiza dados do lojista (PATCH parcial) */
  async updateLojista(lojistaId: string, accessToken: string, data: Partial<{ nome: string; logoKey: string; cnpj: string; email: string; endereco: any }>): Promise<{ idLojista: string; nome: string; logoKey: string; cnpj: string; email: string; endereco?: any; ativo: boolean } | null> {
    if (!isValidUUID(lojistaId)) throw new Error('Invalid lojista ID format');
    try {
      const lojistaHttp = new HttpClient(this.lojistaApiUrl, () => accessToken);
      const updated = await lojistaHttp.patch<{ idLojista: string; nome: string; logoKey: string; cnpj: string; email: string; endereco?: any; ativo: boolean }>(
        `/lojistas/${lojistaId}`,
        data
      );
      return updated ?? null;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  /** Refresh do token via IdP */
  async refresh(): Promise<string> {
    const response = await this.authClient.refresh();
    return response.accessToken;
  }

  /** Logout no IdP */
  async logout(): Promise<void> {
    await this.authClient.logout();
  }
}

export class HttpAppointmentRepository implements AppointmentRepository {
  constructor(private readonly http: HttpClient) {}

  async getForClient(clientId: string) {
    // Novo endpoint dedicado por cliente (path param)
    try {
      return (await this.http.get<AppointmentDto[]>(`/agendamentos/cliente/${encodeURIComponent(clientId)}`))
        .map(mapAppointment)
        .sort((left, right) => (left.date + left.time).localeCompare(right.date + right.time));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return [];
      throw error;
    }
  }

  async getForLojista(lojistaId: string) {
    // Novo endpoint dedicado por lojista (path param) - backend usa 'lojista' (com J)
    try {
      return (await this.http.get<AppointmentDto[]>(`/agendamentos/lojista/${encodeURIComponent(lojistaId)}`))
        .map(mapAppointment)
        .sort((left, right) => (left.date + left.time).localeCompare(right.date + right.time));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return [];
      throw error;
    }
  }

  async create(input: NewAppointment): Promise<Appointment> {
    // Defense in depth: envia o clientId esperado no header para o backend validar ownership
    const headers: Record<string, string> = {};
    if (input.cliente) {
      headers['X-Expected-Client-Id'] = input.cliente;
    }
    await this.http.post('/agendamentos', {
      lojista: input.lojista,
      estabelecimento: input.estabelecimento,
      servico: input.servico,
      cliente: input.cliente,
      gradeHorario: input.gradeHorario,
      dataAgendamento: asApiDate(input.date),
      horaAgendamento: input.time,
    }, headers);
    return {
      id: `${input.gradeHorario}-${input.date}-${input.time}`,
      title: `Serviço ${input.servico.slice(0, 8)}`,
      place: `Estabelecimento ${input.estabelecimento.slice(0, 8)}`,
      date: input.date,
      time: input.time,
      status: 'reminder',
    };
  }

  async cancel(appointmentId: string): Promise<void> {
    if (!isValidUUID(appointmentId)) throw new Error('Invalid appointment ID format');
    // Usa PATCH para alterar status para CANCELADO (requer PERM_AGENDAMENTO_WRITE)
    // O backend DEVE validar ownership do agendamento
    await this.http.patch(`/agendamentos/${appointmentId}`, {
      statusAgendamento: 'CANCELADO',
    });
  }
}

export class HttpServiceRepository implements ServiceRepository {
  constructor(private readonly http: HttpClient) {}

  async getAll() {
    let grades: GradeDto[];
    try {
      grades = await this.http.get<GradeDto[]>('/grades?statusAgendamento=TODOS');
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return [];
      throw error;
    }
    return grades.map(mapGrade).filter((grade) => grade.ativo);
  }

  async getById(id: string) {
    const service = (await this.getAll()).find((item) => item.id === id);
    if (!service) throw new Error('A grade selecionada não foi encontrada ou está inativa.');
    return service;
  }

  async getAvailableSlots(serviceId: string, dateISO: string): Promise<Slot[]> {
    const service = await this.getById(serviceId);
    const dates = await this.http.post<AvailabilityDto[]>('/agendamentos/datas-horarios-disponiveis', {
      lojista: service.lojista,
      estabelecimento: service.estabelecimento,
      servico: service.servico,
    });
    const selected = dates.find((item) => asIsoDate(item.data) === dateISO);
    return (selected?.horas ?? [])
      .map((slot) => ({
        gradeHorario: slot.gradeHorario,
        time: slot.hora.slice(0, 5),
        available: true,
      }))
      .sort((a, b) => a.time.localeCompare(b.time));
  }
}