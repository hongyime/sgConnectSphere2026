import { formatSgt } from './bookingShared.js';

export type Criteria = { start: string; end: string; attendance: number; capacity: number; layout: string; location: string; accessibility: string[]; facilities: string[]; q: string };
export type Option = { id: string; label: string };
// booking_overlap (E05-S05 Scenario 7): the first stretch of the requested
// period that another booking or hold needs once setup and turnaround apply.
export type Candidate = { id: string; name: string; location: string; max_capacity: number; available: boolean; layouts: (Option & { capacity: number })[]; accessibility: Option[]; facilities: Option[]; booking_overlap?: { starts_at: string; ends_at: string } | null };

export function assessVenue(venue: Candidate, criteria: Criteria) {
  const mismatches: string[] = [];
  const layout = venue.layouts.find(item => item.id === criteria.layout);
  if (criteria.layout && !layout) mismatches.push('Required room layout is not supported.');
  const capacity = criteria.layout ? layout?.capacity : venue.max_capacity;
  if (capacity !== undefined && capacity < Math.max(criteria.attendance, criteria.capacity)) mismatches.push(`Capacity ${capacity} is below the required ${Math.max(criteria.attendance, criteria.capacity)} places.`);
  if (criteria.location && !venue.location.toLowerCase().includes(criteria.location.toLowerCase())) mismatches.push('Location does not match.');
  for (const id of criteria.accessibility) if (!venue.accessibility.some(item => item.id === id)) mismatches.push(`Missing accessibility feature: ${id}`);
  for (const id of criteria.facilities) if (!venue.facilities.some(item => item.id === id)) mismatches.push(`Missing facility: ${id}`);
  if (!venue.available) {
    const overlap = venue.booking_overlap;
    mismatches.push(overlap
      ? `Unavailable during the requested period: another booking needs the venue from ${formatSgt(new Date(overlap.starts_at))} to ${formatSgt(new Date(overlap.ends_at))}, including setup and turnaround.`
      : 'Unavailable during the requested period.');
  }
  return { ...venue, effective_capacity: capacity ?? null, suitable: mismatches.length === 0, mismatches };
}
