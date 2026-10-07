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

  // The confirm step takes the card's place rather than nesting a card in it.
  if (confirming) {
    return (
      <ConfirmPanel
        title={`Retire ${venue.name}?`}
        description={`${venue.name} (${venue.location}) will no longer appear in venue search. Its past bookings are kept.`}
        confirmLabel="Retire venue"
        danger
        busy={busy}
        error={error ?? undefined}
        onConfirm={retire}
        onCancel={() => { setConfirming(false); setError(null); }}
      />
    );
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
      <div className="venue-card-actions">
        <ButtonLink to={`/venue/inventory/${venue.id}/edit`} icon={<PencilLine size={14} aria-hidden="true" />}>Edit</ButtonLink>
        <Button variant="danger" onClick={() => { setConfirming(true); setBlocking(null); }}>Retire…</Button>
      </div>
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
