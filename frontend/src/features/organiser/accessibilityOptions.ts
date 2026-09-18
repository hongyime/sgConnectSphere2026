// Placeholder predefined accessibility requirements list (E02-S03).
// No backend enum exists for this yet — `accessibility_features` in the
// venue catalogue is a free-text lookup table populated by venue staff,
// not a fixed list for event requests. Replace this list once the backend
// defines a canonical source of truth.
export const ACCESSIBILITY_OPTIONS = [
  'Wheelchair access',
  'Hearing loop',
  'Quiet room',
  'Accessible parking',
  'Sign language interpreter',
] as const;
