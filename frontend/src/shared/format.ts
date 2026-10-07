// Plain-language formatting shared by every screen.

// "under_review" -> "Under review"
export function statusLabel(status: string): string {
  const text = status.replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Event times are Singapore times (design.md section 8.1), whatever the
// browser's own timezone.
const ZONE = 'Asia/Singapore';
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

// ISO timestamp -> "12 Nov 2026" or "12 Nov 2026, 9:00 am". Missing or invalid -> "Not recorded".
export function formatDate(value: string | null | undefined, withTime = false): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-SG', withTime
    ? { timeZone: ZONE, day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }
    : { timeZone: ZONE, day: 'numeric', month: 'short', year: 'numeric' });
}

// Start and end as one range; the end shows only a time when it's the same day.
export function formatDateRange(startsAt: string, endsAt: string): string {
  const start = formatDate(startsAt, true);
  const sameDay = dayKey.format(new Date(startsAt)) === dayKey.format(new Date(endsAt));
  const end = sameDay
    ? new Date(endsAt).toLocaleTimeString('en-SG', { timeZone: ZONE, hour: 'numeric', minute: '2-digit' })
    : formatDate(endsAt, true);
  return `${start} – ${end}`;
}
