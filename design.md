# ConnectSphere design language

- **Status:** Accepted for Release 1; amend by pull request (see "Changing this document")
- **Owner:** Bryan (SCRUM-117)
- **Implemented by:** the shared frontend skeleton (SCRUM-116, Amareet), per ADR-017
- **Applies to:** every screen in `frontend/`, built by the story's owner

This document is the rulebook for how ConnectSphere looks, reads and behaves.
Since ADR-017 every story owner builds their own screens, so this is how six
developers produce one product. It names the colours, type, spacing, corner
radius, building blocks, states, wording and accessibility rules the skeleton
in `frontend/src/shared/` implements. Where this document and the skeleton
disagree, the difference is raised in "Differences raised with the skeleton"
and resolved in review, never chosen silently.

The skeleton's how-to (routes, templates, API modules, tests) lives in
`docs/frontend-guide.md`. This document is the *why* and the *what it must
look like*; that one is the *how*.

---

## 1. How to use this document

- **Building a new screen?** Read sections 2, 4 and 5, copy the matching
  template, and compose it from the building blocks. You should not need to
  write CSS.
- **Writing copy?** Section 8.
- **Reviewing a frontend PR?** Section 13 is the checklist.
- **Touching an existing page?** Section 12 lists what to fix while you are
  there.
- **Something missing?** Section 14. Do not invent a colour, size or wrapper.

The one rule that covers most cases: **story owners compose; the skeleton
styles.** If you find yourself writing a hex code, a `font-size`, a
`border-radius` or a `.my-feature-page` wrapper, stop and use a block instead.

---

## 2. What ConnectSphere looks like

ConnectSphere is an operations tool for people who plan events and book venues.
Its visual idea is **paper on a planning grid**: white record cards laid on a
warm, faintly ruled surface, written in one dark ink, annotated with one teal
pen, and stamped with coloured status pills. It should feel like a tidy desk,
not a dashboard.

Three choices carry that idea, and they are the signature of the product.

### The planning grid

The page background is warm paper (`--page`, `#f7f7f5`) ruled with a faint
32px teal grid (`frontend/src/styles.css`, `body` background). It is the one
decorative element in the whole product and it belongs to the shell, not to
pages. Cards sit on it; nothing covers it. Rule: **never give a page, section
or feature wrapper its own full-bleed background.** If the grid is not
visible around your cards, something is wrong.

### One pen

Teal (`--teal`, `#0e7c7b`) is the only brand colour and it means *you can act
here*: primary buttons, links, the active navigation item, the focus ring, the
tinted hover on rows. Every other colour is a status colour and may only mean
a status. Rule: **teal is for actions and attention; it is never decoration.**

### Eyebrow, heading, pill

Every page opens the same way: a small uppercase eyebrow saying where you are
(a role, an event code, a section), a single bold `h1`, and, on a record page,
a status pill at the right. Statuses everywhere are the same object: a fully
rounded pill with a soft tint and deep ink in the same hue. Rule: **a status
is always a pill; a pill is always a status.**

Quiet everywhere else. Cards sit flat with a hairline border and no shadow,
headings are heavy but few, and motion is limited to 120ms colour changes and
the loading shimmer. The product earns trust by being predictable.

---

## 3. Tokens

The canonical token source is the `:root` block of `frontend/src/styles.css`.
Story owners use tokens only through the building blocks; the values are
documented here so reviewers can check a screen against them and so the
skeleton owner has a single reference.

### 3.1 Colour

Neutrals.

| Token | Value | Use |
| --- | --- | --- |
| `--page` | `#f7f7f5` | Page background, under the planning grid |
| `--surface` | `#ffffff` | Cards, panels, table bodies |
| `--surface-strong` | `#f0f3ef` | Table headers, skeleton bars, "unavailable" tints |
| `--ink` | `#0f0f0f` | Body text and headings |
| `--muted` | `#5c5c5c` | Secondary text, labels, hints, timestamps |
| `--soft` | `#9b9b9b` | Disabled control background; placeholder text |
| `--border` | `#e5e5e5` | Every 1px border and divider |

Brand.

| Token | Value | Use |
| --- | --- | --- |
| `--teal` | `#0e7c7b` | Primary buttons, links, active nav, focus ring |
| `--teal-hover` | `#14a3a1` | Hover on teal fills (see 11.1 about text contrast) |
| `--teal-dark` | `#0a5958` | Pressed state; eyebrow text; text on `--teal-soft` |
| `--teal-soft` | `#e4f3f1` | Active navigation and selected chip background |

Status hues. Each comes as a pair: a `-soft` tint for the background and the
base value for text and borders. Pills, alerts, calendar entries and badges
use these pairs and nothing else.

| Hue | Text / border | Tint | Means |
| --- | --- | --- | --- |
| Blue | `--blue` `#2b6cb0` | `--blue-soft` `#e7f0fb` | In progress: submitted, under review, planning; a confirmed booking on the calendar; informational alerts |
| Green | `--green` `#1f9254` | `--green-soft` `#e7f4ed` | Done or available: approved, confirmed, completed, free |
| Amber | `--amber` `#d9a017` for marks only; `#8a6200` for text | `--amber-soft` `#fff4d3` | Needs someone: awaiting clarification, tentative, warnings |
| Red | `--red` `#c0392b` | `--red-soft` `#fbecea` | Stopped or refused: rejected, cancelled, blocked, errors, danger buttons |
| Slate | `--slate` `#4d5a64` | `--slate-soft` `#e9eef1` | Not yet real: draft, neutral |
| Violet | `--violet` `#6f56a6` | `--violet-soft` `#f0eafa` | Scheduled for later (`status-future`) |
| Clay | `--clay` `#9f5c35` | `--clay-soft` `#f6ece6` | Accent for role-hero metrics only; never a status |

Rules.

- Text on a tint uses the deep value of the same hue. Amber text is
  `#8a6200`, not `--amber`: `--amber` on `--amber-soft` is 2.1:1 and
  unreadable. See 11.2 for the proposed `--amber-ink` token.
- Text on `--teal-soft` is `--teal-dark` (7.1:1), not `--teal` (4.4:1).
- Colour never carries a meaning alone. Every pill has a label; every calendar
  state has a text label beside its colour; every alert has an icon and
  words.
- No other colour values. The Tailwind-derived reds, greens, blues and ambers
  in older feature stylesheets (`#b91c1c`, `#047857`, `#1d4ed8`, `#b45309`
  and friends) are listed in section 12 for removal.

Measured contrast of the pairs above (WCAG 2.2 formula, rounded):

| Pair | Ratio | Verdict |
| --- | --- | --- |
| `--ink` on `--surface` | 19.2 | AAA |
| `--muted` on `--surface` | 6.7 | AA |
| `--teal` on `--surface` | 5.0 | AA for text, links and the focus ring |
| White on `--teal` | 5.0 | AA for primary button text |
| White on `--teal-hover` | 3.1 | Fails AA for button text; raised in 11.1 |
| `--blue` on `--blue-soft` | 4.7 | AA |
| `--green` on `--green-soft` | 3.5 | Fails AA for 12px pill text; raised in 11.1 |
| `#8a6200` on `--amber-soft` | 5.0 | AA |
| `--red` on `--red-soft` | 4.7 | AA |
| `--slate` on `--slate-soft` | 6.1 | AA |
| `--violet` on `--violet-soft` | 5.0 | AA |
| `--soft` on `--surface` | 2.8 | Acceptable for disabled controls only |

### 3.2 Type

One family. The stack is `Inter, ui-sans-serif, system-ui, -apple-system,
BlinkMacSystemFont, "Segoe UI", sans-serif`. Inter is the intended face but
is not currently loaded by `frontend/index.html`, so users see their system
font today; see 11.1. Whatever resolves, all text uses the one family, and
`font-synthesis: none` keeps weights honest.

Scale. Five sizes, used by the blocks:

| Token | Value | Used for |
| --- | --- | --- |
| `--text-2xl` | `1.75rem` | The page `h1` (`.page-heading h1`) and dashboard metric numbers |
| `--text-xl` | `1.4rem` | Reserved; currently unused (see 11.2) |
| `--text-lg` | `1.1rem` | Card titles (`h2`), lede paragraphs |
| `--text-base` | `0.95rem` | Body text, table cells, inputs, buttons |
| `--text-sm` | `0.85rem` | Secondary text, timestamps, hints, table headers |
| 12px fixed | `12px` | Eyebrow, status pill, field hint, count badges |

Weights. Four tokens: `--weight-normal` 400, `--weight-medium` 600,
`--weight-semibold` 700, `--weight-strong` 800. The eyebrow and status pill
use 900. Headings are 800; labels and buttons are 700 to 800; body is 400.
Note the token names run one step heavier than their values (`medium` is
600); see 11.2.

Rules.

- Headings: one `h1` per page, from `PageLayout`. Card titles are `h2`. Do not
  skip levels; do not style a `p` to look like a heading.
- Line height is unitless: 1.2 for the `h1`, 1.5 for body copy, 1.55 for
  state copy.
- Uppercase is for the eyebrow only, with `letter-spacing: 0.08em`. No other
  element is uppercased.
- Story owners never set `font-size`, `font-weight` or `font-family`. The
  block carries them.

### 3.3 Spacing

A 4px scale, `--space-1` to `--space-7`: 4, 8, 12, 16, 24, 32, 48px.

| Where | Token |
| --- | --- |
| Between page sections (cards) | `--space-5` |
| Page padding, desktop | `--space-6` top, `--space-5` sides, `--space-7` bottom |
| Inside a card | `--space-5` padding, `--space-4` gap |
| Inside a form section | `--space-3` gap, `--space-4` above the divider |
| Label to control | `--space-2` |
| Icon to text in a button | `--space-2` |
| Inline (chips, pills) | `--space-1` to `--space-2` |

Story owners do not set padding or margin on blocks. Need a gap that no block
gives you? That is a missing block, not a reason for a `style` attribute.

### 3.4 Corner radius

Three radii, by role.

| Role | Value | On |
| --- | --- | --- |
| Card | `10px` | `.card`, table wrappers, state panels |
| Control | `8px` | Buttons, inputs, selects, textareas, filter chips, nav items |
| Pill | `999px` | Status pills, count badges, calendar badges, avatars |

Older pages also use 6px on controls and 12px on sign-in cards. Those migrate
to 8px and 10px when touched (section 12). Proposed tokens in 11.2.

### 3.5 Shadow and border

Cards sit flat on the grid with one 1px `--border` and no shadow; the
skeleton's `Card` (`.card.ui-card`) sets `box-shadow: none`. The one soft
shadow token, `--shadow` (`0 18px 60px rgba(37, 42, 40, 0.11)`), survives only
on the older role hero and prototype frames and is not used by any block.
Invalid fields use a 3px tinted ring (`rgba(192, 57, 43, 0.12)`) on a `--red`
border. Nothing else has a shadow, glow or gradient.

### 3.6 Motion

- Colour and border changes on hover: `120ms ease`.
- Loading: the `LoadingState` shimmer (`1.4s ease-in-out`) and `Button`
  busy spinner (`0.9s linear`), both disabled under
  `prefers-reduced-motion: reduce`.
- Nothing else moves. No page transitions, no slide-ins, no bouncing.

### 3.7 Breakpoint

One breakpoint: **720px**. Above it, desktop layout; at or below it, phone
layout: tables become stacked cards, two-column forms become one column, page
padding tightens. The header wraps at 760px because its content is wider. The
product is desktop-first (staff do their work at a desk) but every screen
must be usable on a Pixel 7-width phone, because organisers and attendees
check status on theirs.

---

## 4. Page anatomy and the four templates

Every signed-in route renders inside the shell: `AppShell` adds `AppHeader`
(brand, the role's navigation, notifications, profile, sign out) above the
page. Pages own their `<main>`; the shell adds nothing else. Story owners
never render `AppHeader`.

A page is:

```text
AppHeader                                  (shell; not yours)
+-- PageLayout                             (your <main>)
    +-- page heading: eyebrow / h1 / actions
    +-- Card                               (one per group of content)
    |   +-- h2 title / actions
    |   +-- FactList | DataTable | form fields | copy
    +-- Card ...
    +-- back link
```

Two widths. `PageLayout width="wide"` (68rem, the default) for lists, detail
pages and dashboards; `width="narrow"` (44rem) for forms and decisions, so
line length stays readable and the primary action is never far from the
fields.

Four templates in `frontend/src/templates/`, one per kind of screen. Copy the
one that matches, then replace the sample API and wording. Do not combine two
templates on one route; a list that also edits is two routes.

| Screen | Template | Anatomy |
| --- | --- | --- |
| A queue, list or catalogue | `ListTemplate` | heading with a primary "New …" action; `FilterChips` with counts; `DataTable`, or `EmptyState` when nothing matches; the title column links to the record |
| One record | `DetailTemplate` | eyebrow is the record's code; `StatusPill` in the heading actions; `Alert tone="success"` after a save; `Card title="Summary"` with a two-column `FactList` and Edit action; back link |
| Create or edit | `FormTemplate` | narrow; one `Card`; server error `Alert` at the top of the form; `FormSection` groups of `FormField`; `FormActions` with Cancel then the primary Save |
| Approve, reject, confirm, cancel | `DecisionTemplate` | narrow; `Card title="What you're deciding"` with the facts; `Card title="Your decision"` with the choices; a `ConfirmPanel` replaces the choices once one is picked |

Every template already includes the three states (loading, error, empty) and
the `useLoad` pattern that ignores late responses. Keep them.

---

## 5. Building blocks

All blocks are exported from `frontend/src/shared/index.ts`; import with
`import { … } from '../../shared'`. The names below are the component names;
use them exactly. See them rendered at `/ui-kit`.

### 5.1 Catalogue

| Block | Looks like | Use it for | Never |
| --- | --- | --- | --- |
| `PageLayout` | Page frame with eyebrow, `h1`, right-aligned actions | The outer element of every page | Two on one page; a page without one |
| `Card` | White surface, hairline border, flat, `h2` | One group of related content | Nesting a card in a card; a card with no heading and no `label` |
| `FactList` | Label/value pairs in 1 to 3 columns; empty values read "None recorded" | Read-only facts on a detail page | Editable fields; long prose |
| `Button` | 40px tall, 8px radius, 800 weight; `primary` teal fill, `secondary` white with border, `danger` white with red border | Actions on this page | Navigation (use `ButtonLink`); more than one `primary` per card |
| `ButtonLink` | Same as `Button`, renders a router link | Going somewhere: New, Edit, Back, View | Submitting or mutating |
| `FormField` | Label above control, hint below, error below in red | Every input, select and textarea | A bare `<input>`; a placeholder as the label |
| `FormSection` | Fieldset with legend and a two-column grid | Grouping fields under a heading | A section with one field |
| `FormActions` | Right-aligned row, stacks on phones | The Cancel and Save row at the end of a form | Actions in the middle of a form |
| `ConfirmPanel` | A card-shaped form with title, description, optional reason textarea, Cancel and confirm | The second step of any irreversible action | A browser `confirm()`; a modal |
| `StatusPill` | Soft tint, deep text, fully rounded, 12px 900 uppercase | The status of a record | Counts, categories, roles, anything that is not a status |
| `Alert` | Tinted panel with icon, optional title, optional action | Save confirmations, server refusals, warnings about the record | Decoration; replacing an `EmptyState` |
| `LoadingState` | Spinner, label, grey shimmer rows | While `useLoad` is loading | Spinners inside buttons (use `busy`) |
| `EmptyState` | Centred icon, title, one sentence, optional action | A list with nothing in it | An error (use `ErrorState`) |
| `ErrorState` | Alert-styled card; 401, 403 and other variants | When `useLoad` fails | Catching validation errors |
| `DataTable` | Caption (visually hidden), header row, hairline rows; stacks into cards on phones | Any list of records | Layout; a single record |
| `FilterChips` | Pill buttons with counts; teal fill when selected | Narrowing a list by one dimension | Navigation; multi-select |

Helpers: `useLoad` loads data and ignores late responses; `apiCall` and
`jsonRequest` talk to the API; `statusLabel`, `formatDate` and
`formatDateRange` format for display. Use them rather than writing your own.

### 5.2 Rules per block

**PageLayout.** `eyebrow` names where the user is: the role's area on a
dashboard ("Coordinator workspace"), the record code on a detail page
("EVT-101"), the area on a list ("Requests"). `title` is the one `h1`.
`actions` holds at most one primary action and a `StatusPill`.

**Card.** Give it a `title`, or a `label` when the heading would be redundant,
so it has an accessible name. One idea per card. A card's `actions` are small
`ButtonLink`s or secondary buttons, never a second primary.

**Button and ButtonLink.** One `primary` per visible area, placed last. Pass
`busy` and a `busyLabel` ("Saving…") for every mutating action; the block
disables itself and announces the state. Icons are optional and sit before
the text; never an icon without text. `danger` is for destructive confirms,
not for "Cancel".

**FormField.** Always a visible `label`. `hint` for format or consequence
("Use the venue's full name"); `error` for what is wrong and how to fix it.
Mark required fields in the label text, not with colour. The render-prop
gives you `id`, `aria-describedby` and `aria-invalid`; spread them onto the
control.

**ConfirmPanel.** Reached only from a button whose label ends in an ellipsis
("Reject…"). `confirmLabel` repeats the verb ("Reject request"). Pass
`reasonLabel` when the business rule needs a reason (T-39: rejections). Pass
`danger` for reject, cancel, remove, withdraw. Server refusals go in `error`.

**StatusPill.** Pass the raw status (`under_review`); the block labels it
("Under review"). The status vocabulary and its colours are in section 7.

**Alert.** `success` after a save or decision; `info` for a fact about the
record ("This request is approved, so there's nothing to decide"); `warning`
when the user should act but nothing is broken; `error` for a refused
submission. Put it where the eye is: top of the form for submission errors,
top of the page for post-save confirmations.

**LoadingState, EmptyState, ErrorState.** Required on every screen that
loads. Wording in sections 6 and 8.

**DataTable.** Always a `caption`. Mark the title column `primary: true`;
it becomes the card title on phones. Four to six columns; move the rest to
the detail page. Dates through `formatDate`; statuses through `StatusPill`.

**FilterChips.** Give the group a `label` ("Filter by status") and give every
option a `count`. The first option is "All".

### 5.3 No external component library

The skeleton is the component library. ADR-017 declined a third-party kit
because the blocks above cover the screen inventory and a new dependency
would add learning and migration work. Revisit only if a Release 2 need
(rich text, drag and drop, charts) cannot be met by one new block; the
proposal goes through section 14 first.

---

## 6. States

Every screen that loads data shows four states, in this order of precedence:

| State | Block | When |
| --- | --- | --- |
| Loading | `LoadingState label="Loading your requests…" rows={4}` | `result.state === 'loading'`; match `rows` to the expected list length |
| Error | `ErrorState failure={…} context="your requests" onRetry={reload}` | `result.state === 'error'`; the block handles 401 (sign in again), 403 (access refused, server message, back link) and everything else (couldn't load, try again) |
| Empty | `EmptyState title="No requests yet"` | Ready with nothing to show; distinguish "nothing exists" from "nothing matches this filter" |
| Ready | The content | Everything else |

After an action, show the outcome where the action was: `Alert
tone="success"` at the top of the page or form, and reload the record so the
pill updates. Never use a toast; nothing on ConnectSphere disappears on a
timer.

While an action runs, the button that started it is `busy`. Nothing else on
the page greys out or blocks.

---

## 7. Status vocabulary

Statuses are the product's shared nouns. Use the stored value, let
`StatusPill` label it, and never invent a synonym in the UI ("Pending" is not
a ConnectSphere status; see T-17).

| Stored value | Label | Hue |
| --- | --- | --- |
| `draft` | Draft | Slate |
| `submitted` | Submitted | Blue |
| `under_review` | Under review | Blue |
| `awaiting_clarification` | Awaiting clarification | Amber |
| `planning` | Planning | Blue |
| `approved` | Approved | Green |
| `confirmed` | Confirmed | Green |
| `completed` | Completed | Green |
| `rejected` | Rejected | Red |
| `cancelled` | Cancelled | Red |

Venue calendar states (E05-S03), shown as badges with an icon and text beside
each colour:

| State | Label | Hue |
| --- | --- | --- |
| `free` | Free | Green |
| `tentative` | Tentative (T-17) | Amber |
| `confirmed` | Confirmed | Blue |
| `blocked` | Blocked (maintenance) | Red, hatched |
| `unavailable` | Unavailable | `--surface-strong` with `--muted` text |

Generic tones (`success`, `info`, `warning`, `danger`, `neutral`, `future`)
exist for things that are not records (a reassignment request pending, a
scheduled job). Prefer the record vocabulary whenever the thing is a record.

---

## 8. Writing

Words are design material. They exist to make the screen easier to use.

### 8.1 Voice

- Sentence case everywhere: headings, buttons, labels, pills, tabs. The only
  uppercase is the eyebrow, which CSS applies.
- Plain verbs, present tense, second person. "You can edit this until the
  Coordinator starts their review", not "Editing is permitted prior to
  review commencement".
- Name things by what the user controls: an event, a request, a booking, a
  venue, a block. Not a record, an entity, a payload or an ID.
- Singapore English spelling: organiser, cancelled, centre. Dates and times
  through `formatDate`: `12 Nov 2026`, `12 Nov 2026, 9:00 am`, ranges with an
  en dash, `9:00 am – 5:00 pm`. Missing dates read "Not recorded"; empty
  facts read "None recorded".
- No exclamation marks, no "Oops", no "Please" at the start of a sentence,
  no "successfully".

### 8.2 Buttons

A button says exactly what happens.

| Kind | Pattern | Examples |
| --- | --- | --- |
| Primary save | verb + object | Save request, Save changes, Create account |
| Create | "New" + object | New request, New venue |
| Two-step action | verb + object + "…" | Approve…, Reject…, Cancel this event… |
| Confirm (in `ConfirmPanel`) | the same verb + object, no ellipsis | Approve request, Reject request |
| Busy | present participle + "…" | Saving…, Signing out…, Sending… |
| Navigation | "Back to" + place; "View" + object; "Edit" | Back to requests, View event, Edit details |
| Retry | | Try again |
| Abandon | | Cancel (and only for abandoning a form) |

The verb stays the same through the flow: a "Publish" button produces a
"Published" alert, not "Your changes were successfully saved".

### 8.3 Headings and eyebrows

- `h1`: a noun phrase for a list or dashboard ("Requests", "Workload
  dashboard"); the record's title on a detail page; "Edit …" or "New …" on
  a form; "Decide: …" on a decision.
- Eyebrow: where you are, two or three words, no punctuation except the
  middle dot in "Coming soon · E09-S04".
- Card `h2`: a noun phrase. "Summary", "Request details", "Your decision".

### 8.4 Empty states

Title: what is absent, as a fact. Body: one sentence on what will make
something appear, or what to do.

- "No requests yet" / "Requests you create appear here."
- "No events in Awaiting clarification" / "Choose another filter to see the
  rest of your assigned events."
- "Nothing waiting for you" / "When a colleague asks you to take over one of
  their events, it appears here."

An empty state is an invitation, not an apology.

### 8.5 Errors

Say what went wrong and what to do, in the interface's voice.

- Validation summary: "Fix the highlighted fields, then save again."
- Field: "Enter the event name." / "Reason is required." / "Enter a whole
  number greater than 0."
- Server refusal: the API's `error` message verbatim; the API writes them to
  be shown ("This period overlaps a confirmed booking.").
- Load failure: "Couldn't load your requests." then "Try again".
- Expired session: "Your session has ended. Sign in again to see your
  requests."
- Network: "Check your connection and try again."

Errors do not blame ("You entered an invalid date") and do not shrug
("Something went wrong") unless nothing more specific is known.

---

## 9. Accessibility

These are rules, not aspirations. The blocks do most of it; the owner must
not undo it.

- **Focus is visible.** The global ring is `3px solid var(--teal)`,
  `outline-offset: 2px`. Never remove it, thin it or recolour it.
- **Everything works by keyboard.** Every action is a `<button>`, `<a>` or
  router link; never a `div` with `onClick`. Tab order follows reading
  order. `Button` defaults to `type="button"` so Enter submits only the
  real submit.
- **Colour never carries meaning alone.** Pills have labels; calendar
  badges have an icon and text; alerts have an icon and words; errors have
  text as well as a red border.
- **Every control has a label.** `FormField` wires `label`, `hint` and
  `error` with `aria-describedby` and `aria-invalid`. Placeholders are not
  labels.
- **Announce outcomes.** `Alert` uses `role="alert"` for error and warning,
  `role="status"` for success and info. `LoadingState` is `aria-busy` with a
  `role="status"` label. Post-action confirmations sit in a `role="status"`
  region. `ErrorState` is `role="alert"`.
- **Name regions.** Every `DataTable` has a `caption`; every `Card` has a
  `title` or `label`; every `FilterChips` group has a `label`; decorative
  icons are `aria-hidden="true"`.
- **Respect preferences.** Shimmer and spinner stop under
  `prefers-reduced-motion: reduce`. Text may be zoomed to 200% without loss.
- **Contrast.** Text meets 4.5:1; the pairs in 3.1 are the only ones allowed.
  Two known failures (green pill text, hover on primary buttons) are raised
  in 11.1 for the skeleton to fix; do not work around them locally.
- **Target size.** Buttons are at least 40px tall; chips and icon buttons at
  least 32px with 8px between them.

Missing today and proposed in 11.2: a skip link to `<main>`.

---

## 10. Responsive rules

- Design at 1280px and 393px (Pixel 7). Screenshots of both go in the PR.
- At or below 720px: `DataTable` stacks each row into a card, using the
  `primary` column as the card title and `data-label` for the rest;
  `FormSection` collapses to one column; `FormActions` stacks full-width;
  `PageLayout` padding tightens to `--space-4`.
- No horizontal scrolling at 320px. If a table cannot stack sensibly, it has
  too many columns.
- Touch targets as in section 9. Hover states are never the only way to
  reach something.

---

## 11. Differences raised with the skeleton

ADR-017 says that where this document and the skeleton disagree, the
difference is raised, not chosen silently. This section is that list. Each
item is a proposal to the skeleton owner (SCRUM-116) and is resolved by
either changing the skeleton or amending this document; nothing here
authorises a story owner to work around the skeleton locally.

### 11.1 Rules the skeleton does not yet meet

| Topic | What the skeleton does | What this document asks | Proposed resolution |
| --- | --- | --- | --- |
| Typeface | `Inter` leads the font stack but is not loaded by `frontend/index.html`; users see their system font | One intended family that every user actually sees | Decide: self-host Inter (variable font, `font-display: swap`; a small dependency such as `@fontsource-variable/inter` needs the team's dependency decision) or drop `Inter` from the stack and accept the system face. Recommendation: self-host; the Figma plan and the brand chose Inter |
| Primary button hover | `.primary-action:hover` lightens to `--teal-hover`, white text at 3.1:1 | Button text at 4.5:1 in every state | Hover darkens to `--teal-dark` instead; keep `--teal-hover` for non-text uses such as the row hover tint |
| Green pill text | `--green` `#1f9254` on `--green-soft` is 3.5:1 at 12px | 4.5:1 | Add `--green-ink` (around `#166f40`, 5.5:1 on the tint) for pill and badge text, mirroring the amber pattern |
| Eyebrow tracking | `.eyebrow` in `styles.css` sets `letter-spacing: 0`; the eight feature copies use `0.08em` | `0.08em`, the value the team has been using everywhere | Set it on the canonical class and delete the copies |
| Disabled controls | Four treatments: `--soft` fill, `opacity: .7`, `opacity: .6`, `opacity: .55` | One: `--soft` fill with `cursor: not-allowed`, as `.primary-action:disabled` does | Make `Button` the only disabled treatment |
| Table header | Shared `.ui-table th` uses `--surface-strong`; feature tables use `rgba(15, 23, 42, 0.03)` | `--surface-strong` | Already correct in the skeleton; feature tables migrate (section 12) |
| Skip link | None | A "Skip to content" link as the first focusable element, visible on focus | Add to `AppShell` |
| Focus ring | Global 3px ring; `login.css`, `venue.css` use 2px; `eventEdit.css` removes it on two elements | 3px everywhere | Remove the overrides as pages are touched |

### 11.2 Token additions proposed

| Token | Value | Why |
| --- | --- | --- |
| `--amber-ink` | `#8a6200` | Already used in six places as a literal; the only readable amber text |
| `--green-ink` | around `#166f40` | See 11.1 |
| `--radius-card`, `--radius-control`, `--radius-pill` | `10px`, `8px`, `999px` | Six raw radii in the code today; three roles in this document |
| `--duration-fast` | `120ms` | Hover timing is written four ways (`120ms`, `0.15s`) |
| `--text-xl` | keep or remove | Defined, never used. Either the `h2` of a dashboard section adopts it or it goes |
| Weight token names | rename or document | `--weight-medium` is 600 and `--weight-semibold` is 700, one step heavier than the names suggest. Renaming (`--weight-semibold` 600, `--weight-bold` 700, `--weight-heavy` 800) is cleaner; documenting is cheaper. This document describes the values, so either works |

### 11.3 What the skeleton owns and owners must not override

The planning grid, the shell and header, the focus ring, the shape and
typography of pills and eyebrows, the flat card border, the breakpoint,
the loading shimmer, and every token value. If one of these is wrong for your
screen, it is wrong for every screen; raise it here.

---

## 12. Existing pages: what to fix when you touch them

ADR-017 chose no big-bang restyle. Pages move onto the skeleton when their
owner next changes them, and that change clears the items below for the
files it touches. The full catalogue is in the SCRUM-117 inventory; this is
the shape of it.

| Drift | Where it lives today | Replace with |
| --- | --- | --- |
| Feature page wrappers (`.organiser-page`, `.venue-page`, `.coordinator-page`, `.admin-page`, `.support-page`, `.operations-page`, `.attendee-registration-page`, and their `-heading` and `-metrics` copies) | one per feature stylesheet | `PageLayout`, `Card` |
| Local copies of `.eyebrow`, `.status-pill`, `.primary-action`, `.visually-hidden`, `.field-error`, the shimmer and spinner | `coordinator.css`, `venue.css`, `organiser.css`, `operations.css` and others | The shared block; delete the copy |
| Tailwind-derived status colours: `#b91c1c`, `#047857`, `#1d4ed8`, `#b45309`, `#92400e`, `#334155`, `rgba(220, 38, 38, …)`, `rgba(5, 150, 105, …)`, `rgba(37, 99, 235, …)`, `rgba(217, 119, 6, …)`, `#fef2f2`, `#fecaca`, `#b8860b` | `login.css`, `verify.css`, `venue.css`, `support.css`, `coordinator.css`, `organiser.css`, `attendee-registration.css` | The status pairs in 3.1 |
| Off-palette teals: `rgba(15, 118, 110, …)`, `#14624e`, and the whole `.client-events` block | `organiser.css`, `admin.css`, `coordinator.css`, `styles.css` (bottom) | `--teal` tints; migrate `.client-events` to blocks |
| Raw font sizes (`0.78rem` to `1.75rem`, about twenty values) and raw weights (500, 600, 700, 800) | every feature stylesheet | Nothing: the block carries the size |
| Raw radii `6px` and `12px` | feature controls; sign-in, verify and permission-denied cards | `8px` controls, `10px` cards |
| Hard-coded page padding `2rem 1.5rem 3rem` and `gap: 1.5rem` | every feature page wrapper | `PageLayout` |
| Thinner or removed focus rings; `:focus` instead of `:focus-visible` | `login.css`, `venue.css`, `operations.css`, `eventEdit.css` | Delete the override |
| Local `Intl.DateTimeFormat` with 24-hour time | `Organiser.tsx` | `formatDate`, `formatDateRange` |
| Fallback borders `var(--border, #cbd5e1)` | `venue.css` | `var(--border)` |

Rule of thumb for review: a feature stylesheet should shrink every time its
page is touched, and should contain no hex code, `font-size`, `font-weight`
or `border-radius` when the migration is done.

---

## 13. Review

Consistency now depends on review. Until the team names a standing design
reviewer, the skeleton owner (Amareet) reviews frontend PRs from other
owners against this document, and any teammate may apply the checklist.

A frontend PR is ready when the reviewer can tick all of these:

- [ ] The page is a `PageLayout` with one `h1` and an eyebrow; no feature
      wrapper, no page background.
- [ ] Every visible element is a shared block or plain text inside one.
- [ ] No hex code, `font-size`, `font-weight`, `border-radius`, `padding`,
      `margin` or `style` attribute was added outside `frontend/src/shared/`.
- [ ] Loading, empty and error states are present and worded per section 8.
- [ ] Statuses are `StatusPill`s with values from section 7.
- [ ] Every mutating button has `busy` and a `busyLabel`; irreversible
      actions go through `ConfirmPanel` from a button ending in "…".
- [ ] Buttons, headings, labels and empty states follow section 8; sentence
      case throughout.
- [ ] Tab reaches every action; the focus ring is visible; icons are
      `aria-hidden`; tables have captions.
- [ ] Screenshots at 1280px and 393px show no clipping or horizontal scroll.
- [ ] If the PR touched an existing page, section 12 items in the touched
      files are cleared.
- [ ] Anything the blocks could not do is raised under section 14, not
      hacked locally.

The story's acceptance criteria always win over polish; a screen that meets
this checklist but misses an acceptance criterion is not done.

---

## 14. Changing this document

- **A missing block or token.** Open an issue or a PR against this file
  describing the screen, what the existing blocks cannot do, and the
  proposed block or token. The skeleton owner implements it in
  `frontend/src/shared/`; the PR that adds it also amends this document.
  Until then, the screen ships with the nearest existing block.
- **A rule that is wrong.** Same route: PR against this file with the
  reasoning. Changes to tokens, the status vocabulary or the accessibility
  rules get an ADR or a BDR entry when they change behaviour users can see.
- **Resolving section 11.** Each item closes with either a skeleton PR or an
  amendment here, and the row is removed.
- **Style.** This file follows the repository's Markdown conventions in
  `docs/contributing/README.md`: sentence-case headings, dash bullets,
  plain-text references to `ADR-017`, `T-39`, `SCRUM-117`.

Related: ADR-007 (one single-page application for all roles), ADR-017 (story
owners build on a shared skeleton), T-17 (calendar state wording), T-39
(rejection reason mandatory), `docs/design/figma-wireframe-refinement-plan.md`
(the Figma palette this language grew from).
