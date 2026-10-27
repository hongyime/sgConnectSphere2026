// E05-S06 (SCRUM-152) Scenario 3: the venue-conflict flag on the assigned
// Coordinator's event page (/coordinator/events/:eventCode). When Venue Staff
// mark a venue unavailable over this event's booking, the booking becomes
// Conflicting; this names each affected venue and the reason category and
// links to the venue bookings page, which has the full details.
// Data comes from the same list as that page (venueBookingRequestsApi.ts). A
// refused or failed load shows nothing: the flag is a pointer, not the record.
import { AlertTriangle } from 'lucide-react';
import { Alert, ButtonLink, useLoad } from '../../shared';
import { CATEGORY_LABELS } from '../venue/blocksApi';
import { getVenueBookingRequests } from '../venue/venueBookingRequestsApi';

// The statuses in which a booking can still be made Conflicting.
export const CONFLICT_VISIBLE = ['approved', 'planning', 'safety_review', 'confirmed'];

export function VenueConflictFlag({ eventCode }: { eventCode: string }) {
  const { result } = useLoad(signal => getVenueBookingRequests(eventCode, signal), [eventCode]);
  if (result.state !== 'ready' || !Array.isArray(result.data.bookings)) return null;
  const conflicting = result.data.bookings.filter(booking => booking.status === 'conflicting');
  if (!conflicting.length) return null;
  return (
    <Alert
      tone="warning"
      title="Venue unavailable"
      action={<ButtonLink to={`/coordinator/events/${encodeURIComponent(eventCode)}/venue-bookings`}>View venue bookings</ButtonLink>}
    >
      <ul className="coordinator-conflicts" aria-label="Venues no longer available">
        {conflicting.map(booking => (
          <li key={booking.id}>
            <AlertTriangle size={14} aria-hidden="true" /> {booking.venue_name}
            {booking.conflict_reason_category ? ` — ${CATEGORY_LABELS[booking.conflict_reason_category]}` : ''}
          </li>
        ))}
      </ul>
      Alternative arrangements are required.
    </Alert>
  );
}
