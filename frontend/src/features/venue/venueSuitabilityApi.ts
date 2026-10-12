import { apiCall } from '../../shared';

export type Suitability = {
  event: { id: string; title: string; start: string; end: string; accessibility_note?: string | null };
  assessment: {
    id: string; name: string; location: string; suitable: boolean; available: boolean;
    advisory: true; mismatches: string[];
    comparisons: { criterion: string; required: string; provided: string }[];
  };
};

export function getVenueSuitability(eventId: string, venueId: string, signal?: AbortSignal) {
  const params = new URLSearchParams({ mode: 'assessment', event_id: eventId, venue_id: venueId });
  return apiCall<Suitability>(`/api/venues?${params}`, { signal }, 'Unable to check venue suitability.');
}
