export const EVENT_STATUSES = [
  'draft',
  'submitted',
  'under_review',
  'awaiting_clarification',
  'rejected',
  'approved',
  'planning',
  'confirmed',
  'cancelled',
  'completed',
] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

// BDR T-52: the statuses in which an event still has Coordinator work to do.
// E03-S01 counts these as a Coordinator's "active events" when choosing who
// to auto-assign (T-14), and only these events can be reassigned. Must stay
// equal to accessControl's DEACTIVATION_BLOCKING_STATUSES (the same T-52
// list); a unit test asserts they match.
export const ACTIVE_EVENT_STATUSES = [
  'submitted',
  'under_review',
  'awaiting_clarification',
  'approved',
  'planning',
  'confirmed',
] as const satisfies readonly EventStatus[];

const ALLOWED_TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  draft: ['submitted', 'cancelled'],
  submitted: ['under_review', 'cancelled'],
  under_review: ['awaiting_clarification', 'approved', 'rejected', 'cancelled'],
  awaiting_clarification: ['under_review', 'cancelled'],
  rejected: [],
  approved: ['planning', 'cancelled'],
  planning: ['confirmed', 'cancelled'],
  confirmed: ['planning', 'cancelled', 'completed'],
  cancelled: [],
  completed: [],
};

export type TransitionResult =
  | { allowed: true; from: EventStatus; to: EventStatus }
  | { allowed: false; from: string; to: string; reason: 'unknown_status' | 'illegal_transition' };

export function isEventStatus(value: string): value is EventStatus {
  return EVENT_STATUSES.includes(value as EventStatus);
}

export function allowedNextStatuses(status: EventStatus): readonly EventStatus[] {
  return ALLOWED_TRANSITIONS[status];
}

export function validateEventStatusTransition(from: string, to: string): TransitionResult {
  if (!isEventStatus(from) || !isEventStatus(to)) {
    return {
      allowed: false,
      from,
      to,
      reason: 'unknown_status',
    };
  }

  if (from === to || ALLOWED_TRANSITIONS[from].includes(to)) {
    return { allowed: true, from, to };
  }

  return { allowed: false, from, to, reason: 'illegal_transition' };
}
