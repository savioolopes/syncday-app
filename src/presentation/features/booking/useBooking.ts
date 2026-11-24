import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays, formatShort, fromISO, monthYearLabel, startOfDay, toISO } from '../../../core/utils/dates';
import { isOpenOn } from '../../../domain/entities/service';
import { useAsync } from '../../hooks/useAsync';
import { useApp } from '../../providers/AppProviders';
import { useSession } from '../../providers/SessionProvider';
import { useToast } from '../../providers/ToastProvider';
import { getUserFriendlyErrorMessage } from '../../../core/utils/errors';

/** Filter out past time slots for today (with 30min tolerance) */
const filterFutureSlots = (slots: { time: string; available: boolean }[], selectedDateISO: string): { time: string; available: boolean }[] => {
  const todayISO = toISO(startOfDay(new Date()));
  if (selectedDateISO !== todayISO) return slots;

  const now = new Date();
  const cutoffMinutes = now.getHours() * 60 + now.getMinutes() + 30; // 30min tolerance
  return slots.filter((slot) => {
    const [hours, minutes] = slot.time.split(':').map(Number);
    const slotMinutes = hours * 60 + minutes;
    return slotMinutes >= cutoffMinutes;
  });
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isValidUUID = (id: string): boolean => UUID_PATTERN.test(id);

const DAYS_PER_PAGE = 5;

/** Estado e regras de apresentação da tela "Marcar novo horário". */
export function useBooking(serviceId?: string) {
  const { usecases } = useApp();
  const { session } = useSession();
  const clientProfile = session?.profiles.find((profile) => profile.kind === 'cliente');
  const lojistaProfile = session?.profiles.find((profile) => profile.kind === 'lojista');
  const toast = useToast();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [pageStart, setPageStart] = useState(today);
  const [date, setDate] = useState(toISO(today));
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [time, setTime] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [enrichedServices, setEnrichedServices] = useState<Record<string, { name: string; place: string; logoKey?: string }>>({});

  const activeServiceId = serviceId ?? selectedServiceId;

  // CRITICAL FIX: Start promises in parallel - create promise references outside useAsync
  // This allows services and service to fetch in parallel instead of waterfall
  const servicesPromise = useMemo(() => usecases.getServices.execute(), [usecases]);
  const servicePromise = useMemo(
    () => activeServiceId ? usecases.getService.execute(activeServiceId) : Promise.resolve(undefined),
    [usecases, activeServiceId]
  );

  const services = useAsync(() => servicesPromise, [servicesPromise]);
  const service = useAsync(() => servicePromise, [servicePromise]);

  // Compute selectedService early (raw from list or single fetch) so callbacks can use it
  // Will be enhanced with enriched names later when enrichedServicesList is available
  const selectedService = useMemo(() => {
    // First try to get from services list (has all fields including dataInicioVigor)
    const fromList = services.data?.find((s) => s.id === activeServiceId);
    if (fromList) return fromList;
    // Fallback to single fetch
    return service.data?.id === activeServiceId ? service.data : undefined;
  }, [services.data, service.data, activeServiceId]);

  // Slots depend on selectedService
  const slots = useAsync(
    async () => (selectedService ? usecases.getAvailableSlots.execute(selectedService.id, date) : []),
    [usecases, selectedService?.id, date]
  );

  // Memoize slotList to prevent unnecessary re-renders in callbacks, filtering past slots for today
  const slotList = useMemo(() => {
    const rawSlots = slots.data ?? [];
    return filterFutureSlots(rawSlots, date);
  }, [slots.data, date]);

  const days = useMemo(
    () => Array.from({ length: DAYS_PER_PAGE }, (_, i) => addDays(pageStart, i)),
    [pageStart]
  );

  // Fetch enriched names for services when we have any token
  const fetchEnrichedNames = useCallback(async (servicesList: any[]) => {
    if (!session) return;
    const token = session.lojistaToken ?? session.token;
    if (!token) return;

    // CRITICAL FIX: Single pass iteration instead of multiple loops
    const names: Record<string, { name: string; place: string; logoKey?: string }> = {};
    const seenEst = new Set<string>();
    const seenServ = new Set<string>();

    for (const s of servicesList) {
      if (s.estabelecimento && !seenEst.has(s.estabelecimento)) {
        seenEst.add(s.estabelecimento);
        if (!isValidUUID(s.estabelecimento)) continue;
        try {
          const est = await usecases.authentication.getEstablishmentById(s.estabelecimento, session.lojistaToken ?? session.token);
          if (est) names[s.estabelecimento] = { name: '', place: est.nome, logoKey: est.logoKey };
        } catch { /* ignore */ }
      }
      if (s.servico && !seenServ.has(s.servico)) {
        seenServ.add(s.servico);
        if (!isValidUUID(s.servico)) continue;
        try {
          const serv = await usecases.authentication.getServiceById(s.servico, session.lojistaToken ?? session.token);
          if (serv) names[s.servico] = { ...(names[s.servico] ?? { name: '', place: '' }), name: serv.nome };
        } catch { /* ignore */ }
      }
    }

    // Map back to service IDs in same loop
    const enriched: Record<string, { name: string; place: string; logoKey?: string }> = {};
    for (const s of servicesList) {
      enriched[s.id] = {
        name: names[s.servico]?.name ?? s.name,
        place: names[s.estabelecimento]?.place ?? s.place,
        logoKey: names[s.estabelecimento]?.logoKey,
      };
    }
    setEnrichedServices(enriched);
  }, [lojistaProfile, session, usecases]);

  // CRITICAL FIX: Move side effect out of useMemo to useEffect
  useEffect(() => {
    if (services.data) {
      fetchEnrichedNames(services.data); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [services.data, fetchEnrichedNames]);

  const selectDate = useCallback((iso: string) => {
    setDate(iso);
    setTime(null);
  }, []);

  const selectService = useCallback((id: string) => {
    setSelectedServiceId(id);
    setTime(null);
    const selected = services.data?.find((item) => item.id === id);
    if (!selected) return;
    let firstOpenDay = selected.dataInicioVigor > toISO(today) ? fromISO(selected.dataInicioVigor) : today;
    for (let i = 0; i < 370 && !isOpenOn(selected, firstOpenDay); i++) firstOpenDay = addDays(firstOpenDay, 1);
    setDate(toISO(firstOpenDay));
    setPageStart(firstOpenDay);
  }, [services.data, today]);

  const submit = useCallback(async (onSuccess: () => void) => {
    if (!selectedService || !time || !session) return;
    const slot = slotList.find((item) => item.time === time);
    if (!slot) {
      toast.show('Atualize os horários e selecione um horário disponível.');
      return;
    }
    setSubmitting(true);
    try {
      await usecases.createAppointment.execute(
        selectedService,
        date,
        time,
        clientProfile?.id ?? session.login,
        slot.gradeHorario
      );
      toast.show('Prontinho, tá marcado.');
      onSuccess();
    } catch (error) {
      toast.show(getUserFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }, [selectedService, time, session, slotList, clientProfile, date, toast, usecases]);

  // CRITICAL FIX: Memoize isClosed callback
  const isClosed = useCallback((day: Date) => {
    if (!selectedService) return true;
    const iso = toISO(day);
    return (
      !selectedService.ativo ||
      !isOpenOn(selectedService, day) ||
      iso < selectedService.dataInicioVigor ||
      (!!selectedService.dataFimVigor && iso > selectedService.dataFimVigor)
    );
  }, [selectedService]);

  // CRITICAL FIX: Memoize earliest computation
  const earliest = useMemo(() =>
    selectedService && selectedService.dataInicioVigor > toISO(today)
      ? fromISO(selectedService.dataInicioVigor)
      : today,
    [selectedService, today]
  );

  const goPrev = useCallback(() => {
    setPageStart((current) => {
      const previous = addDays(current, -DAYS_PER_PAGE);
      return previous < earliest ? earliest : previous;
    });
  }, [earliest]);

  const goNext = useCallback(() => {
    setPageStart((current) => addDays(current, DAYS_PER_PAGE));
  }, []);

  // Merge enriched names with services - only include fields actually used by UI
  const enrichedServicesList = useMemo(
    () => (services.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      place: s.place,
      lojista: s.lojista,
      estabelecimento: s.estabelecimento,
      servico: s.servico,
      dataInicioVigor: s.dataInicioVigor,
      dataFimVigor: s.dataFimVigor,
      ativo: s.ativo,
      durationMin: s.durationMin,
      price: s.price,
      closedWeekdays: s.closedWeekdays,
      diasAtendimento: s.diasAtendimento,
      enrichedName: enrichedServices[s.id]?.name,
      enrichedPlace: enrichedServices[s.id]?.place,
      logoKey: enrichedServices[s.id]?.logoKey,
    })),
    [services.data, enrichedServices]
  );

  // For display, use enriched service from list (has enrichedName/enrichedPlace from lojista API)
  // The selectedService reference above is used for logic; enrichedServicesList is used for display
  const displayService = useMemo(() => {
    const fromList = enrichedServicesList.find((s) => s.id === activeServiceId);
    return fromList ?? selectedService;
  }, [enrichedServicesList, selectedService, activeServiceId]);

  const summaryText = time ? `${formatShort(fromISO(date))} · ${time}` : 'Escolha um horário';
  const canSubmit = !!time && !!selectedService && !!session;
  const availableCount = slotList.filter((slot) => slot.available).length;
  const monthLabel = monthYearLabel(pageStart);
  const serviceLoading = service.loading;
  const serviceError = service.error?.message;
  const loadingServices = services.loading;
  const servicesError = services.error?.message;

  return {
    services: enrichedServicesList,
    loadingServices,
    servicesError,
    serviceId: activeServiceId,
    selectService,
    service: displayService, // Use enriched service for display
    serviceLoading,
    serviceError,
    days,
    date,
    selectDate,
    isClosed,
    monthLabel,
    canGoBack: pageStart > earliest,
    goPrev,
    goNext,
    slots: slotList,
    loadingSlots: slots.loading,
    slotsError: slots.error?.message,
    reloadSlots: slots.reload,
    availableCount,
    time,
    selectTime: setTime,
    summaryText,
    canSubmit,
    submitting,
    submit,
  };
}