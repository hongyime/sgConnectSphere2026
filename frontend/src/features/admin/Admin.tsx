import { useMemo, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ScrollText, ShieldCheck, Users } from 'lucide-react';
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
