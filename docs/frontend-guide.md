# Building your story's frontend

Since ADR-017, each story's owner builds its screens as well as its backend.
This guide gets you from "my API works" to "my screen is done" using the
shared frontend skeleton. You don't need to design anything: the layout,
building blocks, states and test helpers already exist.

**See it first:** run the app (`npm run dev --workspace frontend`) and open
`/ui-kit`. It shows every building block and links to four working page
templates you can click through.

## Where things live

| What | Where |
| --- | --- |
| Every route, with its status and story | `frontend/src/app/routes.tsx` |
| Each role's home page and header links | `frontend/src/app/roles.ts` |
| Shared header and page frame (added for you) | `frontend/src/app/AppShell.tsx` |
| Building blocks, API helper, data loading | `frontend/src/shared/` (import from `'../../shared'`) |
| Page templates to copy | `frontend/src/templates/` |
| Vitest helpers (`stubApi`, `deferred`) | `frontend/src/testing/fakeApi.ts` |
| Playwright helper (`signInAs`) | `tests/e2e/helpers/fakeSession.ts` |
| Design rules | `design.md` (SCRUM-117), once written |

## Build a screen in six steps

### 1. Find your route

Open `app/routes.tsx` and find your story's ID. Most Release 1 screens already
have a route:

- `status: 'mock'` means a screen exists with sample data. You'll **turn it
  live** (see the recipe below).
- `status: 'coming-soon'` means there's a placeholder. You'll **replace it**
  with your page.
- No route yet: add one line, `page('/your/path', <YourPage />, 'live', 'E0X-S0Y')`.

### 2. Write your API module

One small file in your feature folder, built on `apiCall`. Every read takes an
`AbortSignal`; every function returns `ApiResult<T>`.

```ts
// frontend/src/features/venue/blocksApi.ts
import { apiCall, jsonRequest } from '../../shared';

export type VenueBlock = { id: string; from: string; to: string; reason: string };

export function listBlocks(venueId: string, signal?: AbortSignal) {
  return apiCall<{ blocks: VenueBlock[] }>(
    `/api/venues?id=${encodeURIComponent(venueId)}&blocks=1`, { signal }, 'Unable to load blocks.');
}

export function createBlock(venueId: string, input: { from: string; to: string; reason: string }) {
  return apiCall<{ block: VenueBlock }>('/api/venues',
    jsonRequest('POST', { action: 'block', id: venueId, ...input }), 'Unable to save the block.');
}
```

`apiCall` shows the server's `error` message when it is a sentence (the API
writes those to be safe to show). When `error` is a machine code such as
`booking_conflict`, it shows the body's `message` sentence if there is one,
and your fallback otherwise. The code arrives in `result.code`, per-field messages from
`{ errors: { from: [...] } }` in `result.fieldErrors` (pass them to each
`FormField`), and the whole error body in `result.details` (for example
`details.conflictingBookings`).

### 3. Copy the matching template

| Your screen | Template | Examples in the backlog |
| --- | --- | --- |
| A list or queue, with filters | `ListTemplate.tsx` | queues, catalogues, registrations, drafts |
| One record's page | `DetailTemplate.tsx` | an event, a booking, a reservation |
| Create or edit | `FormTemplate.tsx` | request, venue, equipment, block, change request |
| Approve, reject, confirm, cancel | `DecisionTemplate.tsx` | E03-S03, E06-S04, E08-S03, E10-S04 |

Copy it into your feature folder, rename it, and follow the numbered comments
at the top: swap the sample API for yours, change the fields and wording, and
fix the links. A calendar screen can reuse `VenueCalendar.tsx`.

### 4. Build only from the shared blocks

`PageLayout`, `Card`, `FactList`, `Button`, `FormField`, `FormSection`,
`ConfirmPanel`, `StatusPill`, `Alert`, `DataTable`, `FilterChips`, and the
`LoadingState` / `EmptyState` / `ErrorState` trio. Load data with `useLoad`.

- **Don't add new colours, font sizes or page-wrapper classes.** If something's
  missing, ask in the design-language discussion rather than inventing it.
- **Don't render `AppHeader`.** The shell adds it to every signed-in route.
- **Don't hand-roll `fetch` in a `useEffect`.** `useLoad` already handles
  route changes and late responses.

### 5. Register it

- Set your route's `status` to `'live'` in `app/routes.tsx`.
- If the page belongs in a role's header, add it to `roleNavigation` in
  `app/roles.ts`. A test checks every link points at a real route.

### 6. Test it

**Vitest:** render your page and fake the API with `stubApi`.

```tsx
import { stubApi } from '../../testing/fakeApi';

test('Venue Staff see an overlap refusal naming the booking', async () => {
  stubApi({
    'GET /api/venues?blocks=1': { body: { blocks: [] } },
    // The real blocks API body: a code in `error`, the sentence in `message`.
    'POST /api/venues': { status: 409, body: {
      error: 'booking_conflict',
      message: 'This period overlaps a confirmed booking. Resolve the booking before blocking the venue.',
      conflictingBookings: [{ eventCode: 'EVT-2002', title: 'Annual Tech Summit', startsAt: '2026-11-12T01:00:00.000Z' }],
    } },
  }, { role: 'venue_staff' });
  // render, fill in the form, submit…
  expect(await screen.findByRole('alert')).toHaveTextContent('overlaps a confirmed booking');
});
```

If your page loads by a **route parameter** (`:eventCode`, `:venueId`), add a
late-response test: hold the first response with `deferred()`, navigate to a
second record, release the first, and check the page still shows the second.
`frontend/src/shared/shared.test.tsx` has the pattern.

**Playwright:** sign in with `signInAs`, then fake your endpoints.

```ts
import { signInAs } from './helpers/fakeSession';

test('TC_E05S04_01 - …', async ({ page }) => {
  await signInAs(page, 'venue_staff');
  await page.route('**/api/venues**', route => route.fulfill({ json: { venues: [] } }));
  await page.goto('/venue/blockout');
  // …
});
```

Put the **TC ID in the test title** and flip the matching `test.fixme` to
`test`. Then regenerate the coverage inventory:
`.venv-tools/bin/python scripts/tc_coverage_audit.py` (on Windows:
`.venv-tools/Scripts/python.exe`).

## Recipe: turn a mock screen live

Many Sprint 3 and 4 screens already exist with sample data (`status: 'mock'`).

1. Find where it imports from `./mocks`.
2. Write the API module (step 2) and load with `useLoad` instead of the mock.
3. Swap hand-made markup for shared blocks as you go; the template matching
   your screen shows the structure.
4. Add the states: loading, empty, and `ErrorState`.
5. Set the route to `'live'`, write the tests, remove the now-unused mock data.

## Before you open the PR

- [ ] Every acceptance criterion in your story is covered; polish never replaces one.
- [ ] Loading, empty and error states are all shown (check `/ui-kit` for how they look).
- [ ] Screenshots at desktop and phone width (Pixel 7) look right: no clipped tables or overflowing text.
- [ ] Keyboard works: every action is reachable with Tab, and the focus outline is visible.
- [ ] Route status is `'live'`; any new header link is in `roles.ts`.
- [ ] Vitest and Playwright pass; TC IDs are in test titles; `tc-coverage.md` is regenerated.
- [ ] No new colours, font sizes or page wrappers outside `frontend/src/shared/`.

The repository-wide PR rules (title format, Jira key, verification section,
postplan) are in `CONTRIBUTING.md` and `AGENTS.md`.
