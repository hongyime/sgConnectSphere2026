// E05-S04 "Block a venue for maintenance" on the shared blocks (ADR-017
// skeleton pilot, SCRUM-120). Venue Staff list a venue's current and upcoming
// blocks, shorten a block, and remove a block. A server 409 refusal over an
// existing block is shown verbatim with that block named; the save
// confirmation reports how many events had their Coordinator notified.
//
// E05-S06 (SCRUM-152) replaces the whole-day create form: Venue Staff mark the
// venue unavailable from a start date and time, with an optional end (none =
// until lifted, T-80), a reason category and a note. The save succeeds over
// existing bookings (T-67); the server flags them Conflicting.
//
// Backend contract: see api/venues/index.ts (?blocks=1 for the list; POST
// actions block / shorten_block / remove_block) and
// backend/src/modules/venueBooking/blocks.ts for the request and response
// shapes. The list reports YYYY-MM-DD Singapore days; the create form sends
// Singapore times with a +08:00 offset.
import { useEffect, useId, useState, type FormEvent } from 'react';
import { CalendarClock, PencilLine, Plus, Trash2 } from 'lucide-react';
import {
  Alert, Button, Card, ConfirmPanel, DataTable, EmptyState, ErrorState, FormActions, FormField, FormSection,
  LoadingState, PageLayout, StatusPill, formatDate, useLoad,
  type Column,
} from '../../shared';
import { listVenues, type Venue } from './venueApi';
import {
  CATEGORY_LABELS, REASON_CATEGORIES, createUnavailability, listBlocks, overlappingBlocks, removeBlock, shortenBlock,
  type AffectedEvent, type ReasonCategory, type SavedUnavailability, type VenueBlock,
} from './blocksApi';

// Scenario 2: a save over bookings lists the affected events with the flash.
type Flash = { tone: 'success'; message: string; affected?: AffectedEvent[] } | null;
type ConflictAlert = { message: string; overlaps: VenueBlock[] } | null;

export function VenueBlockout() {
  // Load the catalogue once so staff can switch venue without leaving the page.
  // listVenues() already excludes retired venues.
  const venues = useLoad(signal => listVenues('', signal), []);
  const [selectedId, setSelectedId] = useState('');

  // With no venue yet picked, show the first catalogue entry so the user sees
  // a working screen immediately rather than an empty frame.
  useEffect(() => {
    if (venues.result.state === 'ready') {
      const first = venues.result.data[0]?.id ?? '';
      setSelectedId(current => current || first);
    }
  }, [venues.result]);

  return (
    <PageLayout eyebrow="Venue staff" title="Maintenance blocks">
      <Card title="Choose a venue">
        {venues.result.state === 'loading' ? (
          <LoadingState label="Loading venues…" rows={1} />
        ) : venues.result.state === 'error' ? (
          <ErrorState failure={venues.result.failure} onRetry={venues.reload} context="the venue catalogue" />
        ) : venues.result.data.length === 0 ? (
          <EmptyState title="No venues yet">Add a venue in the inventory before blocking one for maintenance.</EmptyState>
        ) : (
          <VenuePicker venues={venues.result.data} selectedId={selectedId} onSelect={setSelectedId} />
        )}
      </Card>
      {selectedId ? <VenueBlocksPanel key={selectedId} venueId={selectedId} /> : null}
    </PageLayout>
  );
}

function VenuePicker({ venues, selectedId, onSelect }: {
  venues: Venue[]; selectedId: string; onSelect: (id: string) => void;
}) {
  return (
    <FormField label="Venue">
      {props => (
        <select {...props} value={selectedId} onChange={event => onSelect(event.target.value)}>
          {venues.map(venue => <option key={venue.id} value={venue.id}>{venue.name}</option>)}
        </select>
      )}
    </FormField>
  );
}

type EditingState =
  | { kind: 'none' }
  | { kind: 'shorten'; block: VenueBlock }
  | { kind: 'remove'; block: VenueBlock };

// Blocks are whole Singapore days stored as YYYY-MM-DD; show them the way
// design.md section 8.1 wants every date shown ("5 Jan 2027").
function blockDay(day: string): string {
  return formatDate(`${day}T00:00:00+08:00`);
}

function blockRange(block: Pick<VenueBlock, 'from' | 'to'>): string {
  if (!block.to) return `${blockDay(block.from)} until lifted`;
  return block.from === block.to ? blockDay(block.from) : `${blockDay(block.from)} to ${blockDay(block.to)}`;
}

function VenueBlocksPanel({ venueId }: { venueId: string }) {
  const { result, reload } = useLoad(signal => listBlocks(venueId, signal), [venueId]);
  const [flash, setFlash] = useState<Flash>(null);
  const [conflict, setConflict] = useState<ConflictAlert>(null);
  const [editing, setEditing] = useState<EditingState>({ kind: 'none' });
  const [removing, setRemoving] = useState(false);

  function afterChange(message: string, affected?: AffectedEvent[]) {
    setFlash({ tone: 'success', message, affected });
    setConflict(null);
    setEditing({ kind: 'none' });
    reload();
  }

  return (
    <>
      {flash ? (
        <Alert tone="success">
          {flash.message}
          {flash.affected?.length ? <AffectedEventList events={flash.affected} /> : null}
        </Alert>
      ) : null}
      {conflict ? (
        <Alert tone="error" title="Resolve the conflict first">
          {conflict.message}
          {conflict.overlaps.length ? (
            <ul className="venue-blocking">
              {conflict.overlaps.map(block => (
                <li key={block.id}>
                  {blockRange(block)}: {block.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </Alert>
      ) : null}

      <Card title="Current and upcoming blocks">
        {result.state === 'loading' ? (
          <LoadingState label="Loading blocks…" rows={2} />
        ) : result.state === 'error' ? (
          <ErrorState failure={result.failure} onRetry={reload} context="the maintenance blocks for this venue" />
        ) : result.data.length === 0 ? (
          <EmptyState title="No current or upcoming blocks">Blocks you add below will appear here.</EmptyState>
        ) : (
          <BlocksTable blocks={result.data} onShorten={block => setEditing({ kind: 'shorten', block })} onRemove={block => setEditing({ kind: 'remove', block })} />
        )}
      </Card>

      {editing.kind === 'shorten' ? (
        <ShortenCard
          key={editing.block.id}
          venueId={venueId}
          block={editing.block}
          onCancel={() => setEditing({ kind: 'none' })}
          onSaved={() => afterChange(`Block shortened. The released dates are available again.`)}
        />
      ) : null}

      {editing.kind === 'remove' ? (
        <ConfirmPanel
          title={`Remove the ${blockRange(editing.block)} block?`}
          description={`${editing.block.reason}. Removing restores availability for the released dates.`}
          confirmLabel="Remove block"
          busyLabel="Removing."
          busy={removing}
          danger
          onCancel={() => setEditing({ kind: 'none' })}
          onConfirm={async () => {
            if (removing) return;
            setRemoving(true);
            const outcome = await removeBlock(venueId, editing.block.id);
            setRemoving(false);
            if (outcome.ok) {
              afterChange('Block removed. The released dates are available again.');
            } else {
              setConflict({ message: outcome.message, overlaps: [] });
              setEditing({ kind: 'none' });
            }
          }}
        />
      ) : null}

      <CreateUnavailabilityCard
        venueId={venueId}
        onSaved={saved => afterChange(savedMessage(saved.affectedEvents.length), saved.affectedEvents)}
        onConflict={setConflict}
      />
    </>
  );
}

function savedMessage(affected: number): string {
  if (affected === 0) return 'Unavailability saved.';
  const which = affected === 1 ? 'This event has a booking' : `These ${affected} events have bookings`;
  return `Unavailability saved. ${which} in this period, now marked Conflicting. Nothing was cancelled.`;
}

// Scenarios 2 to 4: each affected event, whether a Confirmed event went back
// to Planning (T-81), and whether its Coordinator was told (C-121).
function AffectedEventList({ events }: { events: AffectedEvent[] }) {
  return (
    <ul className="venue-blocking" aria-label="Affected events">
      {events.map(event => (
        <li key={event.eventId}>
          {event.title}{event.eventCode ? ` (${event.eventCode})` : ''}{' '}
          {event.returnedToPlanning ? <StatusPill status="planning" label="Returned to Planning" /> : null}{' '}
          {event.coordinatorNotified
            ? <StatusPill status="success" label="Coordinator notified" />
            : <StatusPill status="warning" label="No Coordinator assigned" />}
        </li>
      ))}
    </ul>
  );
}

function BlocksTable({ blocks, onShorten, onRemove }: {
  blocks: VenueBlock[]; onShorten: (block: VenueBlock) => void; onRemove: (block: VenueBlock) => void;
}) {
  const columns: Column<VenueBlock>[] = [
    { header: 'From', cell: block => blockDay(block.from) },
    { header: 'To', cell: block => block.to ? blockDay(block.to) : 'Until lifted' },
    { header: 'Reason', cell: block => block.reason, primary: true },
    {
      header: 'Actions', key: 'shorten', hideHeader: true,
      cell: block => <Button icon={<PencilLine size={14} aria-hidden="true" />} onClick={() => onShorten(block)}>Shorten…</Button>,
    },
    {
      header: 'Actions', key: 'remove', hideHeader: true,
      cell: block => <Button variant="danger" icon={<Trash2 size={14} aria-hidden="true" />} onClick={() => onRemove(block)}>Remove…</Button>,
    },
  ];
  return <DataTable caption="Current and upcoming maintenance blocks" columns={columns} rows={blocks} rowKey={block => block.id} />;
}

type CreateErrors = { startDate?: string; startTime?: string; endDate?: string; endTime?: string; category?: string; note?: string };

// The form takes Singapore wall-clock time (UTC+08:00, no daylight saving).
function sgtInstant(date: string, time: string): string {
  return `${date}T${time}:00+08:00`;
}

function CreateUnavailabilityCard({ venueId, onSaved, onConflict }: {
  venueId: string;
  onSaved: (saved: SavedUnavailability) => void;
  onConflict: (alert: ConflictAlert) => void;
}) {
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('');
  const [category, setCategory] = useState<ReasonCategory | ''>('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<CreateErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingHintId = useId();

  function validate(): CreateErrors {
    const next: CreateErrors = {};
    if (!startDate) next.startDate = 'Start date is required.';
    if (!startTime) next.startTime = 'Start time is required.';
    // Both end fields empty means until lifted; one alone is a mistake.
    if (endDate && !endTime) next.endTime = 'Enter an end time, or clear the end date to keep the venue unavailable until lifted.';
    if (endTime && !endDate) next.endDate = 'Enter an end date, or clear the end time to keep the venue unavailable until lifted.';
    if (startDate && startTime && endDate && endTime
      && Date.parse(sgtInstant(endDate, endTime)) <= Date.parse(sgtInstant(startDate, startTime))) {
      next.endDate = 'The end must be after the start.';
    }
    if (!category) next.category = 'Choose a reason category.';
    if (!note.trim()) next.note = 'A note describing the unavailability is required.';
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    const outcome = await createUnavailability(venueId, {
      startsAt: sgtInstant(startDate, startTime),
      endsAt: endDate ? sgtInstant(endDate, endTime) : null,
      reasonCategory: category as ReasonCategory,
      reason: note.trim(),
    });
    setBusy(false);
    if (outcome.ok) {
      setStartDate('');
      setStartTime('');
      setEndDate('');
      setEndTime('');
      setCategory('');
      setNote('');
      onSaved(outcome.data);
      return;
    }
    if (outcome.status === 409 && outcome.code === 'block_overlap') {
      onConflict({ message: outcome.message, overlaps: overlappingBlocks(outcome.details) });
      return;
    }
    if (outcome.fieldErrors) {
      setErrors({
        startDate: outcome.fieldErrors.starts_at?.[0],
        endDate: outcome.fieldErrors.ends_at?.[0],
        category: outcome.fieldErrors.reason_category?.[0],
        note: outcome.fieldErrors.reason?.[0],
      });
      return;
    }
    setServerError(outcome.message);
  }

  return (
    <Card title="Mark this venue unavailable">
      <form onSubmit={submit} aria-describedby={headingHintId} noValidate>
        <p id={headingHintId} className="field-hint">
          Enter when the venue becomes unavailable, the reason and a note. Bookings inside the period are flagged Conflicting
          and their Coordinators are told; nothing is cancelled. An overlap with another unavailability is refused.
        </p>
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <FormSection title="Period">
          <FormField label="Start date" error={errors.startDate}>
            {props => <input {...props} type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />}
          </FormField>
          <FormField label="Start time" error={errors.startTime}>
            {props => <input {...props} type="time" value={startTime} onChange={event => setStartTime(event.target.value)} />}
          </FormField>
          <FormField label="End date (optional)" hint="Leave the end empty to keep the venue unavailable until you lift it." error={errors.endDate}>
            {props => <input {...props} type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />}
          </FormField>
          <FormField label="End time (optional)" error={errors.endTime}>
            {props => <input {...props} type="time" value={endTime} onChange={event => setEndTime(event.target.value)} />}
          </FormField>
        </FormSection>
        <FormSection title="Reason">
          <FormField label="Reason category" error={errors.category}>
            {props => (
              <select {...props} value={category} onChange={event => setCategory(event.target.value as ReasonCategory | '')}>
                <option value="">Choose a reason</option>
                {REASON_CATEGORIES.map(value => <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>)}
              </select>
            )}
          </FormField>
          <FormField label="Note" wide error={errors.note}>
            {props => <input {...props} type="text" value={note} maxLength={255} onChange={event => setNote(event.target.value)} placeholder="e.g. Projector rig fault" />}
          </FormField>
        </FormSection>
        <FormActions>
          <Button type="submit" variant="primary" busy={busy} busyLabel="Saving…" icon={<Plus size={14} aria-hidden="true" />}>Save unavailability</Button>
        </FormActions>
      </form>
    </Card>
  );
}

type ShortenErrors = { to?: string; reason?: string };

function ShortenCard({ venueId, block, onCancel, onSaved }: {
  venueId: string; block: VenueBlock; onCancel: () => void; onSaved: () => void;
}) {
  const [newTo, setNewTo] = useState(block.to ?? '');
  const [reason, setReason] = useState(block.reason);
  const [errors, setErrors] = useState<ShortenErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hintId = useId();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: ShortenErrors = {};
    if (!newTo) next.to = 'End date is required.';
    // The server enforces the same rule, but refusing it here keeps the message
    // next to the field instead of in a server-error alert.
    if (newTo && block.to && newTo > block.to) next.to = 'A block can only be shortened. Create a new block to cover extra dates.';
    if (newTo && newTo < block.from) next.to = 'End date must be on or after the start date.';
    if (!reason.trim()) next.reason = 'A reason for the block is required.';
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    const outcome = await shortenBlock(venueId, block.id, { from: block.from, to: newTo, reason: reason.trim() });
    setBusy(false);
    if (outcome.ok) { onSaved(); return; }
    if (outcome.fieldErrors) {
      setErrors({ to: outcome.fieldErrors.to?.[0], reason: outcome.fieldErrors.reason?.[0] });
      return;
    }
    setServerError(outcome.message);
  }

  return (
    <Card title={`Shorten the ${blockRange(block)} block`}>
      <form onSubmit={submit} aria-describedby={hintId} noValidate>
        <p id={hintId} className="field-hint">
          Keep the start date; set a new end date on or after the start and before the current end to release the trailing days.
        </p>
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <FormSection title="New period">
          <FormField label="From">
            {props => <input {...props} type="date" value={block.from} readOnly aria-readonly="true" />}
          </FormField>
          <FormField label="New end date" error={errors.to}>
            {props => <input {...props} type="date" value={newTo} min={block.from} max={block.to ?? undefined} onChange={event => setNewTo(event.target.value)} />}
          </FormField>
          <FormField label="Reason" wide error={errors.reason}>
            {props => <input {...props} type="text" value={reason} maxLength={255} onChange={event => setReason(event.target.value)} />}
          </FormField>
        </FormSection>
        <FormActions>
          <Button onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="primary" busy={busy} busyLabel="Saving…" icon={<CalendarClock size={14} aria-hidden="true" />}>Save shortened block</Button>
        </FormActions>
      </form>
    </Card>
  );
}
