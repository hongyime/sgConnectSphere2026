import { useRef, useState, type FormEvent } from 'react';
import { Alert, Button, ButtonLink, Card, FormActions, FormField, FormSection, apiCall, jsonRequest } from '../../shared';
import { toLocalInput } from '../events/EventEditForm';

type Props = { eventId: string; eventCode: string; venueId: string; start: string; end: string; onViewBookings?: () => void; onSubmitted?: () => void; replacement?: { id: string; starts_at: string; ends_at: string; purpose: string; headcount: number | null } };
type Result = { booking: { id: string }; suitability: { suitable: boolean; mismatches: string[] } };
export function VenueBookingForm({ eventId, eventCode, venueId, start, end, replacement, onViewBookings, onSubmitted }: Props) {
  const [fields, setFields] = useState({ starts_at: toLocalInput(replacement?.starts_at ?? start), ends_at: toLocalInput(replacement?.ends_at ?? end), purpose: replacement?.purpose ?? '', headcount: replacement?.headcount == null ? '' : String(replacement.headcount) });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [failure, setFailure] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState<Result | null>(null);
  // Retain a key on a network retry, rotate only when the submitted payload changes.
  const submission = useRef<{ payload: string; key: string } | null>(null);
  function change(key: keyof typeof fields, value: string) { setFields(old => ({ ...old, [key]: value })); setErrors({}); setFailure(''); }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return;
    const invalid: Record<string, string[]> = {};
    const first = new Date(fields.starts_at), last = new Date(fields.ends_at);
    if (!Number.isFinite(first.getTime())) invalid.starts_at = ['Enter when the booking starts.'];
    if (!Number.isFinite(last.getTime()) || last <= first) invalid.ends_at = ['The booking must end after it starts.'];
    else if (first < new Date(start) || last > new Date(end)) invalid.ends_at = ['The booking period must fall within the event.'];
    if (fields.headcount && (!/^\d+$/.test(fields.headcount) || Number(fields.headcount) < 1 || Number(fields.headcount) > 2147483647)) invalid.headcount = ['Enter a whole number greater than zero.'];
    if (fields.purpose.trim().length > 80) invalid.purpose = ['Purpose must be at most 80 characters.'];
    setErrors(invalid); setFailure(''); if (Object.keys(invalid).length) return;
    const payload = { ...(replacement ? { replaces_booking_id: replacement.id } : {}), action: 'request_booking', event_id: eventId, venue_id: venueId, starts_at: first.toISOString(), ends_at: last.toISOString(), purpose: fields.purpose.trim() || null, headcount: fields.headcount ? Number(fields.headcount) : null };
    const encoded = JSON.stringify(payload);
    if (submission.current?.payload !== encoded) submission.current = { payload: encoded, key: crypto.randomUUID() };
    setBusy(true);
    const init = jsonRequest('POST', payload);
    const result = await apiCall<Result>('/api/venues', { ...init, headers: { ...init.headers, 'Idempotency-Key': submission.current!.key } }, 'Unable to submit the booking request.');
    setBusy(false);
    if (result.ok) { setSaved(result.data); onSubmitted?.(); } else { setErrors(result.fieldErrors ?? {}); setFailure(result.message); }
  }
  if (saved) return <Card title="Booking request submitted"><Alert tone="success">Your request is Pending. The venue is reserved tentatively while a decision is outstanding.</Alert>
    {!!saved.suitability.mismatches.length && <><h3>Advisory unmet requirements</h3><ul>{saved.suitability.mismatches.map(message => <li key={message}>{message}</li>)}</ul></>}
    {onViewBookings ? <Button onClick={onViewBookings}>View venue booking requests</Button> : <ButtonLink to={`/coordinator/events/${encodeURIComponent(eventCode)}/venue-bookings`}>View venue booking requests</ButtonLink>}
  </Card>;
  return <Card title={replacement ? "Request suggested venue" : "Request this venue"}><p>Suitability is advisory. The submitted period must be within the event; availability is checked again when you submit.</p>
    {failure && <Alert tone="error">{failure}</Alert>}
    <form aria-label="Request venue booking" onSubmit={submit} noValidate>
      <FormSection title="Booking details">
        <FormField label="Booking start" error={errors.starts_at?.[0]}>{props => <input {...props} type="datetime-local" value={fields.starts_at} onChange={e => change('starts_at', e.target.value)} disabled={busy} />}</FormField>
        <FormField label="Booking end" error={errors.ends_at?.[0]}>{props => <input {...props} type="datetime-local" value={fields.ends_at} onChange={e => change('ends_at', e.target.value)} disabled={busy} />}</FormField>
        <FormField label="Purpose (optional)" error={errors.purpose?.[0]} hint="At most 80 characters.">{props => <input {...props} value={fields.purpose} onChange={e => change('purpose', e.target.value)} disabled={busy} />}</FormField>
        <FormField label="Headcount (optional)" error={errors.headcount?.[0]} hint="Leave blank to use the event attendance.">{props => <input {...props} type="number" min="1" step="1" value={fields.headcount} onChange={e => change('headcount', e.target.value)} disabled={busy} />}</FormField>
      </FormSection>
      <FormActions><Button type="submit" variant="primary" busy={busy} busyLabel="Submitting...">Submit booking request</Button></FormActions>
    </form>
  </Card>;
}
