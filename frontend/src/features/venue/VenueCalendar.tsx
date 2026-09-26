import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarCheck, CheckCircle2, ChevronLeft, ChevronRight, Clock, Lock, Wrench, type LucideIcon,
} from 'lucide-react';
import { listVenues, type Venue } from './venueApi';
import { getVenueCalendar, MAX_CALENDAR_DAYS, type CalendarState, type VenueCalendar as CalendarData } from './venueCalendarApi';
import {
  dayCount, daysInRange, formatDay, formatMonth, formatTime, isDayKey, monthBounds, segmentsByDay, shiftMonth, todayKey,
  type DaySegment,
} from './calendarDates';
import './venue.css';

// E05-S03 "View the venue availability calendar" (SCRUM-42), built against
// the calendar API in PR #134. Shared by Venue Staff (/venue/availability)
// and Event Coordinators (/coordinator/calendar and
// /coordinator/venues/:venueId/calendar); the server decides which event
// details each viewer receives.

// Each state carries an icon and a text label as well as a colour, so the
// four states can be told apart without relying on colour (Scenario 1).
const stateMeta: Record<CalendarState, { label: string; icon: LucideIcon }> = {
  free:        { label: 'Free',        icon: CheckCircle2 },
  tentative:   { label: 'Tentative',   icon: Clock },
  confirmed:   { label: 'Confirmed',   icon: CalendarCheck },
  blocked:     { label: 'Blocked',     icon: Wrench },
  unavailable: { label: 'Unavailable', icon: Lock },
};

const legendOrder: CalendarState[] = ['free', 'tentative', 'confirmed', 'blocked', 'unavailable'];

type Period = { from: string; to: string; mode: 'month' | 'custom' };

type VenueOptionsState =
  | { status: 'loading' }
  | { status: 'loaded'; venues: Venue[] }
  | { status: 'error'; message: string };

type CalendarLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; calendar: CalendarData }
  | { status: 'error'; message: string };

function monthPeriod(dayKey: string): Period {
  return { ...monthBounds(dayKey), mode: 'month' };
}

function StateBadge({ state }: { state: CalendarState }) {
  const { label, icon: Icon } = stateMeta[state];
  return (
    <span className={`calendar-badge badge-${state}`}>
      <Icon size={14} aria-hidden="true" /> {label}
    </span>
  );
}

function timeLabel(segment: DaySegment) {
  const start = formatTime(segment.start);
  const end = formatTime(segment.end, true);
  return start === '00:00' && end === '24:00' ? 'All day' : `${start}–${end}`;
}

export function VenueCalendar({ audience }: { audience: 'venue' | 'coordinator' }) {
  const { venueId: routeVenueId } = useParams();
  const [venueOptions, setVenueOptions] = useState<VenueOptionsState>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState(routeVenueId ?? '');
  const [period, setPeriod] = useState<Period>(() => monthPeriod(todayKey()));
  const [customFrom, setCustomFrom] = useState(period.from);
  const [customTo, setCustomTo] = useState(period.to);
  const [rangeError, setRangeError] = useState('');
  const [calendarState, setCalendarState] = useState<CalendarLoadState>({ status: 'idle' });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Only the latest request may update the screen, so a slow response for a
  // previous venue or month cannot overwrite the one the user is looking at.
  const latestRequest = useRef(0);

  // React Router reuses this screen between venue-specific URLs.
  useEffect(() => {
    if (routeVenueId) setSelectedId(routeVenueId);
  }, [routeVenueId]);

  useEffect(() => {
    let active = true;
    listVenues('').then((result) => {
      if (!active) return;
      if (!result.ok) {
        setVenueOptions({ status: 'error', message: result.message });
        return;
      }
      setVenueOptions({ status: 'loaded', venues: result.venues });
      setSelectedId(current => current || result.venues[0]?.id || '');
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    const request = ++latestRequest.current;
    setCalendarState({ status: 'loading' });
    setExpanded(null);
    getVenueCalendar(selectedId, period.from, period.to).then((result) => {
      if (request !== latestRequest.current) return;
      setCalendarState(result.ok ? { status: 'loaded', calendar: result.calendar } : { status: 'error', message: result.message });
    });
    return () => { latestRequest.current += 1; };
  }, [selectedId, period.from, period.to, reloadToken]);

  const goToMonth = (delta: number) => {
    const next = monthPeriod(shiftMonth(period.from, delta));
    setPeriod(next);
    setCustomFrom(next.from);
    setCustomTo(next.to);
    setRangeError('');
  };

  const handleRangeSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isDayKey(customFrom) || !isDayKey(customTo)) {
      setRangeError('Enter both a start date and an end date.');
      return;
    }
    if (customTo < customFrom) {
      setRangeError('The end date must be on or after the start date.');
      return;
    }
    if (dayCount(customFrom, customTo) > MAX_CALENDAR_DAYS) {
      setRangeError(`Choose a range of ${MAX_CALENDAR_DAYS} days or fewer.`);
      return;
    }
    setRangeError('');
    setPeriod({ from: customFrom, to: customTo, mode: 'custom' });
  };

  const periodLabel = period.mode === 'month'
    ? formatMonth(period.from)
    : `${formatDay(period.from)} – ${formatDay(period.to)}`;

  const days = useMemo(() => daysInRange(period.from, period.to), [period.from, period.to]);
  const segments = useMemo(
    () => (calendarState.status === 'loaded' ? segmentsByDay(calendarState.calendar.entries, days) : null),
    [calendarState, days],
  );

  const venues = withSelectedVenue(venueOptions.status === 'loaded' ? venueOptions.venues : [], selectedId, calendarState);

  return (
    <main className="venue-page venue-calendar-page">
      <header className="venue-heading">
        <p className="eyebrow">{audience === 'venue' ? 'Venue staff' : 'Event coordinator'}</p>
        <h1>Availability calendar</h1>
        <p className="calendar-intro">See when a venue is free, tentatively held, confirmed or blocked for maintenance. Times are Singapore time.</p>
      </header>

      <section className="calendar-controls card" aria-label="Calendar controls">
        {venueOptions.status === 'error' && !selectedId ? (
          <div role="alert" className="login-error">{venueOptions.message}</div>
        ) : (
          <label className="venue-select">
            <span>Venue</span>
            <select
              value={selectedId}
              disabled={venueOptions.status === 'loading' && !selectedId}
              onChange={event => setSelectedId(event.target.value)}
            >
              {venueOptions.status === 'loading' && !selectedId ? <option value="">Loading venues…</option> : null}
              {venues.map(venue => (<option key={venue.id} value={venue.id}>{venue.name}</option>))}
            </select>
          </label>
        )}

        <div className="calendar-period">
          <button type="button" className="secondary-action" onClick={() => goToMonth(-1)}>
            <ChevronLeft size={16} aria-hidden="true" /> Previous month
          </button>
          <h2 aria-live="polite">{periodLabel}</h2>
          <button type="button" className="secondary-action" onClick={() => goToMonth(1)}>
            Next month <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>

        <form className="calendar-range" aria-label="Custom date range" onSubmit={handleRangeSubmit} noValidate>
          <label>
            <span>From</span>
            <input type="date" value={customFrom} onChange={event => setCustomFrom(event.target.value)} />
          </label>
          <label>
            <span>To</span>
            <input type="date" value={customTo} onChange={event => setCustomTo(event.target.value)} />
          </label>
          <button type="submit" className="secondary-action">Show range</button>
          {rangeError ? <p role="alert" className="field-error">{rangeError}</p> : null}
        </form>
      </section>

      <ul className="calendar-legend" aria-label="Legend">
        {legendOrder.map(state => (<li key={state}><StateBadge state={state} /></li>))}
      </ul>

      {venueOptions.status === 'loaded' && venueOptions.venues.length === 0 && !selectedId ? (
        <p>No venues to show yet.</p>
      ) : null}

      {calendarState.status === 'loading' ? <p role="status">Loading availability…</p> : null}
      {calendarState.status === 'error' ? (
        <div role="alert" className="login-error">
          {calendarState.message}{' '}
          <button type="button" className="secondary-action" onClick={() => setReloadToken(token => token + 1)}>Try again</button>
        </div>
      ) : null}

      {calendarState.status === 'loaded' && segments ? (
        <>
          {!calendarState.calendar.venue.is_active ? (
            <p className="venue-alert-block" role="note">
              {calendarState.calendar.venue.name} is retired, so none of its time is offered as Free.
            </p>
          ) : null}
          <ol className="calendar-days" aria-label={`Availability for ${calendarState.calendar.venue.name}, ${periodLabel}`}>
            {days.map((day) => {
              const daySegments = segments.get(day) ?? [];
              return (
                <li key={day} className="calendar-day">
                  <h3>{formatDay(day)}</h3>
                  {daySegments.length === 0 ? (
                    <p className="calendar-empty">No bookable hours.</p>
                  ) : (
                    <ul>
                      {daySegments.map((segment) => {
                        const { entry } = segment;
                        const key = `${day}-${entry.state}-${segment.start}`;
                        const detailsId = `calendar-details-${key}`;
                        const time = timeLabel(segment);
                        return (
                          <li key={key} className={`calendar-entry entry-${entry.state}`}>
                            <span className="calendar-time">{time}</span>
                            <StateBadge state={entry.state} />
                            {entry.kind === 'block' ? (
                              <span className="calendar-text">
                                Maintenance block{entry.reason ? <> · <span className="calendar-reason">{entry.reason}</span></> : null}
                              </span>
                            ) : entry.event ? (
                              <>
                                <button
                                  type="button" className="calendar-event-toggle" aria-expanded={expanded === key}
                                  aria-controls={detailsId} onClick={() => setExpanded(current => (current === key ? null : key))}
                                >
                                  {entry.event.title}
                                </button>
                                {expanded === key ? (
                                  <dl id={detailsId} className="calendar-details">
                                    <dt>Event</dt><dd>{entry.event.title}</dd>
                                    <dt>Event code</dt><dd>{entry.event.code ?? 'Not assigned'}</dd>
                                    <dt>Date</dt><dd>{formatDay(day)}</dd>
                                    <dt>Time</dt><dd>{time}</dd>
                                  </dl>
                                ) : null}
                              </>
                            ) : entry.state === 'unavailable' ? (
                              <span className="calendar-text">Booked. Event details are not shown.</span>
                            ) : entry.state === 'free' ? (
                              <span className="calendar-text">Available</span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      ) : null}
    </main>
  );
}

// A venue opened by id (for example a retired one, which search omits) may be
// missing from the picker; keep it selectable under its calendar name.
function withSelectedVenue(list: Venue[], selectedId: string, calendarState: CalendarLoadState) {
  if (!selectedId || list.some(venue => venue.id === selectedId)) return list;
  const name = calendarState.status === 'loaded' ? calendarState.calendar.venue.name : 'Selected venue';
  return [{ id: selectedId, name } as Venue, ...list];
}
