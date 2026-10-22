// Client for the E08-S03 (SCRUM-60) readiness endpoints in api/events.ts.
// The rules live in backend/src/modules/eventReadiness/; the page shows the
// server's own sentences, including each outstanding item's.
//   GET  /api/events?readiness=1&id=<id or code>     -> { readiness }
//   POST /api/events?safetyReview=1&id=<id or code>  -> { submission }
//     409 { error, readiness } when an arrangement is outstanding
import { apiCall, jsonRequest, type ApiResult } from '../../shared';

export type ReadinessBlocker = { kind: string; message: string };

export type Readiness = {
  eventId: string;
  eventCode: string | null;
  title: string;
  status: string;
  startsAt: string;
  endsAt: string;
  equipmentNoneRequired: boolean;
  supportNoneRequired: boolean;
  venueBookings: {
    id: string; venueName: string; status: string; purpose: string | null; startsAt: string; endsAt: string;
    state: 'ready' | 'outstanding' | 'withdrawn';
  }[];
  equipment: { id: string; name: string; requested: number; reserved: number; state: 'ready' | 'outstanding' }[];
  support: { id: string; description: string; startsAt: string; endsAt: string; status: string; state: 'ready' | 'outstanding' }[];
  blockers: ReadinessBlocker[];
  canSubmit: boolean;
};

export type Submission = { eventId: string; eventCode: string | null; status: 'safety_review'; statusChangedAt: string };

export async function getReadiness(identifier: string, signal?: AbortSignal): Promise<ApiResult<Readiness>> {
  const result = await apiCall<{ readiness: Readiness }>(
    `/api/events?readiness=1&id=${encodeURIComponent(identifier)}`, { signal }, 'Unable to load this event.');
  return result.ok ? { ok: true, data: result.data.readiness } : result;
}

export async function submitForSafetyReview(eventId: string) {
  const result = await apiCall<{ submission: Submission }>(
    `/api/events?safetyReview=1&id=${encodeURIComponent(eventId)}`, jsonRequest('POST'),
    'Unable to submit the event for its safety check.');
  return result.ok ? { ok: true as const, data: result.data.submission } : result;
}

// The refreshed snapshot a blocked submission returns, kept only if it is
// well formed, so a partial body never breaks the page.
export function readBlockedReadiness(details: Record<string, unknown> | undefined): Readiness | null {
  const value = details?.readiness as Readiness | undefined;
  return value && typeof value === 'object' && Array.isArray(value.blockers) && Array.isArray(value.venueBookings)
    ? value : null;
}
