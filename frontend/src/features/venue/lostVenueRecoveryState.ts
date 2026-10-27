type LinkedBooking = { id: string; status: string; replaces_booking_id?: string | null; has_replacement?: boolean };

// Rejected replacements retain history and their predecessor slot (T-96).
// Recovery follows the complete same-Event chain, ignoring Released branches.
export function lostVenueRecoveryState<T extends LinkedBooking>(bookings: T[], original: T) {
  const seen = new Set([original.id]);
  const replacements: T[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const booking of bookings) {
      if (booking.status !== 'released' && booking.replaces_booking_id && seen.has(booking.replaces_booking_id) && !seen.has(booking.id)) {
        seen.add(booking.id); replacements.push(booking); changed = true;
      }
    }
  }
  const canRequest = replacements.length ? replacements.every(b => b.status === 'rejected') : !original.has_replacement;
  return { replacements, canRequest };
}
