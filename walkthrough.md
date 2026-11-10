# ConnectSphere Assessment Q&A Preparation & Proof Router Walkthrough

This document is the offline reference and verification walkthrough for the **ConnectSphere Exam Cockpit & Master Postplan Web App** (`artifacts/final-qna-prep-guide.html`). It explains how to build, test, and use the guide during live assessment drills.

---

## 1. How to Answer Any Examiner Question

Always follow the **4-step answering sequence**:

> **What it does → Why we chose it → Proof → Boundary**

1. **What it does** — Business outcome in plain English.
2. **Why we chose it** — Requirement or architectural risk addressed.
3. **Proof** — Exact PR, git commit, test run record (`docs/testing/runs/`), and code path.
4. **Boundary** — Honest limitation or edge case; never bluff or improvise.

### 5-Sentence Rehearsable Answer Pattern

Teach every team member this standard response structure:

> 1. “This feature lets **[role]** do **[business outcome]**.”
> 2. “We chose it because **[requirement/risk]**.”
> 3. “The key trade-off was **[alternative rejected]**.”
> 4. “We prove it with **[PR/run/code path]**.”
> 5. “Its current boundary is **[honest limitation]**.”

### First 10 Seconds Protocol
Say this formula immediately:
> "This is [story ID / feature name]. I will show the live behaviour first, then its Jira acceptance criteria, the exact PR and commit, CI, the named EP/BVA test and execution record, and the matching slide."

### Top 3 Critical Examiner Traps & System Realities
1. **Double-Booking Concurrency (Rule B)**:
   - Story: **E06-S06 / SCRUM-50** (NOT E06-S03 which is request creation). PR #378 / commit `3ac65827`, test `backend/tests/venueBooking.concurrency.test.ts`, Slide 5. PostgreSQL exclusion constraint enforces first accepted claim wins; losing concurrent request returns 409 Conflict with buffered window.
2. **Operational Safety Review Decision**:
   - Split: **E08-S03** is Coordinator submitting readiness (PR #283 / `c44c6afd`). Safety Officer decision is **E08-S06** (PR #392 / commit `44d08267`) at `/safety/queue` → `/safety/review/:eventId`. All 7 factors need a choice and comment; approval goes directly to Confirmed (T-107).
3. **Defect Audit Boundary (defects.md vs SCRUM-261 HEAD)**:
   - `docs/testing/defects.md` was frozen at the 6 Nov morning audit boundary per team convention. The remediation was merged later that day under technical enabler SCRUM-261 (PRs #450, #453, #454). We declare this boundary with total transparency: D-01..D-03 are merged on main; D-04 remains intentionally open.

### Mechanical Role Routes & Traps
- **Organiser (`jining`)**: Login → Events → New request → `/organiser/new-request`. *Trap*: `/events/new` is NOT a route. Submit requires future start, end after start.
- **Coordinator (`amareet`)**: Login → Review queue (`/coordinator/queue`) → select event → Venue search / bookings / Readiness. *Trap*: `/events` is organiser event list. Venue booking work is event-scoped (`/coordinator/events/:eventCode/venues`), not `/venues/search`. Do not hunt for "Under Review tab".
- **Venue Staff (`aaron`)**: Login → Inventory → Maintenance blocks → `/venue/blockout`. *Trap*: A block overlapping another unavailability is refused. A block over an existing booking flags that booking `Conflicting` (E05-S06).
- **Technical Support (`lexin`)**: Login → Technician staffing (`/support/technicians`) → open support request → select colleague → confirm. *Trap*: `/support` is a mock dashboard. An overlapping colleague shows a warning; demonstrate refusal after confirmation flow.
- **Safety Officer (`bryan`)**: Login → Safety review queue (`/safety/queue`) → choose event (`/safety/review/:eventId`). *Trap*: `/safety` is NOT a route. All 7 factors need a choice and comment.
- **Attendee (`xy`)**: Login → Discover (`/attendee/discover`) → choose confirmed event → Register (`/attendee/register/:eventCode`) or waitlist. *Trap*: `/catalog` is NOT a route. Closed or unconfirmed registration cannot proceed.

#### Precision Example: Venue Block over Confirmed Bookings
Do **not** say it “prevents blocks over confirmed bookings.” State precisely:
> “A venue block can be created over confirmed bookings without being blocked: the block saves, overlapping bookings become Conflicting, and the confirmed event returns to Planning for resolution (C-119, T-80, T-81).”

#### Precision Example: Change Request Obsolete Transition
Do **not** say change requests become Obsolete through a database “system trigger.” State precisely:
> “When an event completes or is cancelled, the lifecycle service atomically marks its pending change requests Obsolete in the same transaction (Migration 0022_change_request_obsolete.sql adds the enum; application code executes the update).”

---

## 2. Assessment Status Legend

- **✅ Done**: Code, tests, and evidence linked (60 stories). All have verified execution records in `docs/testing/runs/` and verified source paths at HEAD.
- **⚠️ Partial**: Implemented but evidence/gate incomplete (1 story: E06-S07, hold expiry configuration).
- **🚨 Open defect**: Not counted as Done (4 defects: D-01 to D-04). Tracked honestly with automated failing tests (`test.fail` / `todo`) in `docs/testing/defects.md`.
- **📌 Historical decision**: Context, not proof of delivery (108 team decisions T-01..T-108, 136 clarifications C-01..C-136).

> **Admit honestly · do not count as Done**: Open defects are disclosed openly and proudly as evidence of strict DoD compliance.

---

## 3. Case Count Reconciliation

To prevent assessor confusion between reported totals:
- **391 functional story cases + 3 cross-cutting DoD/performance cases = 394 workbook cases**.
- Both numbers are true: 391 belong to specific story tickets, while 3 represent cross-cutting DoD/performance regression checks.

---

## 4. UI/UX Architecture: Hamburger Side Drawer & 7 Focused Views

The modernized application replaces the previous continuous vertical scroll with a **responsive application layout**:
- **Desktop ($\ge 1024$px)**: Persistent left sidebar navigation (`#app-sidebar`) with active view indicator, visual pill counters, and instant view switching.
- **Mobile / Tablet ($< 1024$px)**: Off-canvas drawer sliding from the left, toggled via the hamburger button `☰` (`#drawer-toggle`) with backdrop dismiss (`#drawer-backdrop`).
- **Visual Coverage & Position Awareness**: The user always knows exactly which section they are viewing via the sticky topbar (`#current-view-title`) and active sidebar tab highlighting.

### 7 Specialized Defense Views:
1. 📋 **How to Answer & Protocol** (`view-how-to-answer`): 4-step answering sequence, 5-sentence rehearsable answer template, examiner wording traps, and 9 top likely answer chips.
2. 🚨 **Defects Radar & Lineage** (`view-defects-radar`): Audit vs HEAD reconciliation banner, 4 defect cards with spoken hooks, and git proof.
3. 🛡️ **12 Topic Dossiers** (`view-dossiers`): Deep architectural dossiers with category filter chips (Concurrency, Architecture, Reliability, Security, Defects, Specs) and 12 quick-jump buttons with code proofs, PR aliases, and verified test cases.
4. 📖 **65 Stories & Tech Lineage** (`view-stories`): All 65 user stories with `.story-bdr-adr-block` featuring prominent decision summaries, explicit `data-status` filtering (guaranteeing exact 60 Done / 5 Defect & Partial counts), acceptance scenarios, DoD checklists, and tech slice details.
5. 📜 **ADR & BDR Decision Vault** (`view-vault`): Authoritative decision vault containing all 19 Architecture Decision Records (ADR-001..ADR-019), 107 Team Decisions (T-01..T-108), and 136 Customer Clarifications (C-01..C-136) with deep-linking synchronization and pulse highlighting.
6. 🏗️ **Architecture & Diagrams** (`view-architecture`): 4 inline SVG figures: C4 container diagram, Event State Machine, Concurrency lock hierarchy, and Sprint velocity reconciliation.
7. ⏱️ **20-Min Exam Runbook** (`view-runbook`): Speaker allocations, time pacing checkpoints, live demonstration script, and team accountability matrix isolated cleanly in `#next-steps`.

---

## 5. Contextual Per-Section Search & Ergonomics

Instead of an awkward single top search bar, dedicated search inputs and quick chips are embedded directly in the sections where search is needed:
- **User Stories Search & Strict Status Filtering** (`#story-search-input`):
  - Instant query matching against story ID (e.g. `e5s4`, `SCRUM-43`), title, route, role, PR, or defect.
  - Quick filter chips: `All 65`, `Done (60)`, `Defects / Partial (5)`, `Lead`, `Coordinator`, `Admin`, `Student`, `Technician`.
  - Filter integrity: Story cards carry explicit `data-status="done|defect|partial"`. Clicking `Done (60)` shows exactly the 60 verified Done stories; open defects are strictly excluded from the Done count per DoD integrity rules.
  - Auto-expand matching detail drawers when searching.
  - "Expand All Details" / "Collapse All Details" toggle (`#toggle-all-drawers`).
- **12 Topic Dossiers Quick-Jump & Category Filtering**:
  - Category filter chips: `All 12 Dossiers`, `Concurrency & Locks (4)`, `Architecture & FSM (3)`, `Reliability & Outbox (1)`, `Security & Tenancy (1)`, `Defects & Limits (1)`, `Spec & AI (2)`.
  - 12 Quick-jump buttons (`#1 Monolith` to `#12 AI Governance`) that scroll smoothly to the target card and trigger a temporary highlight pulse ring.
- **ADR & BDR Decision Vault Search** (`#vault-search-input`):
  - Filters across 19 ADRs, 107 Team Decisions, and 136 Customer Clarifications simultaneously.
  - Vault type pills: `All Vault (262)`, `ADRs (19)`, `Decisions (107)`, `Clarifications (136)`.
- **Top Likely Answers Quick Chips**: Single-click filters for the 9 primary exam battlegrounds (Safety Review, Venue Loss, Booking Race, Holds, Attendee Capacity, Outbox, Scrum Velocity, AI Governance, Four Defects).
- **Keyboard Shortcut**: Press `/` or `Ctrl+K` to immediately focus the active section search input.

---

## 6. Architecture Decisions (ADR) & BDR Integration

All **19 Architecture Decision Records (ADR-001 to ADR-019)** from `docs/adr/` are fully surfaced:
- Each ADR card displays: Title, Status badge (`Accepted`, `Retired`, `Superseded`), Related BDR references with clickable links, Context, Decision, Alternatives Considered, What It Buys Us, What It Costs Us, and a link to its Markdown source on GitHub.
- **In each of the 65 user story cards**, an **Architectural Decisions & BDR Lineage block** (`.story-bdr-adr-block`) displays:
  - Clickable ADR chips (e.g. `<a href="#adr-ADR-018">ADR-018: Multi-Session Registration Envelope</a>`) jumping directly to the ADR in the Vault.
  - Clickable Team Decision chips (e.g. `<a href="#decision-t-79">T-79: Multi-session restoration</a>`) jumping to the Decision in the Vault.
  - Clickable Customer Clarification chips (e.g. `<a href="#clarification-c-107">C-107: Sessions allowed</a>`) jumping to the Clarification in the Vault.
  - **Prominent Short Summaries**: Each chip renders `<span class="chip-desc">` with a concise summary of the rationale or decision so presenters can cite them immediately during oral exams without jumping away.
  - **Vault Deep-Linking Synchronization**: Clicking any BDR or ADR link in a story card automatically switches to `#view-vault`, unhides the target category even if previously filtered out, clears active search text, scrolls smoothly, and triggers a visual pulse highlight ring (`.target-highlight`).

---

## 7. Defects Radar: Git Investigation & HEAD Reconciliation

During the morning audit on 6 Nov 2026, defects D-01, D-02, and D-03 were documented in `docs/testing/defects.md` against unmerged feature branches (`feature/SCRUM-153`, `feature/SCRUM-154`, `feature/SCRUM-155`).

Later on 6 Nov 2026, **technical enabler SCRUM-261 was merged to main**:
- **PR #450 (commit `a8f2d879`)**: "feat(backend): Lead direct coordinator assignment and workload oversight" (31 unit/db tests passing).
- **PR #454 (commit `b5370843`)**: migration `0027_event_assignment_actor.sql` (`events.assigned_by` column).
- **PR #453 (commit `ced06372`)**: Lead assignment queue restored & `assigned_by` tracking.

Therefore:
- **D-01, D-02, D-03 are shipped on `main`** via SCRUM-261!
- **D-04 (SCRUM-259 / E02-S05) remains our single genuine open defect at HEAD**: branch `feature/SCRUM-30-reuse-event-details` (commit `5d1e9ab0`) was deliberately **never merged** into `main` because shallow event cloning dropped child session envelopes, which would have violated ADR-018 multi-session data integrity. We proudly admit D-04 as proof of strict DoD enforcement.

---

## 8. Offline Operation & Verification Commands

The web app is 100% self-contained in `artifacts/final-qna-prep-guide.html`:
- 0 external scripts, 0 external CSS, 0 CDN dependencies, 4 valid inline SVGs.
- Functions entirely offline if exam room Wi-Fi fails. (Outbound GitHub/Jira links require internet/SSO).

### Build the Artifact
```bash
python scripts/build_qna_prep_data.py
```

### Validate HTML Compliance
```bash
python scripts/check_postplan_html.py artifacts/final-qna-prep-guide.html
```

### Run Comprehensive Automated Verification
```bash
python scripts/test_qna_prep_app.py
```

### Publish to Postplan Cloud
```bash
npx --yes postplan upload artifacts/final-qna-prep-guide.html --description "ConnectSphere Final Assessment Q&A Preparation Guide"
```
