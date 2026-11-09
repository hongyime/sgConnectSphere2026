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

## 4. Search Behavior & Ergonomics

The search header is engineered for human stress during oral defense:
- **One exact story/PR/TC match** (e.g. `e5s4`, `SCRUM-38`, `TC_E07S07_03`, `PR-239`, `D-01`): Auto-expands that single target drawer for immediate code tracing.
- **Multiple matches** (e.g. searching `safety` or `venue`): Shows compact result cards only to prevent cognitive overload.
- **Archive safety**: Never auto-expands the full team decisions or customer clarifications drawers.
- **Top Likely Answers quick chips**: Single-click filters for the 9 primary exam battlegrounds:
  1. 🛡️ Safety Review
  2. 🏢 Venue Loss
  3. ⚡ Booking Race
  4. ⏳ Holds
  5. 👥 Attendee Capacity
  6. 📬 Outbox
  7. 📈 Scrum Velocity
  8. 🤖 AI Governance
  9. 🚨 Four Defects

---

## 5. Offline Operation & Verification Commands

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
