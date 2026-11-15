import { Appointment, NewAppointment } from '../entities/appointment';
import { Service, Slot } from '../entities/service';

/** Contratos que o domínio exige. Quem implementa (mock, HTTP...) fica na camada data. */
export interface AppointmentRepository {
  getForClient(clientId: string): Promise<Appointment[]>;
  getForLojista(lojistaId: string): Promise<Appointment[]>;
  create(input: NewAppointment): Promise<Appointment>;
  cancel(appointmentId: string): Promise<void>;
}

export interface ServiceRepository {
  getAll(): Promise<Service[]>;
  getById(id: string): Promise<Service>;
  getAvailableSlots(serviceId: string, dateISO: string): Promise<Slot[]>;
}

export interface AuthenticationRepository {
  login(login: string, password: string, knownClientId?: string, knownClientName?: string): Promise<AuthenticationResult>;
  getClientById(clientId: string, accessToken: string): Promise<{ idCliente: string; nome: string; cpf: string; email: string; endereco?: any; ativo: boolean } | null>;
  updateClient(clientId: string, accessToken: string, data: Partial<{ nome: string; cpf: string; email: string; endereco: any }>): Promise<{ idCliente: string; nome: string; cpf: string; email: string; endereco?: any; ativo: boolean } | null>;
  getEstablishmentById(establishmentId: string, lojistaToken: string): Promise<{ idEstabelecimento: string; nome: string; cnpj: string; email: string; endereco: any; ativo: boolean; logoKey?: string } | null>;
  getServiceById(serviceId: string, lojistaToken: string): Promise<{ idServico: string; nome: string; preco: number | null; descricao: string; estabelecimentos: string[]; ativo: boolean } | null>;
  getLojistaById(lojistaId: string, accessToken: string): Promise<{ idLojista: string; nome: string; logoKey: string; cnpj: string; email: string; endereco?: any; ativo: boolean } | null>;
  updateLojista(lojistaId: string, accessToken: string, data: Partial<{ nome: string; logoKey: string; cnpj: string; email: string; endereco: any }>): Promise<{ idLojista: string; nome: string; logoKey: string; cnpj: string; email: string; endereco?: any; ativo: boolean } | null>;
}

export type ProfileKind = 'cliente' | 'lojista';

export interface AccountProfile {
  kind: ProfileKind;
  id: string;
  name: string;
}

export interface AuthenticationResult {
  token: string;
  refreshToken?: string;
  profiles: AccountProfile[];
  lojistaToken?: string;
}

export type RegistrationKind = 'cliente' | 'lojista';

export interface RegistrationAddress {
  tipoLogradouro: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cep: string;
  municipio: string;
  unidadeFederativa: string;
}

export interface RegistrationInput {
  kind: RegistrationKind;
  nome: string;
  email: string;
  password: string;
  documento: string;
  endereco?: RegistrationAddress;
  logoKey?: string; // Obrigatório para lojista (chave do logotipo, ex: "/logo.png")
}

export interface RegistrationRepository {
  register(input: RegistrationInput, onProgress: (message: string) => void): Promise<{ clientId?: string }>;
}

export type BusinessAddress = RegistrationAddress;

export interface Establishment {
  id: string;
  lojistaId: string;
  name: string;
  cnpj: string;
  email: string;
  address: BusinessAddress;
  active: boolean;
  logoKey?: string; // Chave do logotipo (ex: "/logo.png")
}

export interface EstablishmentInput {
  name: string;
  cnpj: string;
  email: string;
  address: BusinessAddress;
  logoKey?: string; // Chave do logotipo (ex: "/logo.png")
}

export interface OfferedService {
  id: string;
  name: string;
  price: number | null;
  description: string;
  establishmentIds: string[];
  active: boolean;
}

export interface OfferedServiceInput {
  name: string;
  price: number | null;
  description: string;
  establishmentIds: string[];
}

export interface AvailabilityGrid {
  id: string;
  lojistaId: string;
  establishmentId: string;
  serviceId: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  capacity: number;
  periodDays: number;
  startDate: string;
  endDate?: string;
  active: boolean;
}

export interface AvailabilityGridInput {
  establishmentId: string;
  serviceId: string;
  weekdays: number[];
  startTime: string;
  endTime: string;
  intervalMinutes: number;
  capacity: number;
  periodDays: number;
  startDate: string;
  endDate?: string;
}

export interface LojistaManagementRepository {
  listEstablishments(lojistaId: string): Promise<Establishment[]>;
  saveEstablishment(lojistaId: string, input: EstablishmentInput, id?: string): Promise<Establishment>;
  deleteEstablishment(id: string): Promise<void>;
  listServices(establishmentIds: string[]): Promise<OfferedService[]>;
  saveService(input: OfferedServiceInput, id?: string): Promise<OfferedService>;
  deleteService(id: string): Promise<void>;
  listGrids(lojistaId: string): Promise<AvailabilityGrid[]>;
  saveGrid(lojistaId: string, input: AvailabilityGridInput, id?: string): Promise<AvailabilityGrid>;
  deleteGrid(id: string): Promise<void>;
}