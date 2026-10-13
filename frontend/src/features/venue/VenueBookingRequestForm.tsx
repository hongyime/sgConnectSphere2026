// Reusable form for E06-S03's future submission flow. Not mounted in the live
// application until buffered persistence and the submission endpoint land.
import { Alert, Button, FormActions, FormField, FormSection } from '../../shared';

export type BookingRequestDraft = { starts_at: string; ends_at: string; purpose: string; headcount: string };

export function VenueBookingRequestForm({ value, onChange, onReview, expectedAttendance, busy = false, errors = {}, error, mismatches = [] }: {
  value: BookingRequestDraft;
  onChange: (value: BookingRequestDraft) => void;
  onReview: (value: BookingRequestDraft) => void;
  expectedAttendance: number;
  busy?: boolean;
  errors?: Record<string, string[]>;
  error?: string;
  mismatches?: string[];
}) {
  return <form aria-label="Venue booking request" onSubmit={event => { event.preventDefault(); if (!busy) onReview(value); }}>
    {error && <Alert tone="error">{error}</Alert>}
    {mismatches.length > 0 && <Alert tone="warning" title="Suitability is advisory">
      <p>These requirements are not met. An unsuitable venue may still be requested for Venue Staff to review.</p>
      <ul>{mismatches.map(message => <li key={message}>{message}</li>)}</ul>
    </Alert>}
    <p>Times use your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). The booking must be within the event period.</p>
    <FormSection title="Booking details">
      {(['starts_at', 'ends_at'] as const).map(key => <FormField key={key} label={key === 'starts_at' ? 'Booking start (required)' : 'Booking end (required)'} error={errors[key]?.join(' ')}>
        {props => <input {...props} type="datetime-local" required disabled={busy} value={value[key]} onChange={event => onChange({ ...value, [key]: event.target.value })} />}
      </FormField>)}
      <FormField label="Purpose (optional)" hint="For example, Main programme or Breakout A. Maximum 80 characters." error={errors.purpose?.join(' ')}>
        {props => <input {...props} maxLength={80} disabled={busy} value={value.purpose} onChange={event => onChange({ ...value, purpose: event.target.value })} />}
      </FormField>
      <FormField label="Headcount (optional)" hint={`Leave blank to use the event attendance of ${expectedAttendance}.`} error={errors.headcount?.join(' ')}>
        {props => <input {...props} type="number" min={1} max={2147483647} step={1} disabled={busy} value={value.headcount} onChange={event => onChange({ ...value, headcount: event.target.value })} />}
      </FormField>
    </FormSection>
    {errors.booking_range && <Alert tone="error">{errors.booking_range.join(' ')}</Alert>}
    <FormActions><Button type="submit" variant="primary" busy={busy} busyLabel="Reviewing request...">Review request</Button></FormActions>
  </form>;
}
