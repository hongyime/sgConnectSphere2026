import { apiCall } from '../../shared';

export type Suitability = {
  event: { id: string; title: string; status?: string; start: string; end: string; accessibility_note?: string | null };
  // E04-S02: present when the assessment is for one Session; event.start/end are then that Session's.
  session?: { id: string; title: string | null } | null;
  assessment: {
    id: string; name: string; location: string; suitable: boolean; available: boolean;
    advisory: true; mismatches: string[];
    comparisons: { criterion: string; required: string; provided: string }[];
  };
};

export function getVenueSuitability(eventId: string, venueId: string, signal?: AbortSignal, sessionId?: string) {
  const params = new URLSearchParams({ mode: 'assessment', event_id: eventId, venue_id: venueId });
  if (sessionId) params.set('session_id', sessionId);
  return apiCall<Suitability>(`/api/venues?${params}`, { signal }, 'Unable to check venue suitability.');
}
