const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const WEEKDAYS_TITLE = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export const addDays = (d: Date, n: number) => {
  const r = startOfDay(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Segunda-feira da semana de `d`. */
export const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

export const weekdayShort = (d: Date) => WEEKDAYS[d.getDay()];

export const monthYearLabel = (d: Date) => `${MONTHS[d.getMonth()].replace(/^./, (c) => c.toUpperCase())} de ${d.getFullYear()}`;

/** "Qui, 15 out" */
export const formatShort = (d: Date) => `${WEEKDAYS_TITLE[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
