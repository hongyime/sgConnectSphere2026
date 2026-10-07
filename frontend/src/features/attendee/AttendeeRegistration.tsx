// Attendee registration + withdrawal + feedback screens (E09-S01, E09-S05,
// E09-S06). Each screen uses the same mock event fixture so navigating
// between them reads coherently. Backend calls are not wired here — the
// forms record a mock success via role="status" once the user confirms.

import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock3, MessageSquareText, Ticket } from 'lucide-react';
import './attendee-registration.css';

type AttendeeEvent = {
  eventCode: string;
  title: string;
  venue: string;
  startsAt: string;
  endsAt: string;
  capacity: number;
  registered: number;
  waitlist: number;
  registered_status?: 'registered' | 'waitlisted' | 'withdrawn';
};

const events: AttendeeEvent[] = [
  { eventCode: 'EVT-A01', title: 'International Student Welcome', venue: 'Central Hall',  startsAt: '2026-09-20 10:00', endsAt: '2026-09-20 16:00', capacity: 324, registered: 324, waitlist: 12 },
  { eventCode: 'EVT-A02', title: 'Career Insight Panel',          venue: 'Auditorium B',  startsAt: '2026-10-04 18:00', endsAt: '2026-10-04 21:00', capacity: 180, registered: 180, waitlist:  5, registered_status: 'waitlisted' },
  { eventCode: 'EVT-A03', title: 'Sustainability Forum',          venue: 'Green Pavilion', startsAt: '2026-10-08 09:00', endsAt: '2026-10-08 17:00', capacity: 220, registered: 100, waitlist:  0, registered_status: 'registered' },
];

function findEvent(code: string) {
  return events.find(event => event.eventCode === code);
}

export function EventDiscovery() {
  return (
    <main className="attendee-registration-page">
      <header className="attendee-registration-heading">
        <p className="eyebrow">Attendee</p>
        <h1>Discover events</h1>
      </header>
      <section className="attendee-registration-list" aria-label="Published events">
        {events.map(event => (
          <Link key={event.eventCode} to={`/attendee/discover/${event.eventCode}`} className="attendee-registration-row">
            <div>
              <strong>{event.title}</strong>
              <small>{event.eventCode} · {event.venue} · {event.startsAt.split(' ')[0]}</small>
            </div>
            <span className="attendee-registration-capacity">
              {event.registered} / {event.capacity} seats
            </span>
          </Link>
        ))}
      </section>
    </main>
  );
}

export function EventDetail() {
  const { eventCode } = useParams();
  const event = findEvent(eventCode ?? '');
  if (!event) return <NotFound eventCode={eventCode} />;
  const full = event.registered >= event.capacity;
  return (
    <main className="attendee-registration-page">
      <header className="attendee-registration-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>{event.title}</h1>
      </header>
      <section className="attendee-registration-detail" aria-label="Event summary">
        <dl>
          <dt>Venue</dt><dd>{event.venue}</dd>
          <dt>Starts</dt><dd>{event.startsAt}</dd>
          <dt>Ends</dt><dd>{event.endsAt}</dd>
          <dt>Capacity</dt><dd>{event.registered} / {event.capacity} registered</dd>
          <dt>Waitlist</dt><dd>{event.waitlist} on waitlist</dd>
        </dl>
      </section>
      <div className="attendee-registration-actions">
        {event.registered_status === 'registered' ? (
          <>
            <p role="status">You are registered for this event.</p>
            <Link to={`/attendee/withdraw/${event.eventCode}`} className="secondary-action">
              <Clock3 size={14} aria-hidden="true" /> Withdraw
            </Link>
            <Link to={`/attendee/feedback/${event.eventCode}`} className="secondary-action">
              <MessageSquareText size={14} aria-hidden="true" /> Leave feedback
            </Link>
          </>
        ) : event.registered_status === 'waitlisted' ? (
          <>
            <p role="status">You are on the waitlist.</p>
            <Link to={`/attendee/withdraw/${event.eventCode}`} className="secondary-action">Leave the waitlist</Link>
          </>
        ) : (
          <Link to={`/attendee/register/${event.eventCode}`} className="primary-action">
            <Ticket size={14} aria-hidden="true" /> {full ? 'Join waitlist' : 'Register'}
          </Link>
        )}
      </div>
    </main>
  );
}

export function RegisterForEvent() {
  const { eventCode } = useParams();
  const event = findEvent(eventCode ?? '');
  const [confirmed, setConfirmed] = useState(false);
  if (!event) return <NotFound eventCode={eventCode} />;
  const willWaitlist = event.registered >= event.capacity;
  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setConfirmed(true);
  }
  return (
    <main className="attendee-registration-page">
      <header className="attendee-registration-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>{willWaitlist ? 'Join the waitlist' : 'Register for the event'}</h1>
      </header>
      <p>You are about to {willWaitlist ? 'join the waitlist for' : 'register for'} <strong>{event.title}</strong> on {event.startsAt}.</p>
      {confirmed ? (
        <p role="status" className="attendee-registration-ok">
          <CheckCircle2 size={16} aria-hidden="true" />
          {willWaitlist ? 'You are on the waitlist. We will email you if a seat opens.' : 'You are registered. See you there.'}
        </p>
      ) : (
        <form onSubmit={submit} className="attendee-registration-form">
          <label>
            <input type="checkbox" required />
            <span>I agree to the attendance policy and understand that a withdrawal deadline applies.</span>
          </label>
          <button type="submit" className="primary-action">
            <Ticket size={14} aria-hidden="true" /> {willWaitlist ? 'Join waitlist' : 'Confirm registration'}
          </button>
        </form>
      )}
      <Link to={`/attendee/discover/${event.eventCode}`} className="secondary-action">Back to event</Link>
    </main>
  );
}

export function WithdrawFromEvent() {
  const { eventCode } = useParams();
  const event = findEvent(eventCode ?? '');
  const [confirmed, setConfirmed] = useState(false);
  const [reason, setReason] = useState('');
  if (!event) return <NotFound eventCode={eventCode} />;
  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (!reason.trim()) return;
    setConfirmed(true);
  }
  return (
    <main className="attendee-registration-page">
      <header className="attendee-registration-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Withdraw</h1>
      </header>
      <p>Withdrawing releases your place. If the withdrawal deadline has passed, the seat is not returned automatically.</p>
      {confirmed ? (
        <p role="status" className="attendee-registration-ok">
          <CheckCircle2 size={16} aria-hidden="true" />
          Your withdrawal has been recorded.
        </p>
      ) : (
        <form onSubmit={submit} className="attendee-registration-form">
          <label htmlFor="withdraw-reason">Reason (required)</label>
          <textarea
            id="withdraw-reason"
            rows={4}
            required
            value={reason}
            onChange={changeEvent => setReason(changeEvent.target.value)}
          />
          <button type="submit" className="primary-action" disabled={!reason.trim()}>Confirm withdrawal</button>
        </form>
      )}
    </main>
  );
}

export function EventFeedback() {
  const { eventCode } = useParams();
  const event = findEvent(eventCode ?? '');
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  if (!event) return <NotFound eventCode={eventCode} />;
  function submit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    if (rating === null) return;
    setSubmitted(true);
  }
  return (
    <main className="attendee-registration-page">
      <header className="attendee-registration-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Feedback</h1>
      </header>
      {submitted ? (
        <p role="status" className="attendee-registration-ok">
          <CheckCircle2 size={16} aria-hidden="true" />
          Thanks for the feedback.
        </p>
      ) : (
        <form onSubmit={submit} className="attendee-registration-form">
          <fieldset>
            <legend>How was it?</legend>
            {[1, 2, 3, 4, 5].map(value => (
              <label key={value} className="attendee-registration-rating">
                <input type="radio" name="rating" value={value} checked={rating === value} onChange={() => setRating(value)} />
                <span>{value}</span>
              </label>
            ))}
          </fieldset>
          <label htmlFor="feedback-comment">Comment (optional)</label>
          <textarea id="feedback-comment" rows={4} value={comment} onChange={changeEvent => setComment(changeEvent.target.value)} />
          <button type="submit" className="primary-action" disabled={rating === null}>Send feedback</button>
        </form>
      )}
    </main>
  );
}

function NotFound({ eventCode }: { eventCode: string | undefined }) {
  return (
    <main className="attendee-registration-page">
      <header className="attendee-registration-heading">
        <p className="eyebrow">Attendee</p>
        <h1>Event not found</h1>
      </header>
      <p>No event matches {eventCode ?? 'the requested identifier'}.</p>
      <Link to="/attendee/discover" className="primary-action">Back to discovery</Link>
    </main>
  );
}
