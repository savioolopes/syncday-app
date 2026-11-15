import { useCallback, useEffect, useMemo, useState } from 'react';
import { fromISO, toISO } from '../../../core/utils/dates';
import { getUpcomingAppointmentDates } from '../../../domain/entities/appointment';
import { Appointment } from '../../../domain/entities/appointment';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { useApp } from '../../providers/AppProviders';
import { useSession } from '../../providers/SessionProvider';

export function useLojistaAgenda() {
  const { usecases } = useApp();
  const { session } = useSession();
  const lojistaProfile = session?.profiles.find((profile) => profile.kind === 'lojista');
  const [selectedDate, setSelectedDate] = useState(() => toISO(new Date()));
  const [clientNames, setClientNames] = useState<Record<string, string>>({});
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [establishmentNames, setEstablishmentNames] = useState<Record<string, string>>({});
  const [lojistaLogo, setLojistaLogo] = useState<string | undefined>(undefined);
  const [lojistaFullName, setLojistaFullName] = useState<string | undefined>(undefined);

  const agenda = useAsync<Appointment[]>(
    () => (lojistaProfile
      ? usecases.getAppointmentsForLojista.execute(lojistaProfile.id)
      : Promise.resolve([])),
    [usecases, lojistaProfile?.id]
  );
  useRefreshOnFocus(agenda.reload);

  // Fetch lojista profile details (logo and full name) when profile is available
  useEffect(() => {
    if (lojistaProfile && session?.token) {
      usecases.authentication.getLojistaById(lojistaProfile.id, session.token)
        .then(lojista => {
          if (lojista) {
            setLojistaLogo(lojista.logoKey); // eslint-disable-line react-hooks/set-state-in-effect
            setLojistaFullName(lojista.nome); // eslint-disable-line react-hooks/set-state-in-effect
          }
        })
        .catch(() => {
          // Ignore errors, will use fallback
        });
    }
    }, [lojistaProfile, session, usecases]);

  // Fetch client names, service names and establishment names for appointments
  const fetchEnrichedNames = useCallback(async (appointments: Appointment[]) => {
    if (!lojistaProfile || !session?.token) return;

    const clientIds = [...new Set(appointments.map((a: Appointment) => a.clientId).filter((id): id is string => Boolean(id)))];
    const serviceIds = [...new Set(appointments.map((a: Appointment) => a.serviceId).filter((id): id is string => Boolean(id)))];
    const establishmentIds = [...new Set(appointments.map((a: Appointment) => a.establishmentId).filter((id): id is string => Boolean(id)))];

    const names: Record<string, string> = {};
    const svcNames: Record<string, string> = {};
    const estNames: Record<string, string> = {};

    // Fetch client names
    for (const clientId of clientIds) {
      try {
        const client = await usecases.authentication.getClientById(clientId, session.token);
        if (client) {
          names[clientId] = client.nome;
        }
      } catch {
        // Ignore errors, will show ID as fallback
      }
    }

    // Fetch service names
    for (const serviceId of serviceIds) {
      try {
        const service = await usecases.authentication.getServiceById(serviceId, session.token);
        if (service) {
          svcNames[serviceId] = service.nome;
        }
      } catch {
        // Ignore errors
      }
    }

    // Fetch establishment names
    for (const establishmentId of establishmentIds) {
      try {
        const establishment = await usecases.authentication.getEstablishmentById(establishmentId, session.token);
        if (establishment) {
          estNames[establishmentId] = establishment.nome;
        }
      } catch {
        // Ignore errors
      }
    }

    setClientNames(names);
    setServiceNames(svcNames);
    setEstablishmentNames(estNames);
  }, [lojistaProfile, session, usecases]);

  // Trigger enriched name fetch when appointments load
  useEffect(() => {
    if (agenda.data && agenda.data.length > 0) {
      fetchEnrichedNames(agenda.data); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [agenda.data, fetchEnrichedNames]);

  const today = toISO(new Date());
  const appointments = useMemo(
    () => (agenda.data ?? []).filter((appointment: Appointment) => appointment.date >= today),
    [agenda.data, today]
  );
  const dates = useMemo(
    () => getUpcomingAppointmentDates(appointments, today),
    [appointments, today]
  );
  const selected = dates.includes(selectedDate) ? selectedDate : dates[0] ?? today;
  const days = dates.map(fromISO);

  // Enrich appointments with client names, service names and establishment names
  const enrichedAppointments = useMemo(
    () => (appointments ?? []).map((appt: Appointment) => ({
      ...appt,
      clientName: appt.clientId ? clientNames[appt.clientId] : undefined,
      serviceName: appt.serviceId ? serviceNames[appt.serviceId] : undefined,
      establishmentName: appt.establishmentId ? establishmentNames[appt.establishmentId] : undefined,
    })),
    [appointments, clientNames, serviceNames, establishmentNames]
  );

  const appointmentsForSelectedDay = useMemo(
    () => (enrichedAppointments ?? []).filter((appointment: Appointment) => appointment.date === selected),
    [enrichedAppointments, selected]
  );

  return {
    userName: lojistaFullName ?? (lojistaProfile?.name ?? '').trim(),
    lojistaLogo,
    lojistaName: lojistaFullName,
    profileId: lojistaProfile?.id,
    selectedDate: selected,
    selectDate: setSelectedDate,
    days: days ?? [],
    appointments: appointmentsForSelectedDay,
    loading: agenda.loading && !agenda.data,
    error: agenda.error?.message,
    reload: agenda.reload,
  };
}
