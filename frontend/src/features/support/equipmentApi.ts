import { apiCall, jsonRequest } from '../../shared';
export type Equipment = {
  id: string; name: string; category: string; description: string; total_quantity: number;
  reservations?: (ReservationReview & {startsAt: string; endsAt: string; status: string; requiresReconfirmation: boolean})[];
  home_location: string; operational_status: 'available' | 'maintenance' | 'retired'; is_active: boolean;
};
export type EquipmentInput = Omit<Equipment, 'id' | 'is_active' | 'operational_status' | 'reservations'> & {operational_status: 'available' | 'maintenance'};
export type ReservationReview = { id: string; eventId: string; eventCode: string | null; title: string; quantity: number };
export function listEquipment(signal?: AbortSignal) {
  return apiCall<{ equipment: Equipment[] }>('/api/equipment', { signal }, 'Equipment could not be loaded.');
}
export function saveEquipment(input: EquipmentInput, id?: string) {
  return apiCall<{ equipment: Equipment; affectedReservations: ReservationReview[] }>('/api/equipment',
    jsonRequest('POST', { ...input, action: id ? 'update' : 'create', ...(id ? {id} : {}) }), 'Equipment could not be saved.');
}
export function retireEquipment(id: string) {
  return apiCall<{ retired: true }>('/api/equipment', jsonRequest('POST', { action: 'retire', id }), 'Equipment could not be retired.');
}

export async function getEquipment(id: string, signal?: AbortSignal) {
  const result = await apiCall<{equipment: Equipment}>(`/api/equipment?id=${encodeURIComponent(id)}`,{signal},'Equipment could not be loaded.');
  return result.ok ? {ok:true as const,data:result.data.equipment} : result;
}
