import { useId, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Building2, CalendarClock, CheckCircle2, PencilLine, Plus, Search } from 'lucide-react';
import {
  Alert, Button, ButtonLink, ConfirmPanel, EmptyState, ErrorState, FactList, LoadingState, PageLayout, formatDate, useLoad,
} from '../../shared';
import { bookings, findBooking, findVenue, venues, venueSummary, type BookingStatus } from './mocks';
import { listVenues, retireVenue, VENUE_LIST_LIMIT, type BlockingBooking, type Venue } from './venueApi';
import { VenueCalendar } from './VenueCalendar';
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

// E05-S01 / E05-S02 venue catalogue for Venue Staff, on the shared blocks
// (ADR-017). Search runs on submit; retiring asks for confirmation inline and
// lists any future bookings that stop it (Scenario 4).
export function VenueInventory() {
  // Search input the user is typing; only takes effect on submit. Kept
  // separate from the term actually sent to the API so a reload after a
  // retire re-runs the last submitted search, not an in-progress edit.
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [retired, setRetired] = useState<string | null>(null);
  const { result, reload } = useLoad(signal => listVenues(appliedSearch, signal), [appliedSearch]);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRetired(null);
    setAppliedSearch(searchInput.trim());
  };

  return (
    <PageLayout
      eyebrow="Venue staff"
      title="Venue inventory"
      actions={<ButtonLink to="/venue/inventory/new" variant="primary" icon={<Plus size={14} aria-hidden="true" />}>Add venue</ButtonLink>}
    >
      <form className="venue-search card" role="search" onSubmit={handleSearchSubmit}>
        <label htmlFor="venue-search-input">Search venues</label>
        <input
          id="venue-search-input" type="search" value={searchInput}
          placeholder="Search by venue name" onChange={(event) => setSearchInput(event.target.value)}
        />
        <Button type="submit" icon={<Search size={14} aria-hidden="true" />}>Search</Button>
      </form>

      <div aria-live="polite" className="venue-live">
        {retired ? <Alert tone="success">{retired}</Alert> : null}
      </div>

      {result.state === 'loading' ? <LoadingState label="Loading venues…" rows={3} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} onRetry={reload} context="the venue catalogue" /> : null}
      {result.state === 'ready' ? (
        result.data.length === 0 ? (
          appliedSearch ? (
            <EmptyState title={`No venues match “${appliedSearch}”`}>Check the spelling, or search for part of the name.</EmptyState>
          ) : (
            <EmptyState
              title="No venues yet"
              icon={<Building2 size={22} />}
              action={<ButtonLink to="/venue/inventory/new" variant="primary">Add venue</ButtonLink>}
            >
              Add your first venue so Coordinators can find and book it.
            </EmptyState>
          )
        ) : (
          <>
            {result.data.length === VENUE_LIST_LIMIT ? (
              <p className="venue-search-hint">Showing the first {VENUE_LIST_LIMIT} matching venues. Refine your search to find others.</p>
            ) : null}
            <section className="venue-cards" aria-label="Venue catalogue">
              {result.data.map((venue) => (
                <VenueCard
                  key={venue.id}
                  venue={venue}
                  onRetired={() => {
                    setRetired(`Retired ${venue.name}. It no longer appears in venue search.`);
                    reload();
                  }}
                />
              ))}
            </section>
          </>
        )
      ) : null}
    </PageLayout>
  );
}

function VenueCard({ venue, onRetired }: { venue: Venue; onRetired: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocking, setBlocking] = useState<BlockingBooking[] | null>(null);
  const headingId = useId();

  async function retire() {
    setBusy(true);
    setError(null);
    const result = await retireVenue(venue.id);
    setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    if (!result.data.retired) {
      setBlocking(result.data.blockingBookings);
      setConfirming(false);
      return;
    }
    onRetired();
  }

  const list = (items: string[]) => items.join(', ');
  return (
    <article className="card venue-card" aria-labelledby={headingId}>
      <h2 id={headingId}>{venue.name}</h2>
      <FactList
        columns={2}
        items={[
          ['Location', venue.location],
          ['Opening hours', `${venue.opens_at}–${venue.closes_at}`],
          ['Max capacity', venue.max_capacity.toLocaleString('en-SG')],
          ['Layouts', list(venue.supported_layouts.map((layout) => `${layout.label} (${layout.capacity})`))],
          ['Facilities', list(venue.facilities)],
          ['Accessibility', list(venue.accessibility_features)],
        ]}
      />
      {blocking ? (
        <Alert tone="warning" title="Can't retire this venue yet">
          These future bookings still use it. Move or cancel them first:
          <ul className="venue-blocking">
            {blocking.map((booking) => (
              <li key={`${booking.eventCode}-${booking.startsAt}`}>
                {booking.title} ({booking.eventCode ?? 'no code'}), {formatDate(booking.startsAt, true)}
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}
      {confirming ? (
        <ConfirmPanel
          title={`Retire ${venue.name}?`}
          description="It will no longer appear in venue search. Its past bookings are kept."
          confirmLabel="Retire venue"
          danger
          busy={busy}
          error={error ?? undefined}
          onConfirm={retire}
          onCancel={() => { setConfirming(false); setError(null); }}
        />
      ) : (
        <div className="venue-card-actions">
          <ButtonLink to={`/venue/inventory/${venue.id}/edit`} icon={<PencilLine size={14} aria-hidden="true" />}>Edit</ButtonLink>
          <Button variant="danger" onClick={() => { setConfirming(true); setBlocking(null); }}>Retire</Button>
        </div>
      )}
    </article>
  );
}

// E05-S03: the live calendar replaced the fixture table that used to live
// here. The export name is kept so the /venue/availability route is unchanged.
export function AvailabilityCalendar() {
  return <VenueCalendar audience="venue" />;
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
