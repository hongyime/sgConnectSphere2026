export type Criteria = { start: string; end: string; attendance: number; capacity: number; layout: string; location: string; accessibility: string[]; facilities: string[]; q: string };
export type Option = { id: string; label: string };
export type Candidate = { id: string; name: string; location: string; max_capacity: number; available: boolean; layouts: (Option & { capacity: number })[]; accessibility: Option[]; facilities: Option[] };

export function assessVenue(venue: Candidate, criteria: Criteria) {
  const mismatches: string[] = [];
  const layout = venue.layouts.find(item => item.id === criteria.layout);
  if (criteria.layout && !layout) mismatches.push('Required room layout is not supported.');
  const capacity = criteria.layout ? layout?.capacity : venue.max_capacity;
  if (capacity !== undefined && capacity < Math.max(criteria.attendance, criteria.capacity)) mismatches.push(`Capacity ${capacity} is below the required ${Math.max(criteria.attendance, criteria.capacity)} places.`);
  if (criteria.location && !venue.location.toLowerCase().includes(criteria.location.toLowerCase())) mismatches.push('Location does not match.');
  for (const id of criteria.accessibility) if (!venue.accessibility.some(item => item.id === id)) mismatches.push(`Missing accessibility feature: ${id}`);
  for (const id of criteria.facilities) if (!venue.facilities.some(item => item.id === id)) mismatches.push(`Missing facility: ${id}`);
  if (!venue.available) mismatches.push('Unavailable during the requested period.');
  return { ...venue, effective_capacity: capacity ?? null, suitable: mismatches.length === 0, mismatches };
}
