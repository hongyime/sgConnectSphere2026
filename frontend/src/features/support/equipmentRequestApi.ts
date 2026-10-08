import { apiCall, jsonRequest } from '../../shared';
export type EquipmentRequest = {
  id: string;
  equipmentId: string;
  name: string;
  quantity: number;
  notes: string;
  totalStock: number;
  operationalStatus: string;
  isActive: boolean;
  reserved: boolean;
  // E07-S04: the current reservation, or the latest released one.
  reservation: LineReservation | null;
  // Technical Support only: units this line could use for the event's dates.
  freeQuantity?: number | null;
};
export type LineReservation = {
  id: string;
  status: 'reserved' | 'partial' | 'released';
  quantityReserved: number;
  requiresReconfirmation: boolean;
};
export type EquipmentOption = {
  id: string;
  name: string;
  category: string;
  total_quantity: number;
  operational_status: string;
};
export type RequestEvent = {
  id: string;
  eventCode: string | null;
  title: string;
  status: string;
  requestCount?: number;
  startsAt?: string;
  endsAt?: string;
};
export type RequestDetail = {
  event: RequestEvent;
  requests: EquipmentRequest[];
  equipment: EquipmentOption[];
  canEdit: boolean;
  canReserve?: boolean;
  canRelease?: boolean;
};
export type SaveResult = {
  requestId: string;
  changed: boolean;
  notified: number;
  warning: { name: string; requested: number; totalStock: number } | null;
};
const endpoint = (event?: string) =>
  `/api/equipment?mode=requests${event ? `&event=${encodeURIComponent(event)}` : ''}`;
export const listRequestEvents = (signal?: AbortSignal) =>
  apiCall<{ events: RequestEvent[] }>(
    endpoint(),
    { signal },
    'Equipment requests could not be loaded.',
  );
export const getRequests = (event: string, signal?: AbortSignal) =>
  apiCall<RequestDetail>(
    endpoint(event),
    { signal },
    'Equipment requests could not be loaded.',
  );
export const saveRequest = (
  event: string,
  input: { id?: string; equipmentId: string; quantity: number; notes: string },
) =>
  apiCall<SaveResult>(
    endpoint(event),
    jsonRequest('POST', { action: 'saveRequest', ...input }),
    'The equipment request could not be saved.',
  );
export const removeRequest = (event: string, id: string) =>
  apiCall<{ removed: true; notified: number }>(
    endpoint(event),
    jsonRequest('POST', { action: 'removeRequest', id }),
    'The equipment request could not be removed.',
  );

// E07-S04 reservation writers (Technical Support Staff).
export type ReservationOutcome = {
  changed: boolean;
  notified: number;
  event: { eventCode: string | null; title: string; startsAt: string; endsAt: string };
  reservation: {
    id: string;
    requestId: string;
    name: string;
    status: LineReservation['status'];
    quantityReserved: number;
    quantityRequested: number;
    outstanding: number;
  };
};
export const reserveEquipment = (
  event: string,
  input: { requestId: string; quantity: number },
) =>
  apiCall<ReservationOutcome>(
    endpoint(event),
    jsonRequest('POST', { action: 'reserve', ...input }),
    'The equipment could not be reserved.',
  );
export const changeReservation = (
  event: string,
  input: { reservationId: string; quantity: number },
) =>
  apiCall<ReservationOutcome>(
    endpoint(event),
    jsonRequest('POST', { action: 'changeReservation', ...input }),
    'The reservation could not be changed.',
  );
export const releaseReservation = (event: string, reservationId: string) =>
  apiCall<ReservationOutcome>(
    endpoint(event),
    jsonRequest('POST', { action: 'releaseReservation', reservationId }),
    'The reservation could not be released.',
  );
