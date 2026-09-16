import { Link } from 'react-router-dom';
import { CalendarDays, ClipboardList, MapPinned, ShieldCheck } from 'lucide-react';
import './landing.css';

const highlights = [
  { icon: ClipboardList, title: 'Organiser workflows', copy: 'Draft, submit, and track event requests without email chains.' },
  { icon: CalendarDays,  title: 'Coordinator triage', copy: 'Review, clarify, decide, and confirm event readiness in one queue.' },
  { icon: MapPinned,     title: 'Venue and support', copy: 'Manage venue capacity, availability, equipment, and support staffing.' },
  { icon: ShieldCheck,   title: 'Role-scoped access', copy: 'Every role sees only the events, planning, and audit trails they own.' },
];

export function LandingPage() {
  return (
    <main className="landing-page">
      <section className="landing-hero">
        <p className="landing-eyebrow">SG ConnectSphere</p>
        <h1>Coordinate every event that your school runs.</h1>
        <p className="landing-lede">
          One place for organisers to request events, for coordinators to plan them, and for venue,
          support, and attendees to track the outcome.
        </p>
        <div className="landing-actions">
          <Link className="landing-primary" to="/login">Sign in</Link>
          <Link className="landing-secondary" to="/register">Create an attendee account</Link>
        </div>
      </section>
      <section className="landing-highlights" aria-label="What you can do">
        {highlights.map(({ icon: Icon, title, copy }) => (
          <article key={title}>
            <Icon size={22} aria-hidden="true" />
            <h2>{title}</h2>
            <p>{copy}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
