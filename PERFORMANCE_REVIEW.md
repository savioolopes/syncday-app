# React Performance Review - Frontend Project

**Reviewed Components:** `TimeSlotGrid`, `SelectableTile`, `WeekStrip`, `DayLabel`, `AppointmentCard`, `Card`, `BookingScreen`, `useBooking`, `useAsync`

**Review Standard:** Vercel React Best Practices (64 rules across 8 categories)

---

## Executive Summary

The codebase follows many modern React patterns but has several **CRITICAL** and **HIGH** priority performance issues, primarily around:
- **Waterfall data fetching** in `useBooking` hook
- **Missing memoization** causing unnecessary re-renders
- **Inline component definitions** in render paths
- **Inefficient async patterns** in `useAsync` hook

---

## 🔴 CRITICAL Issues (Priority 1-2: Waterfalls & Bundle Size)

### 1. `async-parallel` — Sequential Data Fetching in `useBooking`

**File:** `src/presentation/features/booking/useBooking.ts` (lines 28-37)

```typescript
// ❌ CURRENT: Sequential waterfall
const services = useAsync(() => usecases.getServices.execute(), [usecases]);
const service = useAsync(
  () => (activeServiceId ? usecases.getService.execute(activeServiceId) : Promise.resolve(undefined)),
  [usecases, activeServiceId]
);
const slots = useAsync(
  async () => (selectedService ? usecases.getAvailableSlots.execute(selectedService.id, date) : []),
  [usecases, selectedService?.id, date]
);
```

**Problem:** Three dependent `useAsync` calls create a waterfall:
1. `services` loads → 2. `service` loads (depends on `activeServiceId`) → 3. `slots` loads (depends on `selectedService`)

**Fix:** Start all independent promises early, use `Promise.all()` or `Promise.allSettled()`:

```typescript
// ✅ FIXED: Parallel fetching where possible
const servicesPromise = useMemo(() => usecases.getServices.execute(), [usecases]);
const servicePromise = useMemo(
  () => activeServiceId ? usecases.getService.execute(activeServiceId) : Promise.resolve(undefined),
  [usecases, activeServiceId]
);

// Use useAsync with pre-started promises
const services = useAsync(() => servicesPromise, [servicesPromise]);
const service = useAsync(() => servicePromise, [servicePromise]);

// Slots can start once service is known
const slots = useAsync(
  async () => selectedService ? usecases.getAvailableSlots.execute(selectedService.id, date) : [],
  [usecases, selectedService?.id, date]
);
```

**Impact:** Reduces total loading time from sum of all requests to max of parallel requests.

---

### 2. `bundle-barrel-imports` — Barrel File Imports

**Files:** Multiple components import from `'../../../core/theme'` and `'../../components/ui'`

```typescript
// ❌ CURRENT: Barrel imports
import { colors, spacing } from '../../../core/theme';
import { SelectableTile, Typography } from '../../components/ui';
```

**Problem:** Barrel files (`index.ts` exporting everything) prevent tree-shaking and increase bundle size.

**Fix:** Import directly from source files:

```typescript
// ✅ FIXED: Direct imports
import { colors, spacing } from '../../../core/theme/colors'; // or wherever defined
import { SelectableTile } from '../../components/ui/SelectableTile';
import { Typography } from '../../components/ui/Typography';
```

---

### 3. `async-suspense-boundaries` — Missing Suspense for Data Fetching

**File:** `src/presentation/features/booking/BookingScreen.tsx`

**Problem:** Loading states (`LoadingState`, conditional rendering) manually handled instead of using React Suspense for streaming.

**Fix:** Wrap async components in `<Suspense fallback={<LoadingState />}>` boundaries. Requires migrating `useAsync` to return promises or using a Suspense-compatible data fetching library (SWR, TanStack Query).

---

## 🟠 HIGH Issues (Priority 3-4: Server/Client Data Fetching)

### 4. `server-parallel-fetching` / `client-swr-dedup` — No Request Deduplication

**File:** `src/presentation/hooks/useAsync.ts`

**Problem:** Custom `useAsync` hook has no request deduplication. Multiple components using same data will fire duplicate requests.

**Fix:** Use **SWR** or **TanStack Query** which provide:
- Automatic request deduplication
- Stale-while-revalidate caching
- Background refetching
- Optimistic updates

```typescript
// ✅ RECOMMENDED: Replace useAsync with SWR
import useSWR from 'swr';

function useServices() {
  return useSWR('services', () => usecases.getServices.execute(), {
    dedupingInterval: 2000, // Dedupe requests within 2s
    revalidateOnFocus: false,
  });
}
```

---

### 5. `server-serialization` — Large Objects Passed to Client Components

**File:** `src/presentation/features/booking/useBooking.ts` (line 152-153)

```typescript
// Returns entire service objects with all fields
services: enrichedServicesList,
```

**Problem:** Entire service objects (potentially large) passed to client components. Only needed fields should be serialized.

**Fix:** Select only required fields:

```typescript
const enrichedServicesList = useMemo(
  () => (services.data ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    place: s.place,
    enrichedName: enrichedServices[s.id]?.name,
    enrichedPlace: enrichedServices[s.id]?.place,
    // Only include fields actually used by UI
  })),
  [services.data, enrichedServices]
);
```

---

## 🟡 MEDIUM Issues (Priority 5-6: Re-render & Rendering Optimization)

### 6. `rerender-memo` — Missing `React.memo` on List Item Components

**Files:** 
- `src/presentation/features/appointments/AppointmentCard.tsx`
- `src/presentation/components/ui/SelectableTile.tsx`
- `src/presentation/components/ui/DayLabel.tsx`
- `src/presentation/components/ui/StatusLabel.tsx` (not reviewed but likely)

**Problem:** Components rendered in lists (`FlatList`, `.map()`) lack `React.memo`, causing re-renders when parent re-renders.

**Fix:** Wrap list item components in `React.memo`:

```typescript
// ✅ FIXED: AppointmentCard.tsx
import React, { memo } from 'react';

export const AppointmentCard = memo(function AppointmentCard({
  item,
  accent,
  onCancel
}: { item: Appointment; accent: string; onCancel?: (id: string) => void }) {
  // ... component logic
});

// ✅ FIXED: SelectableTile.tsx
export const SelectableTile = memo(function SelectableTile({ ... }) {
  // ... component logic
});
```

**Impact:** Prevents re-rendering entire lists when only one item changes.

---

### 7. `rerender-no-inline-components` — Inline Component in `SelectableTile`

**File:** `src/presentation/components/ui/SelectableTile.tsx` (line 14, 29)

```typescript
// ❌ CURRENT: Children as render prop function
children: (textColor: string) => ReactNode;
// Usage in TimeSlotGrid:
<SelectableTile>
  {(color) => (
    <>
      <Typography ...>{slot.time}</Typography>
      {active && <Feather name="check" />}
    </>
  )}
</SelectableTile>
```

**Problem:** Render prop creates new function on every render, defeating `React.memo` on children.

**Fix:** Use `children` as node with context or style props:

```typescript
// ✅ FIXED: Pass color via context or style prop
interface Props {
  // ...
  children: ReactNode;
  textColor?: string; // or use context
}

// In parent:
<SelectableTile textColor={textColor}>
  <Typography variant="mono" size={18} color={textColor} ...>
    {slot.time}
  </Typography>
</SelectableTile>
```

---

### 8. `rerender-defer-reads` — Subscribing to State Only Used in Callbacks

**File:** `src/presentation/features/booking/useBooking.ts` (lines 20-25)

```typescript
const [pageStart, setPageStart] = useState(today);
const [date, setDate] = useState(toISO(today));
const [selectedServiceId, setSelectedServiceId] = useState('');
const [time, setTime] = useState<string | null>(null);
const [submitting, setSubmitting] = useState(false);
const [enrichedServices, setEnrichedServices] = useState<Record<string, {...}>>({});
```

**Problem:** All state read during render, but some only used in event handlers (`selectService`, `submit`, `goPrev`, `goNext`).

**Fix:** Move callback-only state to `useRef`:

```typescript
const pageStartRef = useRef(today);
const dateRef = useRef(toISO(today));
// Only keep state that triggers renders
const [selectedServiceId, setSelectedServiceId] = useState('');
const [time, setTime] = useState<string | null>(null);
const [submitting, setSubmitting] = useState(false);

// In callbacks:
const goPrev = () => {
  const previous = addDays(pageStartRef.current, -DAYS_PER_PAGE);
  pageStartRef.current = previous < earliest ? earliest : previous;
  // Force update if UI needs to reflect
};
```

---

### 9. `rerender-lazy-state-init` — Expensive Initial State Computation

**File:** `src/presentation/features/booking/useBooking.ts` (line 39)

```typescript
const days = Array.from({ length: DAYS_PER_PAGE }, (_, i) => addDays(pageStart, i));
```

**Problem:** `Array.from` with `addDays` runs on every render. Not memoized.

**Fix:** Use `useMemo` or lazy initialization:

```typescript
const days = useMemo(
  () => Array.from({ length: DAYS_PER_PAGE }, (_, i) => addDays(pageStart, i)),
  [pageStart]
);
```

---

### 10. `rerender-move-effect-to-event` — Logic in `useMemo` That Should Be in Event Handler

**File:** `src/presentation/features/booking/useBooking.ts` (lines 80-84)

```typescript
useMemo(() => {
  if (services.data) {
    fetchEnrichedNames(services.data);
  }
}, [services.data, fetchEnrichedNames]);
```

**Problem:** Side effect (async fetch) in `useMemo` — violates React rules, runs during render.

**Fix:** Move to `useEffect` or event handler:

```typescript
useEffect(() => {
  if (services.data) {
    fetchEnrichedNames(services.data);
  }
}, [services.data, fetchEnrichedNames]);
```

---

### 11. `rendering-conditional-render` — Using `&&` for Conditional Rendering

**Files:** Multiple — `BookingScreen.tsx` (lines 40-42, 45-46, 93-99, 100-105)

```typescript
// ❌ CURRENT: && conditional
{booking.serviceLoading && booking.serviceId ? (
  <LoadingState />
) : !booking.service ? (
  // ...
) : (
  // ...
)}

{booking.loadingSlots ? <LoadingState /> : null}
{booking.slotsError ? ( ... ) : null}
```

**Problem:** `&&` with non-boolean values can render `0`, `""`, `false` unexpectedly. Also harder to optimize.

**Fix:** Use ternary operators:

```typescript
// ✅ FIXED: Explicit ternary
{booking.serviceLoading && booking.serviceId ? <LoadingState /> : null}
{!booking.service ? ( ... ) : ( ... )}
{booking.loadingSlots ? <LoadingState /> : null}
{booking.slotsError ? ( ... ) : null}
```

---

### 12. `rerender-split-combined-hooks` — Combined State with Independent Updates

**File:** `src/presentation/features/booking/useBooking.ts` (lines 20-25)

**Problem:** Multiple `useState` calls that could be combined or split based on update patterns. `pageStart`, `date`, `selectedServiceId` often update together.

**Fix:** Group related state:

```typescript
const [bookingState, setBookingState] = useState({
  pageStart: today,
  date: toISO(today),
  selectedServiceId: '',
  time: null,
  submitting: false,
});

// Or split by update frequency:
const [uiState, setUiState] = useState({ time: null, submitting: false });
const [selectionState, setSelectionState] = useState({ 
  pageStart: today, 
  date: toISO(today), 
  selectedServiceId: '' 
});
```

---

### 13. `js-combine-iterations` — Multiple Array Iterations in `fetchEnrichedNames`

**File:** `src/presentation/features/booking/useBooking.ts` (lines 43-77)

```typescript
// ❌ CURRENT: Multiple loops
const establishmentIds = [...new Set(servicesList.map((s) => s.estabelecimento).filter(Boolean))];
const servicoIds = [...new Set(servicesList.map((s) => s.servico).filter(Boolean))];

for (const estId of establishmentIds) { ... }
for (const servId of servicoIds) { ... }
for (const s of servicesList) { ... }
```

**Problem:** 4 iterations over `servicesList` + 2 more over unique IDs.

**Fix:** Single pass with `reduce` or combined logic:

```typescript
const fetchEnrichedNames = useCallback(async (servicesList: any[]) => {
  if (!lojistaProfile || !session?.lojistaToken) return;
  
  const names: Record<string, { name: string; place: string }> = {};
  const seenEst = new Set<string>();
  const seenServ = new Set<string>();
  
  // Single pass to collect unique IDs
  for (const s of servicesList) {
    if (s.estabelecimento && !seenEst.has(s.estabelecimento)) {
      seenEst.add(s.estabelecimento);
      try {
        const est = await usecases.authentication.getEstablishmentById(s.estabelecimento, session.lojistaToken);
        if (est) names[s.estabelecimento] = { place: est.nome };
      } catch { /* ignore */ }
    }
    if (s.servico && !seenServ.has(s.servico)) {
      seenServ.add(s.servico);
      try {
        const serv = await usecases.authentication.getServiceById(s.servico, session.lojistaToken);
        if (serv) names[s.servico] = { ...(names[s.servico] ?? {}), name: serv.nome };
      } catch { /* ignore */ }
    }
  }
  
  // Map back in same loop or separate memoized computation
  const enriched: Record<string, { name: string; place: string }> = {};
  for (const s of servicesList) {
    enriched[s.id] = {
      name: names[s.servico]?.name ?? s.name,
      place: names[s.estabelecimento]?.place ?? s.place,
    };
  }
  setEnrichedServices(enriched);
}, [lojistaProfile, session?.lojistaToken, usecases]);
```

---

### 14. `js-hoist-regexp` / `js-early-exit` — Various JS Optimizations

**File:** `src/presentation/features/booking/useBooking.ts`

**Issues:**
- `isClosed` function (line 127) recreated every render — should be `useCallback`
- `earliest` computation (line 138) runs every render — should be `useMemo`
- `selectService` has loop with early exit condition but could be optimized

**Fix:**

```typescript
const isClosed = useCallback((day: Date) => {
  if (!selectedService) return true;
  const iso = toISO(day);
  return !selectedService.ativo ||
    !isOpenOn(selectedService, day) ||
    iso < selectedService.dataInicioVigor ||
    (!!selectedService.dataFimVigor && iso > selectedService.dataFimVigor);
}, [selectedService]);

const earliest = useMemo(() => 
  selectedService && selectedService.dataInicioVigor > toISO(today)
    ? fromISO(selectedService.dataInicioVigor)
    : today,
  [selectedService]
);
```

---

## 🟢 LOW Issues (Priority 7-8: JS Perf & Advanced Patterns)

### 15. `advanced-event-handler-refs` — Stable Callback Refs

**File:** `src/presentation/features/booking/useBooking.ts` — callbacks like `selectDate`, `selectTime`, `goPrev`, `goNext` returned in object.

**Problem:** New function references created on every render, causing child re-renders even with `React.memo`.

**Fix:** Use `useCallback` for all returned callbacks:

```typescript
const selectDate = useCallback((iso: string) => {
  setDate(iso);
  setTime(null);
}, []);

const selectTime = useCallback((time: string) => {
  setTime(time);
}, []);
// ... etc
```

---

### 16. `rerender-use-deferred-value` — Defer Expensive Renders

**File:** `src/presentation/features/booking/BookingScreen.tsx` — `TimeSlotGrid` receives `slots` array.

**Problem:** Large slot lists cause expensive renders blocking user input.

**Fix:** Use `useDeferredValue` for non-urgent updates:

```typescript
import { useDeferredValue } from 'react';

const deferredSlots = useDeferredValue(booking.slots);
<TimeSlotGrid slots={deferredSlots} selected={booking.time} onSelect={booking.selectTime} />;
```

---

### 17. `rerender-use-ref-transient-values` — Use Refs for Transient Values

**File:** `src/presentation/features/booking/useBooking.ts` — `enrichedServices` state.

**Problem:** `enrichedServices` updates frequently but only used for rendering enriched names — not a trigger for other effects.

**Fix:** Use `useRef` + force update pattern, or keep in state but ensure minimal re-renders.

---

## 📋 Component-Specific Recommendations

### `TimeSlotGrid.tsx`
- ✅ Already uses `useMemo` for width calculation (via `useGridItemWidth`)
- ⚠️ Add `React.memo` to prevent re-renders when parent re-renders
- ⚠️ Consider `FlashList` (from `@shopify/flash-list`) instead of `.map()` for large slot lists

### `SelectableTile.tsx`
- ✅ Simple, well-structured
- ⚠️ Add `React.memo`
- ⚠️ Fix render prop pattern (see issue #7)

### `WeekStrip.tsx`
- ✅ Uses `ScrollView` horizontal — good for small lists
- ⚠️ For larger lists, consider `FlatList` with `horizontal={true}`

### `AppointmentCard.tsx`
- ✅ Good structure
- ⚠️ Add `React.memo`
- ⚠️ `Image` component — ensure proper `resizeMode` and consider `prefetch` for logos

### `BookingScreen.tsx`
- ⚠️ Large component — consider splitting into sub-components
- ⚠️ Multiple conditional renders — extract to separate components
- ⚠️ Pass `booking` object props individually instead of whole object to enable `React.memo` on children

### `useBooking.ts`
- 🔴 **Most critical file** — addresses issues #1, #4, #5, #8, #9, #10, #12, #13, #14, #15
- Consider migrating to **TanStack Query** or **SWR** for data fetching
- Split into smaller hooks: `useServices`, `useService`, `useSlots`, `useDateSelection`, `useSubmission`

### `useAsync.ts`
- 🔴 Replace with **SWR** or **TanStack Query** — provides deduplication, caching, retries, DevTools
- If keeping custom: add request deduplication, abort controller support, retry logic

---

## 🎯 Priority Action Plan

| Priority | Issue | Files | Effort | Impact |
|----------|-------|-------|--------|--------|
| 1 | Replace `useAsync` with SWR/TanStack Query | `useAsync.ts`, `useBooking.ts` | Medium | **HIGH** — fixes waterfall, dedup, caching |
| 2 | Parallelize service/slot fetching | `useBooking.ts` | Low | **HIGH** — reduces load time |
| 3 | Add `React.memo` to list components | `AppointmentCard`, `SelectableTile`, `DayLabel`, `StatusLabel` | Low | **MEDIUM** — prevents list re-renders |
| 4 | Fix render prop in `SelectableTile` | `SelectableTile.tsx`, `TimeSlotGrid.tsx` | Low | **MEDIUM** — enables memoization |
| 5 | Move side effects out of `useMemo` | `useBooking.ts` | Low | **MEDIUM** — fixes React violations |
| 6 | Memoize callbacks in `useBooking` return | `useBooking.ts` | Low | **MEDIUM** — stabilizes child renders |
| 7 | Direct imports (no barrels) | All components | Low | **LOW** — bundle size |
| 8 | Ternary over `&&` conditionals | `BookingScreen.tsx` | Low | **LOW** — correctness |

---

## 📚 References

- [Vercel React Best Practices](https://github.com/vercel/next.js/tree/canary/packages/next-server/docs)
- [SWR Documentation](https://swr.vercel.app/)
- [TanStack Query](https://tanstack.com/query/latest)
- [React Memo Guide](https://react.dev/learn/skip-re-rendering-with-memo)
- [FlashList for React Native](https://shopify.github.io/flash-list/)

---

*Review performed using Vercel React Best Practices skill (64 rules, 8 categories)*