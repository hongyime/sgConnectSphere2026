import { Link, useParams } from 'react-router-dom';
import { CalendarClock, ClipboardCheck, ClipboardList } from 'lucide-react';
import { findCoordinatorEvent } from './mocks';
import './coordinator.css';

function CoordinatorNav({ eventCode }: { eventCode?: string }) {
  return (
    <nav className="coordinator-tabs" aria-label="Event workflow">
      {eventCode ? (
        <>
          <Link to={`/coordinator/events/${eventCode}`}>Overview</Link>
          <Link to={`/coordinator/events/${eventCode}/decide`}>Decide</Link>
          <Link to={`/coordinator/events/${eventCode}/plan`}>Plan</Link>
          <Link to={`/coordinator/events/${eventCode}/readiness`}>Readiness</Link>
        </>
      ) : null}
    </nav>
  );
}

export function PlanningWorkspace() {
  const { eventCode } = useParams();
  const event = findCoordinatorEvent(eventCode ?? '');
  if (!event) return <PermissionOrNotFound eventCode={eventCode} />;
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">{event.eventCode}</p>
        <h1>Planning workspace</h1>
      </header>
      <CoordinatorNav eventCode={event.eventCode} />
      <section className="coordinator-grid" aria-label="Planning status">
        <PlanningRow icon={CalendarClock} label="Venue" state={event.planning.venue} link={`/coordinator/events/${event.eventCode}/venues`} />
        <PlanningRow icon={ClipboardList} label="Equipment" state={event.planning.equipment} link={`/coordinator/events/${event.eventCode}/equipment`} />
        <PlanningRow icon={ClipboardCheck} label="Technical support" state={event.planning.technicalSupport} link="/support" />
      </section>
    </main>
  );
}

function PlanningRow({ icon: Icon, label, state, link }: { icon: typeof CalendarClock; label: string; state: string; link: string }) {
  const ready = ['Confirmed', 'Complete', 'Assigned'].includes(state);
  return (
    <article className={`coordinator-plan-row ${ready ? 'coordinator-plan-ready' : 'coordinator-plan-pending'}`}>
      <Icon size={20} aria-hidden="true" />
      <div>
        <strong>{label}</strong>
        <span>{state}</span>
      </div>
      <Link to={link} className="coordinator-plan-link">Open</Link>
    </article>
  );
}

function PermissionOrNotFound({ eventCode }: { eventCode: string | undefined }) {
  return (
    <main className="coordinator-page">
      <header className="coordinator-heading">
        <p className="eyebrow">Coordinator</p>
        <h1>Event not found</h1>
      </header>
      <p>No event matches {eventCode ?? 'the requested identifier'} in your assigned queue.</p>
      <Link to="/coordinator" className="primary-action">Back to dashboard</Link>
    </main>
  );
}
