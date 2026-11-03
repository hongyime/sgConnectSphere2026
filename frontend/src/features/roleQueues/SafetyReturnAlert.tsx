// E08-S06 (D109): why the Safety Officer sent this Event back to Planning, on
// the Coordinator's readiness page and the Organiser's event page. The API sets
// it until the Event re-enters Safety Review.
import { Alert, formatDate } from '../../shared';
import type { SafetyReturn } from './roleQueueApi';

export function SafetyReturnAlert({ value }: { value: SafetyReturn | undefined }) {
  if (!value) return null;
  const rejected = value.decision === 'reject';
  return (
    <Alert tone="warning" title={rejected ? 'Safety arrangement rejected' : 'Safety check: changes requested'}>
      The Safety Officer {rejected ? 'rejected the safety arrangement' : 'requested changes'} on {formatDate(value.decidedAt, true)}.
      {' '}Reason: {value.reason ?? 'Not recorded'}{/[.!?]$/.test(value.reason ?? '') ? '' : '.'} The event goes back to Safety Review once it's resubmitted for its safety check.
    </Alert>
  );
}
