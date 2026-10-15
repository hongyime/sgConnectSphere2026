// E07-S05 (SCRUM-55): typed calls for marking equipment unavailable and
// returning it to service, on the shared apiCall (session cookie, ADR-015).
//
// A period is whole Singapore days: `from` and `to` are YYYY-MM-DD, both
// included, so the screens send and show them without timezone maths.
import { apiCall, jsonRequest } from '../../shared';
import type { ReservationReview } from './equipmentApi';

export type UnavailablePeriod = {
  id: string;
  equipmentId: string;
  quantity: number;
  reason: string;
  from: string;
  to: string;
  startsAt: string;
  endsAt: string;
};

export type UnavailabilityInput = { from: string; to: string; quantity: number; reason: string };

export type MarkedUnavailable = {
  unavailability: UnavailablePeriod;
  affectedReservations: ReservationReview[];
  notified: number;
};

export type ReturnedToService = {
  returned: true;
  equipment: { id: string; name: string };
  unavailability: UnavailablePeriod;
};

export function markUnavailable(equipmentId: string, input: UnavailabilityInput) {
  return apiCall<MarkedUnavailable>(
    '/api/equipment',
    jsonRequest('POST', { action: 'markUnavailable', id: equipmentId, ...input }),
    'The equipment could not be marked unavailable.',
  );
}

export function returnToService(unavailabilityId: string) {
  return apiCall<ReturnedToService>(
    '/api/equipment',
    jsonRequest('POST', { action: 'returnToService', unavailabilityId }),
    'The equipment could not be returned to service.',
  );
}
