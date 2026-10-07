// Mock fixtures for the Venue Staff role. Stable identifiers so navigation
// between screens is coherent. No live network calls.

export type BookingStatus = 'Pending' | 'Tentative' | 'Confirmed' | 'Blocked';

export type Venue = {
  id: string;
  name: string;
  capacity: number;
  layouts: string[];
  facilities: string[];
  accessibility: string[];
  status: 'Available' | 'Maintenance';
};

export type Booking = {
  id: string;
  eventCode: string;
  eventTitle: string;
  venueId: string;
  date: string;
  window: string;
  status: BookingStatus;
  suitability: number;
};

export const venues: Venue[] = [
  { id: 'V-01', name: 'Auditorium A', capacity: 320, layouts: ['Theatre', 'Cabaret'], facilities: ['Stage', 'AV desk'], accessibility: ['Hearing loop', 'Step-free'], status: 'Available' },
  { id: 'V-02', name: 'Auditorium B', capacity: 180, layouts: ['Theatre'], facilities: ['Stage', 'Projector'], accessibility: ['Step-free'], status: 'Available' },
  { id: 'V-03', name: 'Central Hall',  capacity: 324, layouts: ['Banquet', 'Reception'], facilities: ['Bar', 'Green room'], accessibility: ['Hearing loop', 'Step-free', 'Braille signage'], status: 'Available' },
  { id: 'V-04', name: 'Seminar Room 3', capacity: 60,  layouts: ['U-shape', 'Boardroom'], facilities: ['Whiteboard'], accessibility: ['Step-free'], status: 'Maintenance' },
];

export const bookings: Booking[] = [
  { id: 'B-1001', eventCode: 'EVT-C01', eventTitle: 'Annual Sustainability Forum', venueId: 'V-03', date: '2026-10-08', window: '09:00-17:00', status: 'Pending',   suitability: 82 },
  { id: 'B-1002', eventCode: 'EVT-C02', eventTitle: 'Faculty Career Mixer',        venueId: 'V-02', date: '2026-09-25', window: '18:00-22:00', status: 'Confirmed', suitability: 96 },
  { id: 'B-1003', eventCode: 'EVT-C03', eventTitle: 'International Student Welcome', venueId: 'V-03', date: '2026-09-20', window: '10:00-16:00', status: 'Confirmed', suitability: 90 },
  { id: 'B-1004', eventCode: 'EVT-N04', eventTitle: 'Design Studio Recital',       venueId: 'V-01', date: '2026-10-11', window: '14:00-16:00', status: 'Tentative', suitability: 88 },
  { id: 'B-1005', eventCode: 'EVT-N05', eventTitle: 'Alumni Panel',                venueId: 'V-04', date: '2026-10-12', window: '13:00-15:00', status: 'Blocked',   suitability: 65 },
];

export function findVenue(id: string) {
  return venues.find(venue => venue.id === id);
}

export function findBooking(id: string) {
  return bookings.find(booking => booking.id === id);
}

export const venueSummary = {
  pending: bookings.filter(booking => booking.status === 'Pending').length,
  confirmed: bookings.filter(booking => booking.status === 'Confirmed').length,
  conflicts: bookings.filter(booking => booking.status === 'Blocked').length,
};
