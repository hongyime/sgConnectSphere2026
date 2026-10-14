import { apiCall } from '../../shared';
export type Availability = {
  id: string;
  name: string;
  totalStock: number;
  location: string | null;
  operationalStatus: string;
  reservedQuantity: number;
  unavailableQuantity: number;
  freeQuantity: number;
  operationallyUnavailable: boolean;
};
export type AvailabilityResult = {
  period: { start: string; end: string };
  equipment: Availability[];
};
export function checkAvailability(
  start: string,
  end: string,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams({ mode: 'availability', start, end });
  return apiCall<AvailabilityResult>(
    `/api/equipment?${params}`,
    { signal },
    'Equipment availability could not be loaded.',
  );
}
