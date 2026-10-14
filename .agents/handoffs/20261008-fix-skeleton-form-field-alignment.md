# Keep side-by-side form fields level (skeleton fix)

Goal: fix the shared form layout bug Aaron reported on 8 October 2026, and
stop it recurring. In a two-column `FormSection`, a field whose neighbour had a
hint was stretched to the row's height, and its control slid down out of line
(seen on E07-S03 Equipment availability: End sat below Start). Owner:
Amareet (skeleton owner).

## Done

- `frontend/src/styles.css`: `.field-control` gets `align-content: start`
  (Aaron's fix).
- `frontend/src/app/UiKit.tsx`: the `/ui-kit` form pairs a hinted field
  (Expected attendance) with a plain one (Layout), so the case is visible.
- `tests/e2e/layout-and-focus.spec.ts`: a test that the two controls are
  level. It fails without the fix (a gap of about 12 px). It re-measures until
  styles and fonts settle, after one full-suite run measured before the CSS
  loaded.
- `design.md` (FormField): the rule. `docs/frontend-guide.md`: a pre-PR check,
  plus a "Changing the shared blocks or styles" checklist (UI-kit sample, a
  layout test that fails without the fix, both widths, `design.md`), and
  "report shared bugs, don't patch them locally".

## Next

- None for this fix. If another shared layout bug turns up, follow the new
  checklist in `docs/frontend-guide.md`.
