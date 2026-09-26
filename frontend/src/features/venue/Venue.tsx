import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Building2, CalendarClock, CheckCircle2, Search } from 'lucide-react';
import { bookings, findBooking, findVenue, venues, venueSummary, type BookingStatus } from './mocks';
import { listVenues, retireVenue, type BlockingBooking, type Venue } from './venueApi';
import './venue.css';

const statusTone: Record<BookingStatus, string> = {
  Pending:   'warning',
  Tentative: 'info',
  Confirmed: 'success',
  Blocked:   'danger',
};

export function VenueDashboard() {
  return (
    <main className="venue-page">
      <header className="venue-heading">
        <p className="eyebrow">Venue staff</p>
        <h1>Venue dashboard</h1>
      </header>
      <section className="venue-metrics" aria-label="Booking counts">
        <article><span>Pending review</span><strong>{venueSummary.pending}</strong></article>
        <article><span>Confirmed</span><strong>{venueSummary.confirmed}</strong></article>
        <article><span>Conflicts</span><strong>{venueSummary.conflicts}</strong></article>
        <article><span>Venues</span><strong>{venues.length}</strong></article>
      </section>
      <section className="venue-list" aria-label="Pending and upcoming bookings">
        <h2>Bookings needing attention</h2>
        {bookings.map(booking => {
          const venue = findVenue(booking.venueId);
          return (
            <Link key={booking.id} to={`/venue/bookings/${booking.id}`} className="venue-row">
              <div>
                <strong>{booking.eventTitle}</strong>
                <small>{booking.eventCode} · {venue?.name ?? 'Unknown venue'} · {booking.date} {booking.window}</small>
              </div>
              <span className={`status-pill status-${statusTone[booking.status]}`}>{booking.status}</span>
            </Link>
          );
        })}
      </section>
      <p className="venue-footer">
        <Link to="/venue/inventory"><Building2 size={14} aria-hidden="true" /> Venue inventory</Link>
        <Link to="/venue/availability"><CalendarClock size={14} aria-hidden="true" /> Availability calendar</Link>
      </p>
    </main>
  );
}

type VenueListState =
  | { status: 'loading' }
  | { status: 'loaded'; venues: Venue[] }
  | { status: 'error'; message: string };

export function VenueInventory() {
  const [state, setState] = useState<VenueListState>({ status: 'loading' });
  const [retiringId, setRetiringId] = useState<string | null>(null);
  const [blockedRetire, setBlockedRetire] = useState<Record<string, BlockingBooking[]>>({});
  // Search input the user is typing; only takes effect on submit. Kept
  // separate from the term actually sent to the API so retire/reload can
  // re-run the last submitted search without racing an in-progress edit.
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const load = useCallback(async (search: string) => {
    setState({ status: 'loading' });
    const result = await listVenues(search);
    setState(result.ok ? { status: 'loaded', venues: result.venues } : { status: 'error', message: result.message });
  }, []);

  useEffect(() => {
    load(appliedSearch);
  }, [load, appliedSearch]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedSearch(searchInput.trim());
  };

  const handleRetire = async (venue: Venue) => {
    if (!window.confirm(`Retire "${venue.name}"? It will no longer be searchable.`)) return;
    setRetiringId(venue.id);
    const result = await retireVenue(venue.id);
    setRetiringId(null);

    if (!result.ok) {
      window.alert(result.message);
      return;
    }
    if (!result.retired) {
      setBlockedRetire((current) => ({ ...current, [venue.id]: result.blockingBookings }));
      return;
    }
    setBlockedRetire((current) => {
      const { [venue.id]: _dropped, ...rest } = current;
      return rest;
    });
    await load(appliedSearch);
  };

  return (
    <main className="venue-page">
      <header className="page-heading venue-inventory-heading">
        <p className="eyebrow">Venue staff</p>
        <h1>Venue inventory</h1>
        <Link to="/venue/inventory/new" className="primary-action">Add venue</Link>
      </header>

      <form className="venue-search card" role="search" onSubmit={handleSearchSubmit}>
        <label htmlFor="venue-search-input">Search venues</label>
        <input
          id="venue-search-input" type="search" value={searchInput}
          placeholder="Search by venue name" onChange={(event) => setSearchInput(event.target.value)}
        />
        <button type="submit" className="secondary-action"><Search size={14} aria-hidden="true" /> Search</button>
      </form>

      {state.status === 'loading' ? <p role="status">Loading venues…</p> : null}
      {state.status === 'error' ? (
        <div role="alert" className="login-error">
          {state.message}{' '}
          <button type="button" className="secondary-action" onClick={() => load(appliedSearch)}>Try again</button>
        </div>
      ) : null}

      {state.status === 'loaded' ? (
        state.venues.length === 0 ? (
          <p>{appliedSearch ? `No venues match "${appliedSearch}".` : 'No venues yet. Add one to get started.'}</p>
        ) : (
          <>
            {state.venues.length === 100 ? (
              <p className="venue-search-hint">Showing the first 100 matching venues — refine your search to find others.</p>
            ) : null}
            <section className="venue-cards" aria-label="Venue catalogue">
            {state.venues.map((venue) => (
              <article key={venue.id}>
                <header>
                  <strong>{venue.name}</strong>
                </header>
                <p>{venue.location} · {venue.opens_at}–{venue.closes_at}</p>
                <p>
                  Capacity: {venue.max_capacity} · Layouts:{' '}
                  {venue.supported_layouts.map((layout) => `${layout.label} (${layout.capacity})`).join(', ')}
                </p>
                <p><em>Facilities:</em> {venue.facilities.join(', ')}</p>
                <p><em>Accessibility:</em> {venue.accessibility_features.join(', ')}</p>
                {blockedRetire[venue.id] ? (
                  <div role="alert" className="venue-alert-block">
                    <AlertTriangle size={16} aria-hidden="true" /> Cannot retire — future bookings exist:
                    <ul>
                      {blockedRetire[venue.id].map((booking) => (
                        <li key={`${booking.eventCode}-${booking.startsAt}`}>
                          {booking.title} ({booking.eventCode ?? 'no code'}) — {new Date(booking.startsAt).toLocaleString()}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <div className="venue-card-actions">
                  <Link to={`/venue/inventory/${venue.id}/edit`} className="secondary-action">Edit</Link>
                  <button
                    type="button" className="secondary-action" disabled={retiringId === venue.id}
                    onClick={() => handleRetire(venue)}
                  >
                    {retiringId === venue.id ? 'Retiring…' : 'Retire'}
                  </button>
                </div>
              </article>
            ))}
            </section>
          </>
        )
      ) : null}
    </main>
  );
}

export function AvailabilityCalendar() {
  const [selectedVenue, setSelectedVenue] = useState(venues[0].id);
  const cellsForVenue = useMemo(
    () => bookings.filter(booking => booking.venueId === selectedVenue),
    [selectedVenue],
  );
  const conflicts = cellsForVenue.filter(booking => booking.status === 'Blocked').length;
  return (
    <main className="venue-page">
      <header className="venue-heading">
        <p className="eyebrow">Venue staff</p>
        <h1>Availability calendar</h1>
      </header>
      <label className="venue-select">
        <span>Venue</span>
        <select value={selectedVenue} onChange={event => setSelectedVenue(event.target.value)}>
          {venues.map(venue => (<option key={venue.id} value={venue.id}>{venue.name}</option>))}
        </select>
      </label>
      {conflicts > 0 ? (
        <p className="venue-alert"><AlertTriangle size={16} aria-hidden="true" /> {conflicts} conflict(s) on this venue.</p>
      ) : (
        <p className="venue-ok"><CheckCircle2 size={16} aria-hidden="true" /> No conflicts on this venue.</p>
      )}
      <table className="venue-table">
        <thead><tr><th>Booking</th><th>Event</th><th>Date</th><th>Window</th><th>Status</th></tr></thead>
        <tbody>
          {cellsForVenue.map(booking => (
            <tr key={booking.id}>
              <td><Link to={`/venue/bookings/${booking.id}`}>{booking.id}</Link></td>
              <td>{booking.eventTitle}</td>
              <td>{booking.date}</td>
              <td>{booking.window}</td>
              <td><span className={`status-pill status-${statusTone[booking.status]}`}>{booking.status}</span></td>
            </tr>
          ))}
          {cellsForVenue.length === 0 ? (
            <tr><td colSpan={5}>No bookings held for this venue in the current window.</td></tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}

export function PendingBookingDetail() {
  const { bookingId } = useParams();
  const booking = findBooking(bookingId ?? '');
  const venue = booking ? findVenue(booking.venueId) : undefined;
  const [decision, setDecision] = useState<null | 'confirmed' | 'declined'>(null);
  if (!booking || !venue) {
    return (
      <main className="venue-page">
        <h1>Booking not found</h1>
        <Link to="/venue" className="primary-action">Back to dashboard</Link>
      </main>
    );
  }
  return (
    <main className="venue-page">
      <header className="venue-heading">
        <p className="eyebrow">{booking.id}</p>
        <h1>{booking.eventTitle}</h1>
        <span className={`status-pill status-${statusTone[booking.status]}`}>{booking.status}</span>
      </header>
      <section className="venue-detail-grid">
        <article>
          <h2>Requested slot</h2>
          <dl>
            <dt>Date</dt><dd>{booking.date}</dd>
            <dt>Window</dt><dd>{booking.window}</dd>
            <dt>Event code</dt><dd>{booking.eventCode}</dd>
          </dl>
        </article>
        <article>
          <h2>Venue fit</h2>
          <dl>
            <dt>Venue</dt><dd>{venue.name} (capacity {venue.capacity})</dd>
            <dt>Suitability</dt><dd>{booking.suitability}%</dd>
            <dt>Accessibility</dt><dd>{venue.accessibility.join(', ')}</dd>
          </dl>
        </article>
      </section>
      {decision ? (
        <p role="status" className={decision === 'confirmed' ? 'venue-ok' : 'venue-alert'}>
          {decision === 'confirmed' ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          Booking marked {decision} (mock, no backend call).
        </p>
      ) : (
        <div className="venue-decision-actions">
          <button type="button" className="primary-action" onClick={() => setDecision('confirmed')} disabled={booking.status === 'Blocked'}>Confirm booking</button>
          <button type="button" className="secondary-action" onClick={() => setDecision('declined')}>Decline with reason</button>
        </div>
      )}
    </main>
  );
}

// ─── VenueBlockout ───────────────────────────────────────────────────────────

type Blockout = {
  id: string;
  from: string;
  to: string;
  reason: string;
  createdBy: string;
};

const mockBlockouts: Blockout[] = [
  { id: 'b1', from: '2026-10-05', to: '2026-10-06', reason: 'Annual maintenance inspection', createdBy: 'Carol Ng' },
  { id: 'b2', from: '2026-10-14', to: '2026-10-14', reason: 'Emergency electrical repairs', createdBy: 'Carol Ng' },
  { id: 'b3', from: '2026-11-01', to: '2026-11-03', reason: 'Public holiday closure', createdBy: 'Admin' },
];

export function VenueBlockout() {
  const [blockouts, setBlockouts] = useState<Blockout[]>(mockBlockouts);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const errs: Record<string, string> = {};
    if (!from) errs.from = 'Start date is required.';
    if (!to) errs.to = 'End date is required.';
    if (from && to && to < from) errs.to = 'End date must be on or after start date.';
    if (!reason.trim()) errs.reason = 'Reason is required.';
    return errs;
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    const newBlockout: Blockout = {
      id: `b${Date.now()}`,
      from, to, reason,
      createdBy: 'You (mock)',
    };
    setBlockouts(prev => [newBlockout, ...prev]);
    setFrom(''); setTo(''); setReason('');
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  function cancelBlockout(id: string) {
    setBlockouts(prev => prev.filter(b => b.id !== id));
  }

  return (
    <main className="venue-page">
      <header className="venue-heading">
        <p className="eyebrow">Venue staff</p>
        <h1>Block out dates</h1>
      </header>

      <form className="venue-blockout-form" onSubmit={handleSubmit} noValidate>
        <div className="venue-blockout-dates">
          <div className="venue-form-field">
            <label htmlFor="blockout-from">Start date <span aria-hidden="true">*</span></label>
            <input
              id="blockout-from"
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              aria-invalid={Boolean(errors.from)}
              aria-describedby={errors.from ? 'blockout-from-error' : undefined}
            />
            {errors.from && <span id="blockout-from-error" role="alert" className="venue-field-error">{errors.from}</span>}
          </div>
          <div className="venue-form-field">
            <label htmlFor="blockout-to">End date <span aria-hidden="true">*</span></label>
            <input
              id="blockout-to"
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              aria-invalid={Boolean(errors.to)}
              aria-describedby={errors.to ? 'blockout-to-error' : undefined}
            />
            {errors.to && <span id="blockout-to-error" role="alert" className="venue-field-error">{errors.to}</span>}
          </div>
          <div className="venue-form-field venue-form-field-wide">
            <label htmlFor="blockout-reason">Reason <span aria-hidden="true">*</span></label>
            <input
              id="blockout-reason"
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g. Maintenance, public holiday, deep clean"
              aria-invalid={Boolean(errors.reason)}
              aria-describedby={errors.reason ? 'blockout-reason-error' : undefined}
            />
            {errors.reason && <span id="blockout-reason-error" role="alert" className="venue-field-error">{errors.reason}</span>}
          </div>
        </div>
        <button type="submit" className="primary-action">
          <CalendarClock size={14} aria-hidden="true" /> Add blockout
        </button>
        <div role="status" aria-live="polite">
          {saved && <span style={{ fontSize: '0.9rem', color: 'var(--green)' }}>
            <CheckCircle2 size={14} aria-hidden="true" /> Blockout added (mock).
          </span>}
        </div>
      </form>

      <section aria-label="Upcoming blockouts">
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem' }}>Upcoming blockouts</h2>
        {blockouts.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>No upcoming blockouts.</p>
        ) : (
          <table className="venue-table">
            <thead>
              <tr>
                <th scope="col">Dates</th>
                <th scope="col">Reason</th>
                <th scope="col">Created by</th>
                <th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {blockouts.map(b => (
                <tr key={b.id}>
                  <td>
                    <time dateTime={b.from}>{b.from}</time>
                    {b.from !== b.to && <> &ndash; <time dateTime={b.to}>{b.to}</time></>}
                  </td>
                  <td>{b.reason}</td>
                  <td>{b.createdBy}</td>
                  <td>
                    <button
                      type="button"
                      className="secondary-action"
                      style={{ minHeight: '32px', padding: '0 10px', fontSize: '0.82rem' }}
                      onClick={() => cancelBlockout(b.id)}
                    >
                      Cancel
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
