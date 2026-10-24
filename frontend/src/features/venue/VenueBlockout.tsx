// E05-S04 "Block a venue for maintenance" on the shared blocks (ADR-017
// skeleton pilot, SCRUM-120), reworked by E05-S06 (SCRUM-152) "Mark a venue
// temporarily unavailable over existing bookings". Venue Staff list a venue's
// current and upcoming unavailability, mark it unavailable from a start date
// and time with an optional end (none = until lifted, T-80), a reason category
// and a note, edit it and lift it (T-91). The save succeeds over existing
// bookings (T-67): the server flags them Conflicting and the screen lists the
// affected events; an edit or lift lists the bookings it restored. A server
// 409 refusal over another unavailability is shown verbatim with that one named.
//
// Backend contract: see api/venues/index.ts (?blocks=1 for the list; POST
// actions block / edit_block / lift_block) and
// backend/src/modules/venueBooking/blocks.ts for the request and response
// shapes. The form sends Singapore times with a +08:00 offset.
import { useEffect, useId, useState, type FormEvent, type ReactNode } from 'react';
import { CalendarClock, PencilLine, Plus, Unlock } from 'lucide-react';
import {
  Alert, Button, Card, ConfirmPanel, DataTable, EmptyState, ErrorState, FormActions, FormField, FormSection,
  LoadingState, PageLayout, StatusPill, formatDate, formatDateRange, useLoad,
  type ApiResult, type Column,
} from '../../shared';
import { listVenues, type Venue } from './venueApi';
import {
  CATEGORY_LABELS, REASON_CATEGORIES, createUnavailability, editUnavailability, liftUnavailability, listBlocks, overlappingBlocks,
  type AffectedEvent, type ReasonCategory, type RestoredEvent, type SavedUnavailability, type UnavailabilityInput, type VenueBlock,
} from './blocksApi';

// Scenarios 2 and 6: a save lists the affected events, and an edit or lift
// the restored ones, with the flash.
type Flash = { message: string; affected?: AffectedEvent[]; restored?: RestoredEvent[] } | null;
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
  | { kind: 'edit'; block: VenueBlock }
  | { kind: 'lift'; block: VenueBlock };

// Times show the way design.md section 8.1 wants ("15 Jan 2027, 8:00 am").
function periodLabel(block: Pick<VenueBlock, 'startsAt' | 'endsAt'>): string {
  return block.endsAt ? formatDateRange(block.startsAt, block.endsAt) : `${formatDate(block.startsAt, true)} until lifted`;
}

function VenueBlocksPanel({ venueId }: { venueId: string }) {
  const { result, reload } = useLoad(signal => listBlocks(venueId, signal), [venueId]);
  const [flash, setFlash] = useState<Flash>(null);
  const [conflict, setConflict] = useState<ConflictAlert>(null);
  const [editing, setEditing] = useState<EditingState>({ kind: 'none' });
  const [lifting, setLifting] = useState(false);

  function afterChange(next: NonNullable<Flash>) {
    setFlash(next);
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
          {flash.restored?.length ? <RestoredEventList events={flash.restored} /> : null}
        </Alert>
      ) : null}
      {conflict ? (
        <Alert tone="error" title="Resolve the conflict first">
          {conflict.message}
          {conflict.overlaps.length ? (
            <ul className="venue-blocking">
              {conflict.overlaps.map(block => (
                <li key={block.id}>
                  {periodLabel(block)}: {block.reason}
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
          <BlocksTable blocks={result.data} onEdit={block => setEditing({ kind: 'edit', block })} onLift={block => setEditing({ kind: 'lift', block })} />
        )}
      </Card>

      {editing.kind === 'edit' ? (
        <UnavailabilityForm
          key={editing.block.id}
          title={`Edit the ${periodLabel(editing.block)} unavailability`}
          hint="Extend, shorten or remove the end, or change the reason. Bookings newly inside the period are flagged Conflicting; bookings no longer inside it get their earlier status back."
          initial={editing.block}
          submitLabel="Save changes"
          submitIcon={<CalendarClock size={14} aria-hidden="true" />}
          submit={input => editUnavailability(venueId, editing.block.id, input)}
          onCancel={() => setEditing({ kind: 'none' })}
          onSaved={saved => afterChange({ message: editedMessage(saved), affected: saved.affectedEvents, restored: saved.restoredEvents })}
          onConflict={setConflict}
        />
      ) : null}

      {editing.kind === 'lift' ? (
        <ConfirmPanel
          title={`Lift the ${periodLabel(editing.block)} unavailability?`}
          description={`${CATEGORY_LABELS[editing.block.reasonCategory]}: ${editing.block.reason}. Bookings it made Conflicting get their earlier status back, and their Coordinators are told. It stays in the history.`}
          confirmLabel="Lift unavailability"
          busyLabel="Lifting…"
          busy={lifting}
          danger
          onCancel={() => setEditing({ kind: 'none' })}
          onConfirm={async () => {
            if (lifting) return;
            setLifting(true);
            const outcome = await liftUnavailability(venueId, editing.block.id);
            setLifting(false);
            if (outcome.ok) {
              afterChange({ message: liftedMessage(outcome.data.restoredEvents.length), restored: outcome.data.restoredEvents });
            } else {
              setConflict({ message: outcome.message, overlaps: [] });
              setEditing({ kind: 'none' });
            }
          }}
        />
      ) : null}

      {/* One form at a time, so the page never shows two sets of the same fields. */}
      {editing.kind !== 'edit' ? (
        <UnavailabilityForm
          title="Mark this venue unavailable"
          hint="Enter when the venue becomes unavailable, the reason and a note. Bookings inside the period are flagged Conflicting and their Coordinators are told; nothing is cancelled. An overlap with another unavailability is refused."
          submitLabel="Save unavailability"
          submitIcon={<Plus size={14} aria-hidden="true" />}
          submit={input => createUnavailability(venueId, input)}
          onSaved={saved => afterChange({ message: savedMessage(saved.affectedEvents.length), affected: saved.affectedEvents })}
          onConflict={setConflict}
        />
      ) : null}
    </>
  );
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many.replace('{n}', String(count));
}

function savedMessage(affected: number): string {
  if (affected === 0) return 'Unavailability saved.';
  return `Unavailability saved. ${plural(affected, 'This event has a booking', 'These {n} events have bookings')} in this period, now marked Conflicting. Nothing was cancelled.`;
}

function editedMessage(saved: SavedUnavailability): string {
  const parts = ['Unavailability changed.'];
  if (saved.affectedEvents.length) parts.push(`${plural(saved.affectedEvents.length, '1 event is', '{n} events are')} newly marked Conflicting.`);
  if (saved.restoredEvents.length) parts.push(`${plural(saved.restoredEvents.length, '1 booking has its', '{n} bookings have their')} earlier status back.`);
  return parts.join(' ');
}

function liftedMessage(restored: number): string {
  if (restored === 0) return 'Unavailability lifted. It stays in the history.';
  return `Unavailability lifted. It stays in the history. ${plural(restored, '1 booking has its', '{n} bookings have their')} earlier status back.`;
}

function CoordinatorPill({ notified }: { notified: boolean }) {
  return notified
    ? <StatusPill status="success" label="Coordinator notified" />
    : <StatusPill status="warning" label="No Coordinator assigned" />;
}

function eventName(event: { title: string; eventCode: string | null }): string {
  return `${event.title}${event.eventCode ? ` (${event.eventCode})` : ''}`;
}

// Scenarios 2 to 4: each affected event, whether a Confirmed event went back
// to Planning (T-81), and whether its Coordinator was told (C-121).
function AffectedEventList({ events }: { events: AffectedEvent[] }) {
  return (
    <ul className="venue-blocking" aria-label="Affected events">
      {events.map(event => (
        <li key={event.eventId}>
          {eventName(event)}{' '}
          {event.returnedToPlanning ? <StatusPill status="planning" label="Returned to Planning" /> : null}{' '}
          <CoordinatorPill notified={event.coordinatorNotified} />
        </li>
      ))}
    </ul>
  );
}

// Scenario 6 (C-122): each event whose booking got its earlier status back.
function RestoredEventList({ events }: { events: RestoredEvent[] }) {
  return (
    <ul className="venue-blocking" aria-label="Restored events">
      {events.map(event => (
        <li key={event.eventId}>
          {eventName(event)}{' '}
          <StatusPill status="info" label="Booking restored" />{' '}
          <CoordinatorPill notified={event.coordinatorNotified} />
        </li>
      ))}
    </ul>
  );
}

function BlocksTable({ blocks, onEdit, onLift }: {
  blocks: VenueBlock[]; onEdit: (block: VenueBlock) => void; onLift: (block: VenueBlock) => void;
}) {
  const columns: Column<VenueBlock>[] = [
    { header: 'Start', cell: block => formatDate(block.startsAt, true) },
    { header: 'End', cell: block => block.endsAt ? formatDate(block.endsAt, true) : 'Until lifted' },
    { header: 'Category', cell: block => CATEGORY_LABELS[block.reasonCategory] },
    { header: 'Note', cell: block => block.reason, primary: true },
    {
      header: 'Actions', key: 'edit', hideHeader: true,
      cell: block => <Button icon={<PencilLine size={14} aria-hidden="true" />} onClick={() => onEdit(block)}>Edit…</Button>,
    },
    {
      header: 'Actions', key: 'lift', hideHeader: true,
      cell: block => <Button variant="danger" icon={<Unlock size={14} aria-hidden="true" />} onClick={() => onLift(block)}>Lift…</Button>,
    },
  ];
  return <DataTable caption="Current and upcoming maintenance blocks" columns={columns} rows={blocks} rowKey={block => block.id} />;
}

type FormErrors = { startDate?: string; startTime?: string; endDate?: string; endTime?: string; category?: string; note?: string };

// The form takes Singapore wall-clock time (UTC+08:00, no daylight saving).
function sgtInstant(date: string, time: string): string {
  return `${date}T${time}:00+08:00`;
}

const SGT_MS = 8 * 60 * 60 * 1000;

// An ISO instant as the Singapore date and time the form fields show.
function sgtFields(instant: string | null): [date: string, time: string] {
  if (!instant) return ['', ''];
  const local = new Date(Date.parse(instant) + SGT_MS).toISOString();
  return [local.slice(0, 10), local.slice(11, 16)];
}

// Scenarios 1 and 5: one form to create an unavailability or edit one; with
// `initial` it starts from that unavailability and offers Cancel.
function UnavailabilityForm({ title, hint, initial, submitLabel, submitIcon, submit, onCancel, onSaved, onConflict }: {
  title: string;
  hint: string;
  initial?: VenueBlock;
  submitLabel: string;
  submitIcon: ReactNode;
  submit: (input: UnavailabilityInput) => Promise<ApiResult<SavedUnavailability>>;
  onCancel?: () => void;
  onSaved: (saved: SavedUnavailability) => void;
  onConflict: (alert: ConflictAlert) => void;
}) {
  const [initialStartDate, initialStartTime] = sgtFields(initial?.startsAt ?? null);
  const [initialEndDate, initialEndTime] = sgtFields(initial?.endsAt ?? null);
  const [startDate, setStartDate] = useState(initialStartDate);
  const [startTime, setStartTime] = useState(initialStartTime);
  const [endDate, setEndDate] = useState(initialEndDate);
  const [endTime, setEndTime] = useState(initialEndTime);
  const [category, setCategory] = useState<ReasonCategory | ''>(initial?.reasonCategory ?? '');
  const [note, setNote] = useState(initial?.reason ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingHintId = useId();

  function validate(): FormErrors {
    const next: FormErrors = {};
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    const outcome = await submit({
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
    <Card title={title}>
      <form onSubmit={handleSubmit} aria-describedby={headingHintId} noValidate>
        <p id={headingHintId} className="field-hint">{hint}</p>
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
          {onCancel ? <Button onClick={onCancel} disabled={busy}>Cancel</Button> : null}
          <Button type="submit" variant="primary" busy={busy} busyLabel="Saving…" icon={submitIcon}>{submitLabel}</Button>
        </FormActions>
      </form>
    </Card>
  );
}
