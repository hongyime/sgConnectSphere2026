# Fix refused-edit focus assertion flake in frontend navigation test

Resolve test flakiness in RefusedEdit.navigation.test.tsx by replacing the synchronous expect(...).toHaveFocus() assertion with an asynchronous waitFor assertion targeting the alert container.

## Context

In `frontend/src/features/events/RefusedEdit.navigation.test.tsx`, `TC_E10S01_03` synchronously asserted `expect(screen.getByRole('alert').parentElement).toHaveFocus()`. Under load or tight scheduling, focus shift triggered by `EventEditForm`'s `useEffect` may not resolve immediately when the recovery link is rendered and discovered. Wrapping the assertion in `await waitFor(() => ...)` provides a web-first wait that eliminates the race condition while keeping behavioural assertions intact.

Note: In `EventEditForm.tsx`, focus is shifted to the alert container (`div.event-edit-alert`, which holds `tabIndex={-1}` and `ref={alertRef}`). The `Alert` component itself renders an inner `<div role="alert">` without `tabIndex`. Therefore, `screen.getByRole('alert').parentElement` correctly identifies the focused element.

## Verification

- Ran `src/features/events/RefusedEdit.navigation.test.tsx` 20 consecutive times in a loop; all 20 iterations passed (7/7 tests each).
- Ran full frontend test suite (`npm test --workspace frontend`); 671/671 tests passed across 65 files.
- Ran frontend typecheck (`npm run typecheck --workspace frontend`); passed cleanly with zero errors.
- Ran frontend build (`npm run build --workspace frontend`); passed cleanly.
- Validated repository hygiene (`python scripts/check.py`).
- Recorded test evidence in `docs/testing/runs/20261029-124304-bryanseah234-frontend-vitest.md`.
