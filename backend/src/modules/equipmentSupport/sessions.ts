// E07-S08 (SCRUM-181): an Event's Sessions as the equipment screens, notices
// and readiness name them. Order and numbering follow the Session screens
// (start time, then id); an untitled Session is "Session N".
import type { Query } from '../eventVisibility/service.js';
import { formatEventDates } from './reservations.js';

export type EquipmentSession = {
  id: string;
  title: string | null;
  number: number;
  startsAt: Date;
  endsAt: Date;
};

export async function eventSessions(query: Query, eventId: string) {
  return (
    await query<EquipmentSession>(
      `SELECT id,nullif(title,'') AS title,
        (row_number() OVER (ORDER BY lower(session_range),id))::int AS number,
        lower(session_range) AS "startsAt",upper(session_range) AS "endsAt"
      FROM sessions WHERE event_id=$1 ORDER BY lower(session_range),id`,
      [eventId],
    )
  ).rows;
}

export function sessionLabel(session: EquipmentSession) {
  return session.title ? `Session "${session.title}"` : `Session ${session.number}`;
}

// 'Session "Morning", 1 Dec 2026, 9:00 am – 11:00 am'
export function sessionWhen(session: EquipmentSession) {
  return `${sessionLabel(session)}, ${formatEventDates(session.startsAt, session.endsAt)}`;
}

// D131: on a multi-Session Event, wording names the Session and uses its
// dates; otherwise it keeps the Event's dates, as before.
export function whenText(
  event: { startsAt: Date; endsAt: Date },
  session: EquipmentSession | null | undefined,
  sessions: readonly EquipmentSession[],
) {
  return sessions.length > 1 && session
    ? sessionWhen(session)
    : formatEventDates(event.startsAt, event.endsAt);
}

// D131: the Activity log's suffix, empty on a single-Session Event.
export function forSession(
  session: EquipmentSession | null | undefined,
  sessions: readonly EquipmentSession[],
) {
  return sessions.length > 1 && session ? ` for ${sessionLabel(session)}` : '';
}
