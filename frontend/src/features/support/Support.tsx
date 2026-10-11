import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, PackageOpen, Wrench } from 'lucide-react';
import {
  equipmentTypes, requests, supportSummary, technicians,
  type ReservationState,
} from './mocks';
import './support.css';

const stateTone: Record<ReservationState, string> = {
  Requested: 'warning',
  Reserved:  'info',
  Partial:   'warning',
  Fulfilled: 'success',
  Shortfall: 'danger',
};

export function EquipmentDashboard() {
  return (
    <main className="support-page">
      <header className="support-heading">
        <p className="eyebrow">Technical support</p>
        <h1>Equipment dashboard</h1>
      </header>
      <section className="support-metrics" aria-label="Inventory health">
        <article><span>Open requests</span><strong>{supportSummary.openRequests}</strong></article>
        <article><span>Shortfalls</span><strong>{supportSummary.shortfalls}</strong></article>
        <article><span>Items offline</span><strong>{supportSummary.offlineItems}</strong></article>
        <article><span>Equipment types</span><strong>{equipmentTypes.length}</strong></article>
      </section>
      <section className="support-list" aria-label="Recent equipment requests">
        <h2>Recent requests</h2>
        {requests.map(request => (
          <Link key={request.id} to={`/support/requests/${request.id}`} className="support-row">
            <div>
              <strong>{request.eventTitle}</strong>
              <small>{request.eventCode} · {request.eventDate} · {request.items.length} item type(s)</small>
            </div>
            <span className={`status-pill status-${stateTone[request.state]}`}>{request.state}</span>
          </Link>
        ))}
      </section>
      <p className="support-footer">
        <Link to="/support/catalogue"><PackageOpen size={14} aria-hidden="true" /> Equipment catalogue</Link>
        <Link to="/support/technicians"><Wrench size={14} aria-hidden="true" /> Technician assignment</Link>
      </p>
    </main>
  );
}

export function TechnicianAssignment() {
  return (
    <main className="support-page">
      <header className="support-heading">
        <p className="eyebrow">Technical support</p>
        <h1>Technician assignment</h1>
      </header>
      <section className="support-cards" aria-label="Technicians">
        {technicians.map(technician => (
          <article key={technician.id}>
            <header>
              <strong>{technician.name}</strong>
              <span className={`status-pill status-${technician.assignments.length > 0 ? 'info' : 'success'}`}>
                {technician.assignments.length > 0 ? `Assigned to ${technician.assignments.join(', ')}` : 'Available'}
              </span>
            </header>
            <p><em>Assigned events:</em> {technician.assignments.length > 0 ? technician.assignments.join(', ') : 'None'}</p>
            <p><em>Open availability for:</em> {technician.availableEvents.join(', ')}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export function ConflictState() {
  const shortfall = requests.filter(request => request.state === 'Shortfall');
  return (
    <main className="support-page">
      <header className="support-heading">
        <p className="eyebrow">Technical support</p>
        <h1>Conflict state</h1>
      </header>
      {shortfall.length === 0 ? (
        <p className="support-ok"><CheckCircle2 size={16} aria-hidden="true" /> No open conflicts.</p>
      ) : (
        <>
          <p className="support-alert"><AlertTriangle size={16} aria-hidden="true" /> {shortfall.length} request(s) with shortfall.</p>
          <ul className="support-lineitems">
            {shortfall.map(request => (
              <li key={request.id}>
                <strong>{request.eventTitle}</strong>
                <span>{request.eventCode} — <Link to={`/support/requests/${request.id}`}>open reservation</Link></span>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
