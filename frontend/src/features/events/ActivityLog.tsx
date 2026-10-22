// E14-S02 Scenario 1 (T-75): the event Activity log, read-only, on the
// assigned Coordinator's event page. The API already leaves out access-denial
// entries (#161, TC_E14S02_08), so every row here is a change to the event or,
// for E06-S04 Scenario 5, a Venue Staff decision on one of its venue bookings.
// Entries can never be edited or deleted (Scenario 5), so there are no actions.
import { Card, DataTable, StatusPill, formatDate, statusLabel, type Column } from '../../shared';
import { editableFieldLabels } from './eventEditFields';

export type ActivityEntry = {
  occurred_at: string;
  action: string;
  field_changed: string | null;
  old_value: string | null;
  new_value: string | null;
  actor_name: string | null;
  entity_type?: string;
  venue_name?: string | null;
  booking_id?: string | null;
};

type Row = ActivityEntry & { key: string };

const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

const fieldLabels: Record<string, string> = { ...editableFieldLabels, coordinator_id: 'coordinator' };

const isBookingDecision = (entry: ActivityEntry) => entry.entity_type === 'venue_booking';

// "Under review → Approved" for a status change; "Venue requirements: …" for an edit;
// "Small Room: Pending → Confirmed" for a booking decision.
export function describeChange(entry: ActivityEntry) {
  if (entry.field_changed === 'primary_venue') {
    if (!entry.new_value) return 'Primary venue';
    return entry.old_value
      ? `Primary venue: ${entry.old_value} → ${entry.new_value}`
      : `Primary venue: ${entry.new_value}`;
  }
  if (isBookingDecision(entry)) {
    const venue = entry.venue_name ?? 'Venue';
    const to = entry.new_value ? statusLabel(entry.new_value) : 'Not recorded';
    return entry.old_value ? `${venue}: ${statusLabel(entry.old_value)} → ${to}` : `${venue}: ${to}`;
  }
  if (!entry.field_changed) return 'None recorded';
  if (entry.field_changed === 'status') {
    const to = entry.new_value ? statusLabel(entry.new_value) : 'Not recorded';
    return entry.old_value ? `${statusLabel(entry.old_value)} → ${to}` : to;
  }
  // E06-S05 holds store the expiry (or the booking id) as the value; show the
  // expiry as a date and never the internal id.
  if (entry.field_changed === 'venue_booking') {
    const when = (value: string | null) => (value && ISO_TIME.test(value) ? formatDate(value, true) : null);
    const before = when(entry.old_value), after = when(entry.new_value);
    if (after) return before ? `Hold expiry: ${before} → ${after}` : `Hold expires ${after}`;
    return 'Venue booking';
  }
  const label = statusLabel(fieldLabels[entry.field_changed] ?? entry.field_changed);
  if (!entry.new_value) return label;
  // Coordinator assignment and reassignment keep the previous Coordinator.
  return entry.old_value && entry.old_value !== entry.new_value
    ? `${label}: ${entry.old_value} → ${entry.new_value}`
    : `${label}: ${entry.new_value}`;
}

// The stored action is written for the database ("Status changed to
// under_review", "Record updated"); show it in the interface's words (design.md 8.1).
export function describeAction(entry: ActivityEntry) {
  if (entry.field_changed === 'primary_venue') return 'Primary venue changed';
  // "Booking Approved" -> "Booking approved" (sentence case, design.md 8.1).
  if (isBookingDecision(entry)) return entry.action.charAt(0) + entry.action.slice(1).toLowerCase();
  if (entry.field_changed === 'status') return 'Status changed';
  if (entry.action === 'Record updated') return 'Details edited';
  return entry.action;
}

// Event statuses are StatusPills (design.md section 7); "to" is read out instead
// of the arrow. A booking's status is not an event status, so it stays in words.
function Change({ entry }: { entry: ActivityEntry }) {
  if (isBookingDecision(entry)) return (
    <span>
      {describeChange(entry)}
      {entry.booking_id ? <><br />Booking reference: {entry.booking_id}</> : null}
    </span>
  );
  if (entry.field_changed !== 'status' || !entry.new_value) return <>{describeChange(entry)}</>;
  return (
    <span>
      {entry.old_value ? (
        <>
          <StatusPill status={entry.old_value} />
          <span aria-hidden="true"> → </span>
          <span className="visually-hidden"> to </span>
        </>
      ) : null}
      <StatusPill status={entry.new_value} />
    </span>
  );
}

const columns: Column<Row>[] = [
  { header: 'Action', primary: true, cell: describeAction },
  { header: 'Change', cell: entry => <Change entry={entry} /> },
  { header: 'By', cell: entry => entry.actor_name ?? 'Not recorded' },
  { header: 'When', cell: entry => formatDate(entry.occurred_at, true) },
];

export function ActivityLog({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Card title="Activity log">
      {entries.length === 0 ? (
        <p>No activity recorded yet. Status changes and edits to this event appear here.</p>
      ) : (
        <DataTable
          caption="Changes to this event, oldest first"
          columns={columns}
          rows={entries.map((entry, index) => ({ ...entry, key: `${entry.occurred_at}-${index}` }))}
          rowKey={entry => entry.key}
        />
      )}
    </Card>
  );
}
