// Plain-language formatting shared by every screen.

// "under_review" -> "Under review"
export function statusLabel(status: string): string {
  const text = status.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// ISO timestamp -> "12 Nov 2026" or "12 Nov 2026, 9:00 am". Missing or invalid -> "Not recorded".
export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-SG', withTime
    ? { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { day: 'numeric', month: 'short', year: 'numeric' });
}

// Start and end as one range; the end shows only a time when it's the same day.
export function formatDateRange(startsAt: string, endsAt: string): string {
  const start = formatDate(startsAt, true);
  const sameDay = new Date(startsAt).toDateString() === new Date(endsAt).toDateString();
  const end = sameDay
    ? new Date(endsAt).toLocaleTimeString('en-SG', { hour: 'numeric', minute: '2-digit' })
    : formatDate(endsAt, true);
  return `${start} – ${end}`;
}
