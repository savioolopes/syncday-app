import { useEffect, useMemo, useState } from 'react';
import { fromISO, toISO } from '../../../core/utils/dates';
import { plural } from '../../../core/utils/format';
import { getAppointmentDates, summarizeAppointments } from '../../../domain/entities/appointment';
import { useAsync } from '../../hooks/useAsync';
import { useRefreshOnFocus } from '../../hooks/useRefreshOnFocus';
import { useApp } from '../../providers/AppProviders';
import { useSession } from '../../providers/SessionProvider';
import { HttpClient } from '../../../data/http/HttpClient';

// Use relative URLs through nginx proxy when in browser to avoid CORS
const isBrowser = typeof window !== 'undefined';
const currentOrigin = isBrowser ? window.location.origin : '';
const apiUrl = process.env.EXPO_PUBLIC_API_URL;
let apiOrigin = '';
try {
  apiOrigin = apiUrl ? new URL(apiUrl).origin : '';
} catch {
  apiOrigin = '';
}
const useRelativeUrls = isBrowser && currentOrigin !== '' && apiOrigin !== '' && currentOrigin !== apiOrigin;

const LOJISTA_API_URL = useRelativeUrls ? '/api/estabelecimentos' : (process.env.EXPO_PUBLIC_LOJISTA_API_URL || 'http://localhost:8090');

interface LojistaServiceResponse {
  nome: string;
}

interface LojistaEstablishmentResponse {
  nome: string;
  logoKey?: string;
}

interface LojistaResponse {
  logoKey?: string;
}

// Validate UUID format to prevent path traversal / SSRF
const isValidUUID = (id: string): boolean =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

/** Estado e regras de apresentação da tela "Meus agendamentos". */
export function useWeekAgenda() {
  const { usecases } = useApp();
  const { session } = useSession();
  const clientProfile = session?.profiles.find((profile) => profile.kind === 'cliente');
  const [selectedDate, setSelectedDate] = useState(() => toISO(new Date()));
  const [lojistaLogos, setLojistaLogos] = useState<Record<string, string>>({});
  const [establishmentLogos, setEstablishmentLogos] = useState<Record<string, string | undefined>>({});
  const [serviceNames, setServiceNames] = useState<Record<string, string>>({});
  const [establishmentNames, setEstablishmentNames] = useState<Record<string, string>>({});

  const week = useAsync(
    () => (clientProfile ? usecases.getAppointments.execute(clientProfile.id) : Promise.resolve([])),
    [usecases, clientProfile?.id]
  );
  useRefreshOnFocus(week.reload);

  const today = toISO(new Date());

  // Fetch lojista logos, service names and establishment names for appointments
  useEffect(() => {
    if (week.data && session?.token) {
      const lojistaIds = [...new Set(week.data.map((a) => a.lojistaId).filter((id): id is string => Boolean(id)))];
      const serviceIds = [...new Set(week.data.map((a) => a.serviceId).filter((id): id is string => Boolean(id)))];
      const establishmentIds = [...new Set(week.data.map((a) => a.establishmentId).filter((id): id is string => Boolean(id)))];

      // Fetch lojista logos
      lojistaIds.forEach(async (lojistaId) => {
        if (!isValidUUID(lojistaId)) return;
        try {
          const lojista = await usecases.authentication.getLojistaById(lojistaId, session.token);
          if (lojista) {
            setLojistaLogos((prev) => ({ ...prev, [lojistaId]: lojista.logoKey }));
          }
        } catch {
          // Ignore errors
        }
      });

      // Fetch service names from lojista API
      serviceIds.forEach(async (serviceId) => {
        if (!isValidUUID(serviceId)) return;
        try {
          const lojistaHttp = new HttpClient(
            LOJISTA_API_URL,
            () => session?.token
          );
          const service = await lojistaHttp.get<LojistaServiceResponse>(`/servicos/${serviceId}`);
          if (service) {
            setServiceNames((prev) => ({ ...prev, [serviceId]: service.nome }));
          }
        } catch {
          // Ignore errors
        }
      });

      // Fetch establishment names and logos
      establishmentIds.forEach(async (establishmentId) => {
        if (!isValidUUID(establishmentId)) return;
        try {
          const lojistaHttp = new HttpClient(
            LOJISTA_API_URL,
            () => session?.token
          );
          const establishment = await lojistaHttp.get<LojistaEstablishmentResponse>(`/estabelecimentos/${establishmentId}`);
          if (establishment) {
            setEstablishmentNames((prev) => ({ ...prev, [establishmentId]: establishment.nome }));
            if (establishment.logoKey) {
              setEstablishmentLogos((prev) => ({ ...prev, [establishmentId]: establishment.logoKey }));
            }
          }
        } catch {
          // Ignore errors
        }
      });
    }
  }, [week.data, session?.token, usecases]);

  const all = useMemo(() => week.data ?? [], [week.data]);
  // Filter appointments to only show today and future (matching lojista agenda behavior)
  const upcoming = useMemo(
    () => all.filter((appointment) => appointment.date >= today),
    [all, today]
  );
  const days = useMemo(
    () => getAppointmentDates(upcoming).map(fromISO),
    [upcoming]
  );
  const selected = days.some((day) => toISO(day) === selectedDate)
    ? selectedDate
    : days.length > 0
      ? toISO(days[0])
      : selectedDate;
  const { total, places } = summarizeAppointments(upcoming);
  const summaryText =
    total === 0
      ? ''
      : `Você possui ${plural(total, 'compromisso agendado', 'compromissos agendados')}${places > 1 ? ` em ${places} lugares` : ''}.`;
  const loginName = session?.login.split('@')[0].split(/[._-]/)[0];

  // Enrich appointments with lojista logos, service names and establishment names
  const enrichedAppointments = useMemo(
    () => upcoming.map((appt) => ({
      ...appt,
      establishmentLogo: appt.establishmentId ? establishmentLogos[appt.establishmentId] : undefined,
      lojistaLogo: appt.lojistaId ? lojistaLogos[appt.lojistaId] : undefined,
      title: appt.serviceId ? (serviceNames[appt.serviceId] ?? appt.title) : appt.title,
      place: appt.establishmentId ? (establishmentNames[appt.establishmentId] ?? appt.place) : appt.place,
    })),
    [upcoming, lojistaLogos, serviceNames, establishmentNames, establishmentLogos]
  );

  return {
    days,
    selected,
    select: setSelectedDate,
    userName: clientProfile?.name.trim().split(/\s+/)[0] || loginName || '',
    summaryText,
    appointments: enrichedAppointments.filter((a) => a.date === selected),
    loading: week.loading && !week.data,
    error: week.error?.message,
    reload: week.reload,
  };
}
