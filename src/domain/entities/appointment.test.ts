import { describe, expect, it } from 'vitest';
import { Appointment, getAppointmentDates, getUpcomingAppointmentDates } from './appointment';

describe('getAppointmentDates', () => {
  it('returns distinct appointment dates in chronological order', () => {
    const appointments: Appointment[] = [
      { id: '1', title: 'Revisão', place: 'Hontech', date: '2026-10-19', time: '12:00', status: 'reminder' },
      { id: '2', title: 'Revisão', place: 'Hontech', date: '2026-10-20', time: '08:00', status: 'reminder' },
      { id: '3', title: 'Revisão', place: 'Hontech', date: '2026-10-19', time: '13:00', status: 'reminder' },
    ];

    expect(getAppointmentDates(appointments)).toEqual(['2026-10-19', '2026-10-20']);
  });

  describe('getUpcomingAppointmentDates', () => {
    it('returns distinct existing dates from today and excludes past dates', () => {
      const appointments: Appointment[] = [
        { id: '1', title: 'Corte', place: 'Oficina', date: '2026-10-20', time: '09:00', status: 'reminder' },
        { id: '2', title: 'Corte', place: 'Oficina', date: '2026-10-21', time: '09:00', status: 'reminder' },
        { id: '3', title: 'Corte', place: 'Oficina', date: '2026-10-23', time: '09:00', status: 'reminder' },
        { id: '4', title: 'Corte', place: 'Oficina', date: '2026-10-23', time: '10:00', status: 'reminder' },
      ];

      expect(getUpcomingAppointmentDates(appointments, '2026-10-21')).toEqual([
        '2026-10-21',
        '2026-10-23',
      ]);
    });

    it('returns no dates when there are no future appointments', () => {
      const appointments: Appointment[] = [
        { id: '1', title: 'Corte', place: 'Oficina', date: '2026-10-20', time: '09:00', status: 'reminder' },
      ];

      expect(getUpcomingAppointmentDates(appointments, '2026-10-21')).toEqual([]);
    });
  });

  it('returns no dates when the API has no appointments', () => {
    expect(getAppointmentDates([])).toEqual([]);
  });
});
