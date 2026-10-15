// Shared booking occupancy and hold presentation helpers; no workflow imports.
export const EXPIRED = "This hold has expired, so it can't be changed. Place a new hold if the venue is still needed.";

// SQL for "this booking holds the venue": pending or confirmed, or a hold
// that hasn't expired. `now` is the SQL for the current time. 'tentative' is
// compared as text so the check also runs in the transaction that added the
// value (PostgreSQL refuses a new enum value there).
export const holdsVenue = (alias: string, now: string) =>
  `(${alias}.status IN ('pending', 'confirmed') OR (${alias}.status::text = 'tentative' AND ${alias}.expires_at > ${now}))`;

const SGT = new Intl.DateTimeFormat('en-SG', {
  timeZone: 'Asia/Singapore', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
});
export const formatSgt = (value: Date) => SGT.format(value);
