export interface Service {
  id: string;
  name: string;
  place: string;
  lojista: string;
  estabelecimento: string;
  servico: string;
  ativo: boolean;
  diasAtendimento: number[];
  dataInicioVigor: string;
  dataFimVigor?: string;
  durationMin?: number;
  price?: number;
  closedWeekdays: number[]; // 0 = domingo
  enrichedName?: string;
  enrichedPlace?: string;
}

export interface Slot {
  gradeHorario: string;
  time: string; // HH:mm
  available: boolean;
}

export const isOpenOn = (service: Service, date: Date) => !service.closedWeekdays.includes(date.getDay());
