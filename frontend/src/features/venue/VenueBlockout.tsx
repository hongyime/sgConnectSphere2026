// E05-S04 "Block a venue for maintenance" on the shared blocks (ADR-017
// skeleton pilot, SCRUM-120). Venue Staff list a venue's current and upcoming
// blocks, create a block, shorten a block, and remove a block. Server 409
// refusals (confirmed-booking overlap, existing-block overlap) are shown
// verbatim with the conflicting item named; the save confirmation reports how
// many upcoming events had their Coordinator notified.
//
// Backend contract: see api/venues/index.ts (?blocks=1 for the list; POST
// actions block / shorten_block / remove_block) and
// backend/src/modules/venueBooking/blocks.ts for the request and response
// shapes. Dates travel as YYYY-MM-DD whole Singapore days; the server stores
// them as [from 00:00, day after to 00:00).
import { useEffect, useId, useState, type FormEvent } from 'react';
import { CalendarClock, PencilLine, Plus, Trash2 } from 'lucide-react';
import {
  Alert, Button, Card, ConfirmPanel, DataTable, EmptyState, ErrorState, FormActions, FormField, FormSection,
  LoadingState, PageLayout, formatDate, useLoad,
  type Column,
} from '../../shared';
import { listVenues, type Venue } from './venueApi';
import {
  conflictingBookings, createBlock, listBlocks, overlappingBlocks, removeBlock, shortenBlock,
  type ConflictingBooking, type VenueBlock,
} from './blocksApi';

type Flash = { tone: 'success'; message: string } | null;
type ConflictAlert = { message: string; conflicts: ConflictingBooking[]; overlaps: VenueBlock[] } | null;

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

function VenueBlocksPanel({ venueId }: { venueId: string }) {
  const { result, reload } = useLoad(signal => listBlocks(venueId, signal), [venueId]);
  const [flash, setFlash] = useState<Flash>(null);
  const [conflict, setConflict] = useState<ConflictAlert>(null);
  const [editing, setEditing] = useState<EditingState>({ kind: 'none' });

  function afterChange(message: string) {
    setFlash({ tone: 'success', message });
    setConflict(null);
    setEditing({ kind: 'none' });
    reload();
  }

  return (
    <>
      {flash ? <Alert tone="success">{flash.message}</Alert> : null}
      {conflict ? (
        <Alert tone="error" title="Resolve the conflict first">
          {conflict.message}
          {conflict.conflicts.length ? (
            <ul className="venue-blocking">
              {conflict.conflicts.map(booking => (
                <li key={`${booking.eventCode ?? 'no-code'}-${booking.startsAt}`}>
                  {booking.title} ({booking.eventCode ?? 'no code'}), {formatDate(booking.startsAt, true)}
                </li>
              ))}
            </ul>
          ) : null}
          {conflict.overlaps.length ? (
            <ul className="venue-blocking">
              {conflict.overlaps.map(block => (
                <li key={block.id}>
                  {block.from === block.to
                    ? `${block.from}: ${block.reason}`
                    : `${block.from} to ${block.to}: ${block.reason}`}
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
          title={`Remove the ${editing.block.from === editing.block.to ? editing.block.from : `${editing.block.from} to ${editing.block.to}`} block?`}
          description={`${editing.block.reason}. Removing restores availability for the released dates.`}
          confirmLabel="Remove block"
          danger
          onCancel={() => setEditing({ kind: 'none' })}
          onConfirm={async () => {
            const outcome = await removeBlock(venueId, editing.block.id);
            if (outcome.ok) {
              afterChange('Block removed. The released dates are available again.');
            } else {
              setConflict({ message: outcome.message, conflicts: [], overlaps: [] });
              setEditing({ kind: 'none' });
            }
          }}
        />
      ) : null}

      <CreateBlockCard
        venueId={venueId}
        onSaved={notified => afterChange(notifiedMessage(notified))}
        onConflict={setConflict}
      />
    </>
  );
}

function notifiedMessage(notified: number): string {
  if (notified === 0) return 'Block saved.';
  if (notified === 1) return 'Block saved. The Coordinator was notified for 1 affected upcoming event.';
  return `Block saved. Coordinators were notified for ${notified} affected upcoming events.`;
}

function BlocksTable({ blocks, onShorten, onRemove }: {
  blocks: VenueBlock[]; onShorten: (block: VenueBlock) => void; onRemove: (block: VenueBlock) => void;
}) {
  const columns: Column<VenueBlock>[] = [
    { header: 'From', cell: block => block.from },
    { header: 'To', cell: block => block.to },
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

type CreateErrors = { from?: string; to?: string; reason?: string };

function CreateBlockCard({ venueId, onSaved, onConflict }: {
  venueId: string;
  onSaved: (notified: number) => void;
  onConflict: (alert: ConflictAlert) => void;
}) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<CreateErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const headingHintId = useId();

  function validate(): CreateErrors {
    const next: CreateErrors = {};
    if (!from) next.from = 'Start date is required.';
    if (!to) next.to = 'End date is required.';
    if (from && to && to < from) next.to = 'End date must be on or after the start date.';
    if (!reason.trim()) next.reason = 'A reason for the block is required.';
    return next;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = validate();
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) return;
    setBusy(true);
    const outcome = await createBlock(venueId, { from, to, reason: reason.trim() });
    setBusy(false);
    if (outcome.ok) {
      setFrom('');
      setTo('');
      setReason('');
      onSaved(outcome.data.notifiedEventCount);
      return;
    }
    if (outcome.status === 409 && outcome.code === 'booking_conflict') {
      onConflict({ message: outcome.message, conflicts: conflictingBookings(outcome.details), overlaps: [] });
      return;
    }
    if (outcome.status === 409 && outcome.code === 'block_overlap') {
      onConflict({ message: outcome.message, conflicts: [], overlaps: overlappingBlocks(outcome.details) });
      return;
    }
    if (outcome.fieldErrors) {
      setErrors({
        from: outcome.fieldErrors.from?.[0],
        to: outcome.fieldErrors.to?.[0],
        reason: outcome.fieldErrors.reason?.[0],
      });
      return;
    }
    setServerError(outcome.message);
  }

  return (
    <Card title="Block this venue">
      <form onSubmit={submit} aria-describedby={headingHintId} noValidate>
        <p id={headingHintId} className="field-hint">
          Enter the first and last day of the block and the reason. Overlaps with a confirmed booking or an existing block are refused.
        </p>
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <FormSection title="Period">
          <FormField label="From" error={errors.from}>
            {props => <input {...props} type="date" value={from} onChange={event => setFrom(event.target.value)} />}
          </FormField>
          <FormField label="To" error={errors.to}>
            {props => <input {...props} type="date" value={to} onChange={event => setTo(event.target.value)} />}
          </FormField>
          <FormField label="Reason" wide error={errors.reason}>
            {props => <input {...props} type="text" value={reason} maxLength={255} onChange={event => setReason(event.target.value)} placeholder="e.g. Scheduled maintenance" />}
          </FormField>
        </FormSection>
        <FormActions>
          <Button type="submit" variant="primary" busy={busy} busyLabel="Saving…" icon={<Plus size={14} aria-hidden="true" />}>Save block</Button>
        </FormActions>
      </form>
    </Card>
  );
}

type ShortenErrors = { to?: string; reason?: string };

function ShortenCard({ venueId, block, onCancel, onSaved }: {
  venueId: string; block: VenueBlock; onCancel: () => void; onSaved: () => void;
}) {
  const [newTo, setNewTo] = useState(block.to);
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
    if (newTo && newTo > block.to) next.to = 'A block can only be shortened. Create a new block to cover extra dates.';
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
    <Card title={`Shorten the ${block.from === block.to ? block.from : `${block.from} to ${block.to}`} block`}>
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
            {props => <input {...props} type="date" value={newTo} min={block.from} max={block.to} onChange={event => setNewTo(event.target.value)} />}
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
