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
};
export type RequestDetail = {
  event: RequestEvent;
  requests: EquipmentRequest[];
  equipment: EquipmentOption[];
  canEdit: boolean;
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
