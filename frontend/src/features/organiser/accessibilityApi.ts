// E02-S03: the organiser request form's predefined accessibility checklist,
// sourced from the live accessibility_features vocabulary venue records
// also draw from (BDR T-13) - not a hardcoded list. Every request sends the
// session cookie (credentials: 'same-origin'), matching ADR-015.

export type AccessibilityFeature = { id: string; code: string; label: string };

export type ListAccessibilityFeaturesResult =
  | { ok: true; features: AccessibilityFeature[] }
  | { ok: false; message: string };

export async function listAccessibilityFeatures(): Promise<ListAccessibilityFeaturesResult> {
  let response: Response;
  try {
    response = await fetch('/api/venues?accessibilityFeatures=1', { credentials: 'same-origin' });
  } catch {
    return { ok: false, message: 'Accessibility requirements could not be loaded.' };
  }
  if (!response.ok) {
    return { ok: false, message: 'Accessibility requirements could not be loaded.' };
  }
  const body = await response.json().catch(() => null);
  return { ok: true, features: Array.isArray(body?.features) ? body.features : [] };
}
