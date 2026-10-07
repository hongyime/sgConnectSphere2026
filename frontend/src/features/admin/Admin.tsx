import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarChart3, CheckCircle2, ScrollText, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { adminSummary, auditLog, findUser, users, type UserRole } from './mocks';
import './admin.css';

const roleLabel: Record<UserRole, string> = {
  attendee:          'Attendee',
  event_organiser:   'Event Organiser',
  event_coordinator: 'Event Coordinator',
  venue_staff:       'Venue Staff',
  technical_support: 'Technical Support',
  admin:             'Admin',
};

export function AdminHome() {
  return (
    <main className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">Admin workspace</p>
        <h1>System overview</h1>
      </header>
      <section className="admin-metrics" aria-label="System counts">
        <article><span>Active users</span><strong>{adminSummary.activeUsers}</strong></article>
        <article><span>Total users</span><strong>{adminSummary.totalUsers}</strong></article>
        <article><span>Audit entries</span><strong>{adminSummary.auditEntries}</strong></article>
      </section>
      <p className="admin-footer">
        <Link to="/admin/users"><Users size={14} aria-hidden="true" /> Manage users</Link>
        <Link to="/admin/audit"><ScrollText size={14} aria-hidden="true" /> Audit log</Link>
      </p>
    </main>
  );
}

export function UserManagement() {
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const filtered = useMemo(
    () => roleFilter === 'all' ? users : users.filter(user => user.role === roleFilter),
    [roleFilter],
  );
  return (
    <main className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">Admin</p>
        <h1>User management</h1>
      </header>
      <div className="admin-filters" role="group" aria-label="Role filter">
        <button type="button" onClick={() => setRoleFilter('all')} aria-pressed={roleFilter === 'all'}>All ({users.length})</button>
        {(['event_organiser', 'event_coordinator', 'venue_staff', 'technical_support', 'admin'] as UserRole[]).map(role => (
          <button type="button" key={role} onClick={() => setRoleFilter(role)} aria-pressed={roleFilter === role}>{roleLabel[role]}</button>
        ))}
      </div>
      <table className="admin-table">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Client org</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {filtered.map(user => (
            <tr key={user.id}>
              <td>{user.fullName}</td>
              <td>{user.email}</td>
              <td>{roleLabel[user.role]}</td>
              <td>{user.clientOrg ?? '—'}</td>
              <td>{user.isActive ? 'Yes' : 'No'}</td>
              <td><Link to={`/admin/users/${user.id}/role`}>Change role</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

export function RoleAssignment() {
  const { userId } = useParams();
  const user = findUser(userId ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'attendee');
  const [saved, setSaved] = useState(false);
  if (!user) {
    return (
      <main className="admin-page">
        <h1>User not found</h1>
        <Link to="/admin/users" className="primary-action">Back to user list</Link>
      </main>
    );
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(true);
  }
  return (
    <main className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">{user.id}</p>
        <h1>Assign role — {user.fullName}</h1>
      </header>
      <form onSubmit={submit} className="admin-form">
        <label htmlFor="role">Role</label>
        <select id="role" value={role} onChange={event => setRole(event.target.value as UserRole)}>
          {(Object.keys(roleLabel) as UserRole[]).map(option => (
            <option key={option} value={option}>{roleLabel[option]}</option>
          ))}
        </select>
        <button type="submit" className="primary-action"><ShieldCheck size={14} aria-hidden="true" /> Save role</button>
        <div role="status" aria-live="polite">
          {saved ? <><CheckCircle2 size={14} aria-hidden="true" /> Role saved (mock, no backend call).</> : null}
        </div>
      </form>
    </main>
  );
}

export function AuditLogViewer() {
  const [query, setQuery] = useState('');
  const filtered = useMemo(() => {
    const lowered = query.toLowerCase().trim();
    if (!lowered) return auditLog;
    return auditLog.filter(entry =>
      entry.actor.toLowerCase().includes(lowered)
      || entry.action.toLowerCase().includes(lowered)
      || entry.entity.toLowerCase().includes(lowered)
      || entry.detail.toLowerCase().includes(lowered)
    );
  }, [query]);
  return (
    <main className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">Admin</p>
        <h1>Audit log</h1>
      </header>
      <label className="admin-form" style={{ padding: '0.75rem 1rem' }}>
        <span>Filter</span>
        <input value={query} onChange={event => setQuery(event.target.value)} placeholder="actor, action, or entity" />
      </label>
      <ul className="admin-audit">
        {filtered.map(entry => (
          <li key={entry.id}>
            <strong>{entry.action}</strong> — {entry.entity}
            <br />
            <span>{entry.at} · {entry.actor}</span>
            <p>{entry.detail}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

// ─── ReportingDashboard ──────────────────────────────────────────────────────

const reportMetrics = [
  { label: 'Events this month', value: '12' },
  { label: 'Active coordinators', value: '5' },
  { label: 'Avg lead time (days)', value: '14' },
];

const recentEvents = [
  { id: 'e1', title: 'Annual Sustainability Forum', organiser: 'Alice Tan', date: '2026-10-08', status: 'Approved' },
  { id: 'e2', title: 'Faculty Career Mixer', organiser: 'Alice Tan', date: '2026-09-25', status: 'Confirmed' },
  { id: 'e3', title: 'Design Studio Recital', organiser: 'Bob Lim', date: '2026-11-04', status: 'Draft' },
  { id: 'e4', title: 'Tech Workshop Q4', organiser: 'Carol Ng', date: '2026-10-20', status: 'Under review' },
  { id: 'e5', title: 'Year-End Gala', organiser: 'Dan Wu', date: '2026-12-12', status: 'Planning' },
];

const reportStatusTone: Record<string, string> = {
  Draft: 'neutral', Submitted: 'info', 'Under review': 'info',
  Approved: 'success', Confirmed: 'success', Planning: 'info',
  Rejected: 'danger', Cancelled: 'neutral',
};

export function ReportingDashboard() {
  return (
    <main className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">Admin</p>
        <h1>Reporting</h1>
      </header>

      <section className="admin-metrics" aria-label="Key metrics">
        {reportMetrics.map(m => (
          <article key={m.label}>
            <span>{m.label}</span>
            <strong>{m.value}</strong>
          </article>
        ))}
      </section>

      <div className="admin-chart-placeholder">
        <BarChart3 size={26} aria-hidden="true" />
        <p>Charts coming in a future sprint.</p>
        <span>This area will show event volume trends, lead time distributions, and venue utilisation over time.</span>
      </div>

      <section aria-label="Recent events">
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.05rem' }}>Recent events</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th scope="col">Event</th>
              <th scope="col">Organiser</th>
              <th scope="col">Date</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {recentEvents.map(e => (
              <tr key={e.id}>
                <td>{e.title}</td>
                <td>{e.organiser}</td>
                <td>{e.date}</td>
                <td><span className={`status-pill status-${reportStatusTone[e.status] ?? 'neutral'}`}>{e.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

// ─── DigestPreferences ───────────────────────────────────────────────────────

const eventTypeOptions = [
  'New submissions', 'Approvals', 'Cancellations', 'Comments', 'Venue blockouts',
];

const deliveryTimes = ['06:00', '08:00', '09:00', '12:00', '17:00', '20:00'];

export function DigestPreferences() {
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'none'>('daily');
  const [eventTypes, setEventTypes] = useState<string[]>(['New submissions', 'Approvals', 'Cancellations']);
  const [deliveryTime, setDeliveryTime] = useState('08:00');
  const [saved, setSaved] = useState(false);

  function toggleType(type: string) {
    setEventTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  }

  function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <main className="admin-page" style={{ maxWidth: '42rem' }}>
      <header className="admin-heading">
        <p className="eyebrow">Admin</p>
        <h1>Digest preferences</h1>
      </header>

      <form onSubmit={handleSave} noValidate>
        <div className="admin-pref-section">
          <h2>Frequency</h2>
          <div className="admin-radio-group" role="radiogroup" aria-label="Digest frequency">
            {(['daily', 'weekly', 'none'] as const).map(f => (
              <label key={f} className="admin-radio-label">
                <input
                  type="radio"
                  name="frequency"
                  value={f}
                  checked={frequency === f}
                  onChange={() => setFrequency(f)}
                />
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </label>
            ))}
          </div>
        </div>

        <div className="admin-pref-section">
          <h2>Event types to include</h2>
          <div className="admin-checkbox-group">
            {eventTypeOptions.map(opt => (
              <label key={opt} className="admin-checkbox-label">
                <input
                  type="checkbox"
                  checked={eventTypes.includes(opt)}
                  onChange={() => toggleType(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>

        <div className="admin-pref-section">
          <h2>Delivery time</h2>
          <div className="admin-form" style={{ padding: '0', border: '0', borderRadius: '0', background: 'transparent', maxWidth: 'none' }}>
            <label htmlFor="delivery-time">Send digest at</label>
            <select id="delivery-time" value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)}>
              {deliveryTimes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button type="submit" className="primary-action">
            <CheckCircle2 size={14} aria-hidden="true" /> Save preferences
          </button>
          <div role="status" aria-live="polite" style={{ fontSize: '0.9rem', color: 'var(--green)' }}>
            {saved && 'Preferences saved (mock).'}
          </div>
        </div>
      </form>
    </main>
  );
}

// ─── Recommendations ──────────────────────────────────────────────────────────

type Recommendation = {
  id: string;
  title: string;
  context: string;
};

const initialRecommendations: Recommendation[] = [
  { id: 'r1', title: 'Set a lead-time policy', context: 'Average event lead time has fallen below 10 days. Consider requiring requests at least 14 days in advance.' },
  { id: 'r2', title: 'Review inactive coordinators', context: '2 coordinators have had no assignments in the past 60 days. Consider reassigning or archiving their accounts.' },
  { id: 'r3', title: 'Enable weekly digest for all staff', context: 'Only 3 of 12 staff members have enabled email digests. Enabling by default reduces missed updates.' },
];

export function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>(initialRecommendations);
  const [applied, setApplied] = useState<string[]>([]);

  function dismiss(id: string) {
    setRecs(prev => prev.filter(r => r.id !== id));
  }

  function apply(id: string) {
    setApplied(prev => [...prev, id]);
    setTimeout(() => {
      setRecs(prev => prev.filter(r => r.id !== id));
      setApplied(prev => prev.filter(x => x !== id));
    }, 1500);
  }

  return (
    <main className="admin-page">
      <header className="admin-heading">
        <p className="eyebrow">Admin</p>
        <h1>Recommendations</h1>
      </header>

      {recs.length === 0 ? (
        <div className="admin-empty-state">
          <Sparkles size={26} aria-hidden="true" />
          <h3>No recommendations right now</h3>
          <p>Check back later — recommendations appear based on system activity.</p>
        </div>
      ) : (
        <ul className="admin-rec-list" aria-label="Recommendations">
          {recs.map(rec => (
            <li key={rec.id} className="admin-rec-card">
              <div className="admin-rec-body">
                <h3>{rec.title}</h3>
                <p>{rec.context}</p>
              </div>
              <div className="admin-rec-actions">
                <button
                  type="button"
                  className="primary-action"
                  onClick={() => apply(rec.id)}
                  disabled={applied.includes(rec.id)}
                >
                  <CheckCircle2 size={14} aria-hidden="true" />
                  {applied.includes(rec.id) ? 'Applying…' : 'Apply'}
                </button>
                <button type="button" className="secondary-action" onClick={() => dismiss(rec.id)}>
                  Dismiss
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
