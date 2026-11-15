import { fromISO } from '../../core/utils/dates';
import { isOpenOn, Service } from '../entities/service';
import {
  AppointmentRepository,
  AuthenticationRepository,
  AvailabilityGridInput,
  EstablishmentInput,
  LojistaManagementRepository,
  OfferedServiceInput,
  RegistrationInput,
  RegistrationRepository,
  ServiceRepository,
} from '../repositories';

export class GetAppointments {
  constructor(private readonly appointments: AppointmentRepository) {}
  execute(clientId: string) {
    return this.appointments.getForClient(clientId);
  }
}

export class GetAppointmentsForLojista {
  constructor(private readonly appointments: AppointmentRepository) {}
  execute(lojistaId: string) {
    return this.appointments.getForLojista(lojistaId);
  }
}

export class GetServices {
  constructor(private readonly services: ServiceRepository) {}
  execute() {
    return this.services.getAll();
  }
}

export class GetService {
  constructor(private readonly services: ServiceRepository) {}
  execute(id: string) {
    return this.services.getById(id);
  }
}

export class GetAvailableSlots {
  constructor(private readonly services: ServiceRepository) {}
  execute(serviceId: string, dateISO: string) {
    return this.services.getAvailableSlots(serviceId, dateISO);
  }
}

export class CreateAppointment {
  constructor(private readonly appointments: AppointmentRepository) {}

  async execute(service: Service, dateISO: string, time: string, clientId: string, gradeHorario: string) {
    // Regra de negócio: não agenda em dia fechado.
    if (!isOpenOn(service, fromISO(dateISO))) {
      throw new Error('Nesse dia não tem atendimento. Escolhe outra data?');
    }
    return this.appointments.create({
      lojista: service.lojista,
      estabelecimento: service.estabelecimento,
      servico: service.servico,
      cliente: clientId,
      gradeHorario,
      date: dateISO,
      time,
    });
  }
}

export class CancelAppointment {
  constructor(private readonly appointments: AppointmentRepository) {}
  execute(appointmentId: string) {
    return this.appointments.cancel(appointmentId);
  }
}

export class Login {
  constructor(private readonly authentication: AuthenticationRepository) {}
  execute(login: string, password: string, knownClientId?: string, knownClientName?: string) {
    return this.authentication.login(login, password, knownClientId, knownClientName);
  }
}

export class RegisterAccount {
  constructor(private readonly registration: RegistrationRepository) {}
  execute(input: RegistrationInput, onProgress: (message: string) => void) {
    return this.registration.register(input, onProgress);
  }
}

export class ManageLojistaConfiguration {
  constructor(private readonly management: LojistaManagementRepository) {}

  listEstablishments(lojistaId: string) {
    return this.management.listEstablishments(lojistaId);
  }

  saveEstablishment(lojistaId: string, input: EstablishmentInput, id?: string) {
    return this.management.saveEstablishment(lojistaId, input, id);
  }

  deleteEstablishment(id: string) {
    return this.management.deleteEstablishment(id);
  }

  listServices(establishmentIds: string[]) {
    return this.management.listServices(establishmentIds);
  }

  saveService(input: OfferedServiceInput, id?: string) {
    return this.management.saveService(input, id);
  }

  deleteService(id: string) {
    return this.management.deleteService(id);
  }

  listGrids(lojistaId: string) {
    return this.management.listGrids(lojistaId);
  }

  saveGrid(lojistaId: string, input: AvailabilityGridInput, id?: string) {
    return this.management.saveGrid(lojistaId, input, id);
  }

  deleteGrid(id: string) {
    return this.management.deleteGrid(id);
  }
}

export class UpdateClientProfile {
  constructor(private readonly authentication: AuthenticationRepository) {}

  async execute(clientId: string, accessToken: string, data: Partial<{ nome: string; cpf: string; email: string; endereco: any }>) {
    return this.authentication.updateClient(clientId, accessToken, data);
  }
}

export class UpdateLojistaProfile {
  constructor(private readonly authentication: AuthenticationRepository) {}

  async execute(lojistaId: string, accessToken: string, data: Partial<{ nome: string; logoKey: string; cnpj: string; email: string; endereco: any }>) {
    return this.authentication.updateLojista(lojistaId, accessToken, data);
  }
}