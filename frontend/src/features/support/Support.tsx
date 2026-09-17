import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, PackageOpen, Wrench } from 'lucide-react';
import {
  equipmentTypes, findEquipmentType, findRequest, requests, supportSummary, technicians,
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

export function EquipmentCatalogue() {
  return (
    <main className="support-page">
      <header className="support-heading">
        <p className="eyebrow">Technical support</p>
        <h1>Equipment catalogue</h1>
      </header>
      <section className="support-cards" aria-label="Equipment inventory">
        {equipmentTypes.map(equipment => (
          <article key={equipment.id}>
            <header>
              <strong>{equipment.name}</strong>
              <span className={`status-pill status-${equipment.status === 'Available' ? 'success' : 'warning'}`}>{equipment.status}</span>
            </header>
            <p>Operational: {equipment.operationalUnits} / {equipment.totalUnits}</p>
            <p><em>Location:</em> {equipment.location}</p>
          </article>
        ))}
      </section>
    </main>
  );
}

export function RequestQueue() {
  const [state, setState] = useState<'all' | ReservationState>('all');
  const filtered = useMemo(
    () => state === 'all' ? requests : requests.filter(request => request.state === state),
    [state],
  );
  return (
    <main className="support-page">
      <header className="support-heading">
        <p className="eyebrow">Technical support</p>
        <h1>Request queue</h1>
      </header>
      <div className="support-filters" role="group" aria-label="Queue filter">
        <button type="button" onClick={() => setState('all')} aria-pressed={state === 'all'}>All</button>
        {(['Requested', 'Partial', 'Shortfall', 'Fulfilled'] as ReservationState[]).map(option => (
          <button type="button" key={option} onClick={() => setState(option)} aria-pressed={state === option}>{option}</button>
        ))}
      </div>
      <table className="support-table">
        <thead><tr><th>Request</th><th>Event</th><th>Date</th><th>Items</th><th>State</th></tr></thead>
        <tbody>
          {filtered.map(request => (
            <tr key={request.id}>
              <td><Link to={`/support/requests/${request.id}`}>{request.id}</Link></td>
              <td>{request.eventTitle}</td>
              <td>{request.eventDate}</td>
              <td>{request.items.length}</td>
              <td><span className={`status-pill status-${stateTone[request.state]}`}>{request.state}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export function ReservationDetail() {
  const { requestId } = useParams();
  const request = findRequest(requestId ?? '');
  const [decision, setDecision] = useState<null | 'reserved' | 'shortfall'>(null);
  if (!request) {
    return (
      <main className="support-page">
        <h1>Request not found</h1>
        <Link to="/support" className="primary-action">Back to dashboard</Link>
      </main>
    );
  }
  const totalRequested = request.items.reduce((accumulator, item) => accumulator + item.requested, 0);
  const totalReserved  = request.items.reduce((accumulator, item) => accumulator + item.reserved, 0);
  return (
    <main className="support-page">
      <header className="support-heading">
        <p className="eyebrow">{request.id}</p>
        <h1>{request.eventTitle}</h1>
        <span className={`status-pill status-${stateTone[request.state]}`}>{request.state}</span>
      </header>
      <section className="support-detail-grid">
        <article>
          <h2>Summary</h2>
          <dl>
            <dt>Event code</dt><dd>{request.eventCode}</dd>
            <dt>Date</dt><dd>{request.eventDate}</dd>
            <dt>Technician support needed</dt><dd>{request.supportNeeded ? 'Yes' : 'No'}</dd>
            <dt>Fulfilment</dt><dd>{totalReserved} of {totalRequested} units reserved</dd>
          </dl>
        </article>
        <article>
          <h2>Line items</h2>
          <ul className="support-lineitems">
            {request.items.map(item => {
              const equipment = findEquipmentType(item.typeId);
              const shortfall = Math.max(item.requested - item.reserved, 0);
              return (
                <li key={item.typeId}>
                  <strong>{equipment?.name ?? item.typeId}</strong>
                  <span>{item.reserved} / {item.requested}{shortfall ? ` (shortfall ${shortfall})` : ''}</span>
                </li>
              );
            })}
          </ul>
        </article>
      </section>
      {decision ? (
        <p role="status" className={decision === 'reserved' ? 'support-ok' : 'support-alert'}>
          {decision === 'reserved' ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          {decision === 'reserved' ? 'Reservation confirmed (mock, no backend call).' : 'Shortfall recorded and coordinator notified (mock, no backend call).'}
        </p>
      ) : (
        <div className="support-actions">
          <button type="button" className="primary-action" onClick={() => setDecision('reserved')} disabled={totalReserved >= totalRequested}>Confirm reservation</button>
          <button type="button" className="secondary-action" onClick={() => setDecision('shortfall')}>Record shortfall</button>
        </div>
      )}
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
