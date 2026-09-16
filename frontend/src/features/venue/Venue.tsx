import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, Building2, CalendarClock, CheckCircle2 } from 'lucide-react';
import { bookings, findBooking, findVenue, venues, venueSummary, type BookingStatus } from './mocks';
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

export function VenueInventory() {
  return (
    <main className="venue-page">
      <header className="venue-heading">
        <p className="eyebrow">Venue staff</p>
        <h1>Venue inventory</h1>
      </header>
      <section className="venue-cards" aria-label="Venue catalogue">
        {venues.map(venue => (
          <article key={venue.id}>
            <header>
              <strong>{venue.name}</strong>
              <span className={`status-pill status-${venue.status === 'Available' ? 'success' : 'warning'}`}>{venue.status}</span>
            </header>
            <p>Capacity: {venue.capacity} · Layouts: {venue.layouts.join(', ')}</p>
            <p><em>Facilities:</em> {venue.facilities.join(', ')}</p>
            <p><em>Accessibility:</em> {venue.accessibility.join(', ')}</p>
          </article>
        ))}
      </section>
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
