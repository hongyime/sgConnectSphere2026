// Operations feature screens (Batch 5 handoff). Covers shared cross-role
// screens from the roleAreas 'operations' area:
// - AuditHistory (/audit) — E14-S02 cross-role activity log
// - CommentsActivity (/comments) — E03-S06 threaded event comments
// - SearchFilter (/search) — E06-S01 venue search
// - EmptyErrorLoading (/ui-states) — E13-S02 design-system state reference
//
// All screens use mock data. No backend calls; mutating actions surface
// a role="status" mock success. See Amareet's handoff notes in PR body.

import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle, History, MessageCircle, Search, Sparkles,
} from 'lucide-react';
import './operations.css';

// ─── Mock data ───────────────────────────────────────────────────────────────

type AuditRole = 'Organiser' | 'Coordinator' | 'Venue' | 'Support' | 'Admin';
type AuditEntity = 'Event' | 'Booking' | 'Account' | 'Venue';

type AuditEntry = {
  id: string;
  actor: string;
  role: AuditRole;
  action: string;
  entity: AuditEntity;
  label: string;
  timestamp: string;
};

const auditEntries: AuditEntry[] = [
  { id: 'a1', actor: 'Alice Tan', role: 'Organiser',   action: 'Submitted event request',    entity: 'Event',   label: 'EVT-001 Annual Gala', timestamp: '2026-09-25 14:32' },
  { id: 'a2', actor: 'Bob Lim',   role: 'Coordinator', action: 'Assigned as coordinator',    entity: 'Event',   label: 'EVT-001 Annual Gala', timestamp: '2026-09-25 14:45' },
  { id: 'a3', actor: 'Bob Lim',   role: 'Coordinator', action: 'Requested clarification',    entity: 'Event',   label: 'EVT-001 Annual Gala', timestamp: '2026-09-25 15:10' },
  { id: 'a4', actor: 'Alice Tan', role: 'Organiser',   action: 'Responded to clarification', entity: 'Event',   label: 'EVT-001 Annual Gala', timestamp: '2026-09-25 16:02' },
  { id: 'a5', actor: 'Bob Lim',   role: 'Coordinator', action: 'Approved event request',     entity: 'Event',   label: 'EVT-001 Annual Gala', timestamp: '2026-09-25 16:30' },
  { id: 'a6', actor: 'Carol Ng',  role: 'Venue',       action: 'Confirmed venue booking',    entity: 'Booking', label: 'BKG-042 Hall A',      timestamp: '2026-09-25 17:00' },
  { id: 'a7', actor: 'Bob Lim',   role: 'Coordinator', action: 'Published event',             entity: 'Event',   label: 'EVT-001 Annual Gala', timestamp: '2026-09-26 09:15' },
  { id: 'a8', actor: 'Admin',     role: 'Admin',       action: 'Reset user password',        entity: 'Account', label: 'alice@example.com',   timestamp: '2026-09-26 10:00' },
];

const roleTone: Record<AuditRole, string> = {
  Organiser:   'info',
  Coordinator: 'success',
  Venue:       'warning',
  Support:     'neutral',
  Admin:       'danger',
};

type Comment = {
  id: string;
  author: string;
  role: string;
  initial: string;
  timestamp: string;
  body: string;
};

const commentsByEvent: Record<string, Comment[]> = {
  'EVT-001 Annual Gala': [
    { id: 'c1', author: 'Bob Lim',   role: 'Coordinator', initial: 'B', timestamp: '2026-09-25 15:10', body: 'Hi Alice — can you confirm the expected attendance? We need exact headcount for venue sizing.' },
    { id: 'c2', author: 'Alice Tan', role: 'Organiser',   initial: 'A', timestamp: '2026-09-25 16:00', body: 'Hi Bob, expecting ~150 guests including 10 VIPs. Let me know if you need the detailed list.' },
    { id: 'c3', author: 'Bob Lim',   role: 'Coordinator', initial: 'B', timestamp: '2026-09-25 16:20', body: 'That works. I\'ll proceed with Hall A (capacity 200). Will confirm the booking shortly.' },
    { id: 'c4', author: 'Alice Tan', role: 'Organiser',   initial: 'A', timestamp: '2026-09-26 08:45', body: 'Thanks Bob! Also, one of our VIPs uses a wheelchair — please confirm Hall A has step-free access.' },
  ],
  'EVT-002 Tech Workshop': [
    { id: 'd1', author: 'Carol Ng', role: 'Venue',       initial: 'C', timestamp: '2026-09-24 11:00', body: 'Seminar Room B is available on the requested dates. AV equipment is already set up.' },
    { id: 'd2', author: 'Dan Wu',   role: 'Coordinator', initial: 'D', timestamp: '2026-09-24 14:30', body: 'Great, confirmed. Can we also get catering for 30 people? Lunch only.' },
  ],
};

const eventOptions = Object.keys(commentsByEvent);

type VenueResult = {
  id: string;
  name: string;
  location: string;
  capacity: number;
  features: string[];
  availability: 'available' | 'limited';
};

const allVenues: VenueResult[] = [
  { id: 'v1', name: 'Hall A',          location: 'Block 1, Level 3', capacity: 200, features: ['Stage', 'AV system', 'Wheelchair access'],      availability: 'available' },
  { id: 'v2', name: 'Seminar Room B',  location: 'Block 2, Level 1', capacity: 40,  features: ['Projector', 'Whiteboard', 'Air-conditioned'],    availability: 'available' },
  { id: 'v3', name: 'Conference Suite',location: 'Block 3, Level 4', capacity: 120, features: ['AV system', 'Catering kitchen', 'Private entry'], availability: 'limited'   },
  { id: 'v4', name: 'Outdoor Terrace', location: 'Block 1, Rooftop', capacity: 80,  features: ['Natural light', 'Standing capacity 150'],         availability: 'available' },
  { id: 'v5', name: 'Training Lab',    location: 'Block 4, Level 2', capacity: 35,  features: ['Workstations', 'Fast WiFi', 'Whiteboard'],        availability: 'limited'   },
];

// ─── AuditHistory ─────────────────────────────────────────────────────────────

export function AuditHistory() {
  const [roleFilter, setRoleFilter] = useState<'all' | AuditRole>('all');
  const [entityFilter, setEntityFilter] = useState<'all' | AuditEntity>('all');
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return auditEntries.filter(entry => {
      if (roleFilter !== 'all' && entry.role !== roleFilter) return false;
      if (entityFilter !== 'all' && entry.entity !== entityFilter) return false;
      return true;
    });
  }, [roleFilter, entityFilter]);

  return (
    <main className="operations-page">
      <header className="operations-heading">
        <p className="eyebrow"><History size={14} aria-hidden="true" /> Operations</p>
        <h1>Audit history</h1>
      </header>

      <div className="audit-filters" role="group" aria-label="Filter audit entries">
        <label>
          Role
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value as 'all' | AuditRole)}>
            <option value="all">All roles</option>
            {(['Organiser', 'Coordinator', 'Venue', 'Support', 'Admin'] as AuditRole[]).map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>
        <label>
          Entity type
          <select value={entityFilter} onChange={e => setEntityFilter(e.target.value as 'all' | AuditEntity)}>
            <option value="all">All entities</option>
            {(['Event', 'Booking', 'Account', 'Venue'] as AuditEntity[]).map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <div className="ops-error-card" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="audit-table-wrap" role="status" aria-label="Loading audit entries">
          <table className="audit-table">
            <thead><tr><th>Actor</th><th>Action</th><th>Entity</th><th>When</th></tr></thead>
            <tbody>
              {[1, 2, 3].map(n => (
                <tr key={n} className="audit-skeleton">
                  <td><div className="audit-skeleton-bar" style={{ width: '8rem' }} /></td>
                  <td><div className="audit-skeleton-bar" style={{ width: '12rem' }} /></td>
                  <td><div className="audit-skeleton-bar" style={{ width: '9rem' }} /></td>
                  <td><div className="audit-skeleton-bar" style={{ width: '7rem' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="ops-empty-state">
          <History size={26} aria-hidden="true" />
          <h3>No audit entries match your filters</h3>
          <p>Try removing filters to see more entries.</p>
        </div>
      ) : (
        <div className="audit-table-wrap">
          <table className="audit-table">
            <thead>
              <tr>
                <th scope="col">Actor</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(entry => (
                <tr key={entry.id}>
                  <td>
                    <div className="audit-actor">
                      <span className={`status-pill status-${roleTone[entry.role]}`}>{entry.role}</span>
                      {entry.actor}
                    </div>
                  </td>
                  <td>{entry.action}</td>
                  <td>
                    <span className="audit-entity">{entry.label}</span>
                    <br />
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>{entry.entity}</span>
                  </td>
                  <td><time dateTime={entry.timestamp}>{entry.timestamp}</time></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

// ─── CommentsActivity ─────────────────────────────────────────────────────────

export function CommentsActivity() {
  const [selectedEvent, setSelectedEvent] = useState(eventOptions[0]);
  const [newComment, setNewComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const comments = commentsByEvent[selectedEvent] ?? [];
  const MAX_CHARS = 500;

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSubmitted(true);
    setNewComment('');
  }

  return (
    <main className="operations-page">
      <header className="operations-heading">
        <p className="eyebrow"><MessageCircle size={14} aria-hidden="true" /> Operations</p>
        <h1>Comments</h1>
      </header>

      <div className="comments-event-selector">
        <label htmlFor="event-select">Event</label>
        <select
          id="event-select"
          value={selectedEvent}
          onChange={e => { setSelectedEvent(e.target.value); setSubmitted(false); }}
        >
          {eventOptions.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>

      {comments.length === 0 ? (
        <div className="ops-empty-state">
          <MessageCircle size={26} aria-hidden="true" />
          <h3>No comments yet on this event</h3>
          <p>Be the first to add a comment below.</p>
        </div>
      ) : (
        <ul className="comment-thread" aria-label={`Comments for ${selectedEvent}`}>
          {comments.map(comment => (
            <li key={comment.id} className="comment-card">
              <div className="comment-avatar" aria-hidden="true">{comment.initial}</div>
              <div>
                <div className="comment-meta">
                  <span className="comment-author">{comment.author}</span>
                  <span className={`status-pill status-info`}>{comment.role}</span>
                  <time className="comment-time" dateTime={comment.timestamp}>{comment.timestamp}</time>
                </div>
                <p className="comment-body">{comment.body}</p>
              </div>
              <div className="comment-reply">
                <button type="button" className="secondary-action" style={{ minHeight: '32px', padding: '0 10px', fontSize: '0.82rem' }}>
                  Reply
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="comment-form" onSubmit={handleSubmit} noValidate aria-label="Add a comment">
        <p className="comment-form-header">Add a comment</p>
        <textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Write your comment…"
          maxLength={MAX_CHARS}
          rows={4}
          aria-label="Comment text"
          aria-describedby="char-count"
          required
        />
        <p id="char-count" className="comment-char-count" aria-live="polite">{newComment.length} / {MAX_CHARS}</p>
        <div role="status" aria-live="polite">
          {submitted && <span style={{ fontSize: '0.9rem', color: 'var(--green)' }}>Comment posted (mock).</span>}
        </div>
        <button type="submit" className="primary-action" disabled={!newComment.trim()}>
          <MessageCircle size={14} aria-hidden="true" /> Send
        </button>
      </form>
    </main>
  );
}

// ─── SearchFilter ─────────────────────────────────────────────────────────────

const accessibilityOptions = ['Wheelchair access', 'Hearing loop', 'Step-free entry', 'Accessible toilets'];
const capacityBands = ['Any', '0–50', '51–100', '101–200', '200+'];

export function SearchFilter() {
  const [query, setQuery] = useState('');
  const [selectedCapacity, setSelectedCapacity] = useState('Any');
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    return allVenues.filter(venue => {
      if (q && !venue.name.toLowerCase().includes(q) && !venue.location.toLowerCase().includes(q)) return false;
      if (selectedFeatures.length > 0 && !selectedFeatures.every(f => venue.features.includes(f))) return false;
      if (selectedCapacity !== 'Any') {
        const [lo, hi] = selectedCapacity.split('–').map(Number);
        if (hi ? venue.capacity < lo || venue.capacity > hi : venue.capacity <= 200) return false;
      }
      return true;
    });
  }, [query, selectedCapacity, selectedFeatures]);

  function toggleFeature(feature: string) {
    setSelectedFeatures(prev =>
      prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]
    );
  }

  return (
    <main className="operations-page">
      <header className="operations-heading">
        <p className="eyebrow"><Search size={14} aria-hidden="true" /> Venue coordinator</p>
        <h1>Search venues</h1>
      </header>

      <div className="search-input-wrap">
        <label htmlFor="venue-search" style={{ position: 'absolute', width: 1, height: 1, overflow: 'clip' }}>Search venues</label>
        <input
          id="venue-search"
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by venue name or location…"
          aria-label="Search venues"
        />
      </div>

      <div className="search-chip-row" role="group" aria-label="Quick capacity filters">
        {capacityBands.map(band => (
          <button
            key={band}
            type="button"
            aria-pressed={selectedCapacity === band}
            onClick={() => setSelectedCapacity(band)}
          >
            {band === 'Any' ? 'Any capacity' : `${band} guests`}
          </button>
        ))}
      </div>

      {error && (
        <div className="ops-error-card" role="alert">
          <AlertTriangle size={18} aria-hidden="true" />
          <p>Could not load venues. Please try again.</p>
        </div>
      )}

      <div className="search-page-layout">
        <div>
          {loading ? (
            <div className="venue-result-list" role="status" aria-label="Loading venues">
              {[1, 2, 3].map(n => (
                <div key={n} className="search-skeleton-card">
                  <div className="audit-skeleton-bar" style={{ width: '60%' }} />
                  <div className="audit-skeleton-bar" style={{ width: '40%', height: '0.8rem' }} />
                  <div className="audit-skeleton-bar" style={{ width: '80%', height: '0.8rem' }} />
                </div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="ops-empty-state">
              <Search size={26} aria-hidden="true" />
              <h3>No venues match your search</h3>
              <p>Try a different search term or remove some filters.</p>
            </div>
          ) : (
            <ul className="venue-result-list" aria-label="Venue results">
              {results.map(venue => (
                <li key={venue.id} className="venue-result-card">
                  <h3>{venue.name}</h3>
                  <div className="venue-result-meta">
                    <span>{venue.location}</span>
                    <span>·</span>
                    <span>Capacity: {venue.capacity}</span>
                    <span className={`venue-availability`}>
                      <span className={`venue-availability-dot ${venue.availability}`} aria-hidden="true" />
                      {venue.availability === 'available' ? 'Available' : 'Limited'}
                    </span>
                  </div>
                  <div className="venue-result-chips">
                    {venue.features.map(f => (
                      <span key={f} className="status-pill status-neutral">{f}</span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="search-sidebar" aria-label="Refine search">
          <h2>Refine search</h2>
          <div className="search-sidebar-section">
            <h3>Accessibility</h3>
            {accessibilityOptions.map(opt => (
              <label key={opt}>
                <input
                  type="checkbox"
                  checked={selectedFeatures.includes(opt)}
                  onChange={() => toggleFeature(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
          {selectedFeatures.length > 0 && (
            <button type="button" className="secondary-action" onClick={() => setSelectedFeatures([])}>
              Clear filters
            </button>
          )}
        </aside>
      </div>
    </main>
  );
}

// ─── EmptyErrorLoading ────────────────────────────────────────────────────────

export function EmptyErrorLoading() {
  return (
    <main className="operations-page">
      <header className="operations-heading">
        <p className="eyebrow"><Sparkles size={14} aria-hidden="true" /> Design system</p>
        <h1>Empty, loading, and error states</h1>
      </header>

      <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.95rem' }}>
        This screen catalogs the state patterns used across the app.{' '}
        <strong style={{ color: 'var(--ink)' }}>Amareet:</strong>{' '}
        use this as your polish reference when designing these states for individual screens.
      </p>

      <div className="state-catalog">

        <div className="state-section">
          <h2>Empty states</h2>
          <p>Use when a list, table, or feed has no data yet. Always include an icon (26px), a short heading, and one line of context.</p>
          <div className="state-example">
            <div className="ops-empty-state">
              <History size={26} aria-hidden="true" />
              <h3>No entries yet</h3>
              <p>Items will appear here once they are created.</p>
            </div>
          </div>
          <p className="state-code-hint">Use when: list is genuinely empty (not filtered, not loading, not errored).</p>
        </div>

        <div className="state-section">
          <h2>Loading states</h2>
          <p>Use skeleton rows/cards instead of spinners for list and table content. Wrap with <code>role="status"</code> and <code>aria-label</code>.</p>
          <div className="state-example">
            <div role="status" aria-label="Loading items" style={{ display: 'grid', gap: '0.5rem' }}>
              {[1, 2, 3].map(n => (
                <div key={n} className="audit-skeleton-bar" style={{ width: `${70 + n * 8}%`, height: '1.2rem' }} />
              ))}
            </div>
          </div>
          <p className="state-code-hint">Use when: async data fetch is in flight. Remove immediately on completion or error.</p>
        </div>

        <div className="state-section">
          <h2>Error states</h2>
          <p>Use an <code>ops-error-card</code> with <code>role="alert"</code> and a retry action. Always include the error icon.</p>
          <div className="state-example">
            <div className="ops-error-card" role="alert">
              <AlertTriangle size={18} aria-hidden="true" />
              <p>Could not load data. Check your connection and try again.</p>
              <button type="button" className="secondary-action" style={{ minHeight: '32px', padding: '0 10px', fontSize: '0.85rem' }}>Retry</button>
            </div>
          </div>
          <p className="state-code-hint">Use when: network or server error prevents loading. Never silently swallow errors.</p>
        </div>

        <div className="state-section">
          <h2>No-permission state</h2>
          <p>Use the global <code>/permission-denied</code> route for hard access blocks. For inline soft-blocks, use a banner with the amber tone.</p>
          <div className="state-example">
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.9rem', borderRadius: 8, background: 'var(--amber-soft)', color: 'var(--amber)' }}>
              <AlertTriangle size={18} aria-hidden="true" />
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--ink)' }}>You do not have permission to perform this action. Contact your administrator.</p>
            </div>
          </div>
          <p className="state-code-hint">Use when: user can see the section but lacks write access. Do not hide the section entirely unless there is a redirect route.</p>
        </div>

      </div>
    </main>
  );
}
