import type { EventStatus } from "./status.js";

// T-26 / T-48: the event's own range is authoritative, not a legacy Session.
// Equality is intentional: TC_E08S05_06 completes at the exact end instant.
export function completionEligibility(
  status: EventStatus,
  startsAt: Date,
  endsAt: Date,
  now: Date,
) {
  const valid =
    [startsAt, endsAt, now].every((value) =>
      Number.isFinite(value.getTime()),
    ) && endsAt.getTime() > startsAt.getTime();
  return {
    manual:
      valid && status === "confirmed" && startsAt.getTime() <= now.getTime(),
    automatic:
      valid && status === "confirmed" && endsAt.getTime() <= now.getTime(),
  };
}
