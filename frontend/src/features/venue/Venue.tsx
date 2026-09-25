import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Building2, CalendarClock, CheckCircle2, Search } from 'lucide-react';
import { bookings, findBooking, findVenue, venues, venueSummary, type BookingStatus } from './mocks';
import { listVenues, retireVenue, type BlockingBooking, type Venue } from './venueApi';
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
