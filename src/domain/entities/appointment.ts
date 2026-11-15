export type AppointmentStatus = 'confirmed' | 'reminder' | 'cancelled' | 'missed';

export interface Appointment {
  id: string;
  title: string;
  place: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  status: AppointmentStatus;
  clientId?: string;
  serviceId?: string;
  establishmentId?: string;
  lojistaId?: string;
  lojistaLogo?: string;
  lojistaName?: string;
}

export interface NewAppointment {
  lojista: string;
  estabelecimento: string;
  servico: string;
  cliente: string;
  gradeHorario: string;
  date: string;
  time: string;
}

export interface AgendaSummary {
  total: number;
  places: number;
}

export const getAppointmentDates = (list: Appointment[]): string[] =>
  [...new Set(list.map((appointment) => appointment.date))].sort();

export const getUpcomingAppointmentDates = (list: Appointment[], fromDate: string): string[] =>
  [...new Set(list
    .filter((appointment) => appointment.date >= fromDate)
    .map((appointment) => appointment.date))]
    .sort();

export const summarizeAppointments = (list: Appointment[]): AgendaSummary => ({
  total: list.length,
  places: new Set(list.map((a) => a.place)).size,
});