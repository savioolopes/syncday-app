import { Appointment, NewAppointment } from '../../domain/entities/appointment';
import { Service, Slot } from '../../domain/entities/service';
import {
  AppointmentRepository,
  AuthenticationResult,
  AuthenticationRepository,
  RegistrationInput,
  RegistrationRepository,
  ServiceRepository,
  LojistaManagementRepository,
  EstablishmentInput,
  OfferedServiceInput,
  AvailabilityGridInput,
} from '../../domain/repositories';
import { addDays, startOfWeek, toISO } from '../../core/utils/dates';

const wait = (ms = 350) => new Promise((r) => setTimeout(r, ms));

export class MockAuthenticationRepository implements AuthenticationRepository {
  async login(_login: string, _password: string): Promise<AuthenticationResult> {
    throw new Error('Configure EXPO_PUBLIC_API_URL para autenticar no backend.');
  }

  async getClientById(_clientId: string, _accessToken: string): Promise<{ idCliente: string; nome: string; cpf: string; email: string; endereco?: any; ativo: boolean } | null> {
    throw new Error('Configure EXPO_PUBLIC_API_URL para buscar cliente no backend.');
  }

  async getEstablishmentById(_establishmentId: string, _lojistaToken: string): Promise<{ idEstabelecimento: string; nome: string; cnpj: string; email: string; endereco: any; ativo: boolean } | null> {
    throw new Error('Configure EXPO_PUBLIC_API_URL para buscar estabelecimento no backend.');
  }

  async getServiceById(_serviceId: string, _lojistaToken: string): Promise<{ idServico: string; nome: string; preco: number | null; descricao: string; estabelecimentos: string[]; ativo: boolean } | null> {
    throw new Error('Configure EXPO_PUBLIC_API_URL para buscar serviço no backend.');
  }

  async getLojistaById(_lojistaId: string, _accessToken: string): Promise<{ idLojista: string; nome: string; logoKey: string; cnpj: string; email: string; endereco?: any; ativo: boolean } | null> {
    throw new Error('Configure EXPO_PUBLIC_API_URL para buscar lojista no backend.');
  }

  async updateClient(_clientId: string, _accessToken: string, _data: Partial<{ nome: string; cpf: string; email: string; endereco: any }>): Promise<{ idCliente: string; nome: string; cpf: string; email: string; endereco?: any; ativo: boolean } | null> {
    throw new Error('Configure EXPO_PUBLIC_API_URL para atualizar cliente no backend.');
  }

  async updateLojista(_lojistaId: string, _accessToken: string, _data: Partial<{ nome: string; logoKey: string; cnpj: string; email: string; endereco: any }>): Promise<{ idLojista: string; nome: string; logoKey: string; cnpj: string; email: string; endereco?: any; ativo: boolean } | null> {
    throw new Error('Configure EXPO_PUBLIC_API_URL para atualizar lojista no backend.');
  }
}

export class MockRegistrationRepository implements RegistrationRepository {
  async register(_input: RegistrationInput, _onProgress: (message: string) => void): Promise<{ clientId?: string }> {
    throw new Error('Configure EXPO_PUBLIC_API_URL e as APIs de Cliente e Lojista para cadastrar uma conta.');
  }
}

export class MockAppointmentRepository implements AppointmentRepository {
  private created: Appointment[] = [];

  async getForClient(_clientId: string): Promise<Appointment[]> {
    await wait();
    const monday = startOfWeek(new Date());
    const day = (i: number) => toISO(addDays(monday, i));
    const base: Appointment[] = [
      { id: 'a1', title: 'Revisão do carro', place: 'Oficina Centro Auto', date: day(2), time: '09:00', status: 'confirmed' },
      { id: 'a2', title: 'Consulta clínica geral', place: 'Clínica Vida Plena', date: day(2), time: '14:30', status: 'confirmed' },
      { id: 'a3', title: 'Corte de cabelo', place: 'Barbearia do Bairro', date: day(2), time: '18:15', status: 'reminder' },
    ];
    return [...base, ...this.created].sort((a, b) =>
      (a.date + a.time).localeCompare(b.date + b.time)
    );
  }

  async getForLojista(_lojistaId: string): Promise<Appointment[]> {
    await wait();
    return [];
  }

  async create(input: NewAppointment): Promise<Appointment> {
    await wait(500);
    const appt: Appointment = {
      id: `n${Date.now()}`,
      title: `Serviço ${input.servico.slice(0, 8)}`,
      place: `Estabelecimento ${input.estabelecimento.slice(0, 8)}`,
      date: input.date,
      time: input.time,
      status: 'reminder',
    };
    this.created = [...this.created, appt];
    return appt;
  }

  async cancel(appointmentId: string): Promise<void> {
    await wait(300);
    this.created = this.created.filter((a) => a.id !== appointmentId);
  }
}

export class MockServiceRepository implements ServiceRepository {
  async getAll(): Promise<Service[]> {
    await wait(100);
    return [{
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Corte de cabelo',
      place: 'Barbearia do Bairro',
      lojista: '00000000-0000-0000-0000-000000000002',
      estabelecimento: '00000000-0000-0000-0000-000000000003',
      servico: '00000000-0000-0000-0000-000000000004',
      ativo: true,
      diasAtendimento: [1, 2, 3, 4, 5],
      dataInicioVigor: toISO(new Date()),
      closedWeekdays: [0, 6],
      durationMin: 30,
      price: 45,
    }];
  }

  async getById(id: string): Promise<Service> {
    const service = (await this.getAll()).find((item) => item.id === id);
    if (!service) throw new Error('Serviço não encontrado.');
    return service;
  }

  async getAvailableSlots(_serviceId: string, _dateISO: string): Promise<Slot[]> {
    await wait(250);
    return ['09:00', '10:00', '11:00', '14:00', '14:30', '15:30'].map((time, index) => ({
      gradeHorario: `00000000-0000-0000-0000-${String(index + 1).padStart(12, '0')}`,
      time,
      available: time !== '09:00',
    }));
  }
}

export class MockLojistaManagementRepository implements LojistaManagementRepository {
  private unavailable(): never {
    throw new Error('Configure EXPO_PUBLIC_API_URL e a API de Lojista para gerenciar o atendimento.');
  }

  async listEstablishments(_lojistaId: string) { return this.unavailable(); }
  async saveEstablishment(_lojistaId: string, _input: EstablishmentInput, _id?: string) { return this.unavailable(); }
  async deleteEstablishment(_id: string) { return this.unavailable(); }
  async listServices(_establishmentIds: string[]) { return this.unavailable(); }
  async saveService(_input: OfferedServiceInput, _id?: string) { return this.unavailable(); }
  async deleteService(_id: string) { return this.unavailable(); }
  async listGrids(_lojistaId: string) { return this.unavailable(); }
  async saveGrid(_lojistaId: string, _input: AvailabilityGridInput, _id?: string) { return this.unavailable(); }
  async deleteGrid(_id: string) { return this.unavailable(); }
}