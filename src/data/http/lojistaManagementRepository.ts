import {
  AvailabilityGrid,
  AvailabilityGridInput,
  Establishment,
  EstablishmentInput,
  LojistaManagementRepository,
  OfferedService,
  OfferedServiceInput,
} from '../../domain/repositories';
import { HttpClient, HttpError } from './HttpClient';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_PATTERN.test(id);

interface AddressDto {
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  cep: string;
  municipio: string;
  unidadeFederativa: string;
}

interface EstablishmentDto {
  idEstabelecimento: string;
  idLojista: string;
  nome: string;
  cnpj: string;
  email: string;
  endereco: AddressDto;
  ativo: boolean;
  logoKey?: string;
}

interface ServiceDto {
  idServico: string;
  nome: string;
  preco: number | null;
  descricao?: string | null;
  idEstabelecimentos: string[];
  ativo: boolean;
}

interface GridDto {
  idGrade: string;
  idLojista: string;
  idEstabelecimento: string | null;
  idServico: string | null;
  segundaFeira: boolean;
  tercaFeira: boolean;
  quartaFeira: boolean;
  quintaFeira: boolean;
  sextaFeira: boolean;
  sabado: boolean;
  domingo: boolean;
  horaInicio: string;
  horaFim: string;
  fracao: number;
  capacidadeLimite: number;
  periodo: number;
  dataInicioVigor: string;
  dataFimVigor?: string | null;
  ativo: boolean;
  horas?: { diaSemana: string; gradeHorarios: { idGradeHorario: string; hora: string; capacidade: number; ativo: boolean }[] }[];
}

const mapEstablishment = (item: EstablishmentDto): Establishment => ({
  id: item.idEstabelecimento,
  lojistaId: item.idLojista,
  name: item.nome,
  cnpj: item.cnpj,
  email: item.email,
  address: {
    tipoLogradouro: item.endereco.tipoLogradouro,
    logradouro: item.endereco.logradouro,
    numero: item.endereco.numero,
    complemento: item.endereco.complemento ?? '',
    bairro: item.endereco.bairro,
    cep: item.endereco.cep,
    municipio: item.endereco.municipio,
    unidadeFederativa: item.endereco.unidadeFederativa,
  },
  active: item.ativo,
  logoKey: item.logoKey,
});

const mapService = (item: ServiceDto): OfferedService => ({
  id: item.idServico,
  name: item.nome,
  price: item.preco,
  description: item.descricao ?? '',
  establishmentIds: item.idEstabelecimentos ?? [],
  active: item.ativo,
});

const apiDateToIso = (value: string) => {
  const [day, month, year] = value.split('/');
  if (!day || !month || !year) throw new Error(`Data inválida recebida da API: ${value}`);
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

const isoDateToApi = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Use a data no formato AAAA-MM-DD: ${value}`);
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const mapGrid = (item: GridDto): AvailabilityGrid => ({
  id: item.idGrade,
  lojistaId: item.idLojista,
  establishmentId: item.idEstabelecimento ?? '',
  serviceId: item.idServico ?? '',
  weekdays: [
    item.domingo,
    item.segundaFeira,
    item.tercaFeira,
    item.quartaFeira,
    item.quintaFeira,
    item.sextaFeira,
    item.sabado,
  ].flatMap((enabled, weekday) => (enabled ? [weekday] : [])),
  startTime: item.horaInicio.slice(0, 5),
  endTime: item.horaFim.slice(0, 5),
  intervalMinutes: item.fracao,
  capacity: item.capacidadeLimite,
  periodDays: item.periodo,
  startDate: apiDateToIso(item.dataInicioVigor),
  endDate: item.dataFimVigor ? apiDateToIso(item.dataFimVigor) : undefined,
  active: item.ativo,
});

async function listOrEmpty<T>(request: () => Promise<T[]>): Promise<T[]> {
  try {
    return await request();
  } catch (error) {
    if (error instanceof HttpError && error.status === 404) return [];
    throw error;
  }
}

export class HttpLojistaManagementRepository implements LojistaManagementRepository {
  constructor(
    private readonly lojistaHttp: HttpClient,
    private readonly schedulingHttp: HttpClient
  ) {}

  async listEstablishments(lojistaId: string) {
    const items = await listOrEmpty(() => this.lojistaHttp.get<EstablishmentDto[]>('/estabelecimentos'));
    return items.filter((item) => item.idLojista === lojistaId).map(mapEstablishment);
  }

  async saveEstablishment(lojistaId: string, input: EstablishmentInput, id?: string) {
    if (!isValidUUID(lojistaId)) throw new Error('Invalid lojista ID format');
    if (id && !isValidUUID(id)) throw new Error('Invalid establishment ID format');
    const body = {
      idLojista: lojistaId,
      nome: input.name.trim(),
      cnpj: input.cnpj.replace(/\D/g, ''),
      email: input.email.trim(),
      endereco: {
        ...input.address,
        tipoLogradouro: input.address.tipoLogradouro,
        complemento: input.address.complemento?.trim() || null,
      },
      logoKey: input.logoKey?.trim() || '/logo.png',
    };
    const response = id
      ? await this.lojistaHttp.put<EstablishmentDto>(`/estabelecimentos/${id}`, body)
      : await this.lojistaHttp.post<EstablishmentDto>('/estabelecimentos', body);
    return mapEstablishment(response);
  }

  deleteEstablishment(id: string) {
    if (!isValidUUID(id)) throw new Error('Invalid establishment ID format');
    return this.lojistaHttp.delete(`/estabelecimentos/${id}`);
  }

  async listServices(establishmentIds: string[]) {
    if (establishmentIds.length === 0) return [];
    const ownedIds = new Set(establishmentIds);
    const items = await listOrEmpty(() => this.lojistaHttp.get<ServiceDto[]>('/servicos'));
    return items
      .map(mapService)
      .filter((item) => item.establishmentIds.some((id) => ownedIds.has(id)));
  }

  async saveService(input: OfferedServiceInput, id?: string) {
    if (id && !isValidUUID(id)) throw new Error('Invalid service ID format');
    if (!input.establishmentIds.every(isValidUUID)) throw new Error('Invalid establishment ID format');
    const body = {
      nome: input.name.trim(),
      preco: input.price,
      descricao: input.description.trim() || null,
      idEstabelecimentos: input.establishmentIds,
    };
    const response = id
      ? await this.lojistaHttp.put<ServiceDto>(`/servicos/${id}`, body)
      : await this.lojistaHttp.post<ServiceDto>('/servicos', body);
    return mapService(response);
  }

  deleteService(id: string) {
    if (!isValidUUID(id)) throw new Error('Invalid service ID format');
    return this.lojistaHttp.delete(`/servicos/${id}`);
  }

  async listGrids(lojistaId: string) {
    const items = await listOrEmpty(() =>
      this.schedulingHttp.get<GridDto[]>('/grades?statusAgendamento=TODOS')
    );
    return items.filter((item) => item.idLojista === lojistaId).map(mapGrid);
  }

  async saveGrid(lojistaId: string, input: AvailabilityGridInput, id?: string) {
    if (!isValidUUID(lojistaId)) throw new Error('Invalid lojista ID format');
    if (!isValidUUID(input.establishmentId)) throw new Error('Invalid establishment ID format');
    if (!isValidUUID(input.serviceId)) throw new Error('Invalid service ID format');
    if (id && !isValidUUID(id)) throw new Error('Invalid grid ID format');
    const [domingo, segundaFeira, tercaFeira, quartaFeira, quintaFeira, sextaFeira, sabado] =
      Array.from({ length: 7 }, (_, weekday) => input.weekdays.includes(weekday));
    const body = {
      idLojista: lojistaId,
      idEstabelecimento: input.establishmentId,
      idServico: input.serviceId,
      domingo,
      segundaFeira,
      tercaFeira,
      quartaFeira,
      quintaFeira,
      sextaFeira,
      sabado,
      horaInicio: input.startTime,
      horaFim: input.endTime,
      fracao: input.intervalMinutes,
      capacidadeLimite: input.capacity,
      periodo: input.periodDays,
      dataInicioVigor: isoDateToApi(input.startDate),
      dataFimVigor: input.endDate ? isoDateToApi(input.endDate) : null,
    };
    const response = id
      ? await this.schedulingHttp.put<GridDto & { content?: GridDto }>(`/grades/${id}`, body)
      : await this.schedulingHttp.post<GridDto & { content?: GridDto }>('/grades', body);
    return mapGrid(response.content ?? response);
  }

  deleteGrid(id: string) {
    if (!isValidUUID(id)) throw new Error('Invalid grid ID format');
    return this.schedulingHttp.delete(`/grades/${id}`);
  }
}