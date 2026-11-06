# Release 1 system design

As-built source snapshot: main `0773a721` on 5 November 2026. Jira was refreshed on
6 November 2026; statuses are a point-in-time view, not a new acceptance decision.
The system is a React/Vite single-page application and a TypeScript modular
monolith exposed through Vercel Functions, backed by PostgreSQL, with a durable
notification transport through Upstash and Brevo.

## Diagram catalogue

Each explanation page links one canonical `.mmd` source. The submission pack
contains SVG, high-resolution PNG and PDF renders of every source, plus the
combined **System Design - ConnectSphere Release 1.pdf**. Regenerate renders
whenever a source changes. No raster image is the source of truth.

| Diagram | Purpose |
| --- | --- |
| [C4 system context](01-c4-context.md) | C4 C1; typed actors, system boundary and labelled relationships |
| [C4 containers and deployment](02-c4-containers.md) | C4 C2; container means runtime application or data store, not Docker |
| [C4 API components](03-c4-components.md) | C4 C3; selected modules within API container |
| [Release 1 user journey](04-user-flow.md) | Flowchart: rounded start/end, decision diamonds, labelled paths |
| [Event lifecycle state machine](05-event-state.md) | UML-style state diagram; transition labels describe triggers |
| [Data flow context (Level 0)](06-dfd-context.md) | Supplementary DFD: rectangles external entities; rounded process; noun-labelled data arrows |
| [Data flow decomposition (Level 1)](07-dfd-level-1.md) | Supplementary DFD: numbered processes; cylinder data stores; labelled data flows |
| [ERD: identity, Events and Sessions](08-erd-core.md) | Mermaid crow-foot ER; PK/FK and optionality; selected physical tables |
| [ERD: venue, equipment and technical support](09-erd-arrangements.md) | Mermaid crow-foot ER; selected physical tables and nullable Session links |
| [ERD: registration, safety and durable notifications](10-erd-registration-notifications.md) | Mermaid crow-foot ER; selected physical tables |
| [UML code view: lifecycle repository boundary](11-uml-lifecycle.md) | UML class/interface realization and dependency; TypeScript structural types |
| [Sequence: atomic Draft submission and refusal](12-sequence-submission.md) | UML sequence; lifelines, messages, alt branch, transaction ordering |
| [Sequence: transactional outbox to email](13-sequence-notifications.md) | UML sequence; asynchronous phases and provider outcome branch |

## What the lectures actually teach

References are to the PDFs in [the lecture archive](../slides/lecture/), using
**PDF page numbers**; Week 4 printed slide numbers diverge from PDF page numbers.

| Artefact | Lecture evidence | Interpretation used here |
| --- | --- | --- |
| C4 context and containers | Week4-TestCases_SoftwareArchitecture.pdf pp. 58, 60-61 (p. 58 is printed slide 61) | Recommended for most teams; one system at C1, runtime applications/data stores at C2. A container does not mean Docker. |
| C4 components | Same PDF p. 62 | Optional when useful; included because this API has several interacting modules. |
| Code-level UML and ER | Same PDF p. 63 (printed slide 66) | Focused views rather than an exhaustive model of every function. |
| Diffable source and ADRs | Same PDF pp. 64, 66 | Text DSL plus rationale; diagrams do not replace architectural decisions. |
| Class relationships | Week5-CommunicatingDesign_Collaborating.pdf pp. 7-13 | Attributes, operations, multiplicity, association, composition and inheritance. Only use relations supported by code. |
| Sequence | Same PDF pp. 15, 22 | Lifelines across the top, time downward, labelled messages and explicit alternate outcomes. |
| User flows, state machine and DFD levels | No dedicated instruction found across the supplied lecture PDFs | Supplementary views requested for this submission, not invented course requirements. DFD notation is declared on each page. |

The DFDs use process 0 as Level 0 and decompose it into processes 1-4 at Level 1.
Every external context flow is balanced in the decomposition. Identity/business/
audit stores are logical partitions in the same database. These diagrams show
data movement, not screen order, deployment processes or control signals.
ER diagrams use Mermaid's crow-foot notation and show selected physical keys;
nullable/legacy links are described rather than silently made mandatory.

## Built scope and Jira snapshot

The canonical [Release 1 backlog](../backlog/release-1/) governs requirements.
Code and migrations establish what exists; Jira Done does not prove every
acceptance criterion. The following features have executable routes/modules;
the last column highlights the Jira gates still open at the snapshot.

| Area | Built code and representative stories | Open Jira gate |
| --- | --- | --- |
| Identity and visibility | Cookie sessions, verification/reset, profile/deactivation, organisation and assigned-Coordinator scoping (E01) | No multi-role runtime implementation; ADR-019 remains target design. |
| Event requests and Sessions | Drafts, reuse, two-year horizon, Session authoring (E02-S01/S02/S05/S07; E04-S02) | SCRUM-39 In Review; SCRUM-180 Done, supplemental manual evidence tracked separately in #435. |
| Coordination | Assignment, clarification, decisions, threads and Lead oversight (E03) | Jira representative stories Done. |
| Venues | Catalogue/layout/accessibility, buffers, suitability, holds, claims, blocks and release (E05/E06) | Jira representative stories Done. |
| Equipment and support | Catalogue, availability, reservation/stock warnings, support/staffing, Session links (E07) | SCRUM-181 Done; Jira status alone is not an acceptance receipt. |
| Safety and lifecycle | Initial safety submission, Safety Officer decision, reversion/re-entry, completion and cancellation (E08/E10) | SCRUM-61 In Review; SCRUM-158, SCRUM-62, SCRUM-73 Done. |
| Registration and attendance | Session choices, capacity/Pending review, window, waitlist, withdrawal and attendance (E09) | Jira E09 stories Done. |
| Change management | Request/decision, impact preview, arrangement reconfirmation, terminal Obsolete handling (E10) | SCRUM-70 In Progress; SCRUM-71 In Review. |
| Notifications and audit | In-app inbox, transactional outbox, durable relay/worker, activity records (E11/E14) | SCRUM-75 In Progress despite merged provider-verification evidence #433. |

Future/unbuilt claims excluded from as-built diagrams: multi-role switching,
SMS, reporting/exports, attachments, billing/payments, standalone Redis caching,
independent worker daemons, ORM persistence and Next.js/SSR. UI prototypes and
old roadmap screens are not Release 1 delivery evidence.

## Contradictions resolved against code

| Older claim | As-built conclusion and evidence |
| --- | --- |
| README says only scaffolds; repository topics include Next.js | React/Vite SPA, `react-router-dom`, plain CSS. `vercel.json` framework is `vite`; there is no Next dependency or Next route tree. Repository topics are metadata, not an implementation authority. |
| C4 says Tailwind and ORM | `frontend/src/styles.css`/shared components; `pg` parameterized SQL and `inTransaction`. No Tailwind or ORM dependency. |
| Six containers / two background daemons | One Vercel project serves static SPA and API functions. Relay and worker are handler modes; external managed PostgreSQL, Redis and email are identified separately. |
| Email via SMTP | `providers/brevo.ts` uses HTTPS Brevo API; Upstash uses HTTPS REST. |
| Supabase Auth | Custom password hashing and opaque cookie tokens; only token digests are stored in `auth_sessions`. Supabase supplies PostgreSQL, not auth. |
| ADR-019 many-to-many roles already built | Accepted target only. `users.role`, `currentUser` and `canActAsRole` still use one role. Do not draw USER_ROLES as physical storage. |
| Automatic initial Safety Review | `submission.ts` exposes initial Coordinator submission; `autoSafetyReview.ts` only re-enters for eligible history. The wider T-82 target is not fully reflected in initial-entry code. |
| Separate SAFETY_CHECKS table | Decisions/factors are stored through audit entries in `submission.ts`, not a physical safety_checks table. |
| Fast continuous email scheduling | `vercel.json` declares daily relay and hold/completion schedules, not frequent worker scheduling. Handler existence and provider smoke evidence do not prove continuous delivery cadence or full E11 acceptance. |
| Event-only equipment | New multi-Session paths use Session links; legacy nullable Event-level rows remain. Support-staff assignment remains Event-level. |

[Decision reconciliation](../decisions/release-1-as-built-reconciliation.md)
records the distinctions without rewriting the historical ADRs.

## Existing diagram disposition

`docs/design/` previously contained only the Figma refinement proposal, not
rendered system diagrams. It is retained and clearly labelled as a proposal.
The previous `docs/c4-diagrams.md`, `docs/modular-monolith-architecture.md`,
`docs/dynamic-user-flows.md`, `docs/class-diagram.md` and `docs/db_schema.md`
are historical/target inputs; the as-built submission uses this catalogue.
They are outside this task's owned paths, so they are not deleted or silently
rewritten. Their contradictory claims are resolved above. This pack replaces
rather than duplicates their diagrams in the submission. Historical ADR-004,
ADR-005 and ADR-012 stay explicitly retired/superseded.

## Reproduce the renders

Use Python with `reportlab` and `pypdf`, Node/npm, and available Chromium.
The builder calls the pinned Mermaid CLI 12.2.0 through npx; it adds no application
dependency or lockfile change:

```bash
python docs/design/render.py --output "submission/3. SYSTEM DESIGNS"
```

If Chromium is installed outside Puppeteer's default cache, add
`--puppeteer-config <private-json-file>` whose `executablePath` points to your
installed Chromium. Do not commit machine-specific paths. PNG renders use
`--size 2600 --scale 2`; individual PDFs fit their diagrams. The combined PDF
preserves vector diagrams, includes one explanation per view and verifies its
page count. Inspect SVG, PNG and PDF outputs visually after regeneration.

## Client-source trace and precedence audit (6 November)

All eight supplied client/course source files were read. DOCX references below
use section names and XML paragraph numbers (including table cells), because
Word pagination depends on the renderer; no page number is invented. Workbook
references use physical worksheet rows. PDF references use PDF pages.

| Source, in teaching-week order | Requirement or method and effect on this pack |
| --- | --- |
| Week 1 Customer Briefing.docx, Background paragraphs 21-53; features 79-206; sections 7-8 paragraphs 241-258 | Replace fragmented email/spreadsheet coordination with consistent event workflows, role/relationship visibility, mobile use and auditability. This is the wider product vision, not proof every feature is Release 1. |
| Week 2 User Story Assignment.pdf pp. 1-3 | Title, user story, testable acceptance criteria and INVEST; the design links canonical stories rather than inventing acceptance. |
| G1G2 Week2 Clarification.xlsx, Sheet1 rows 7, 9, 11-12, 17-18, 21-28, 35, 38-40, 53-59 | No billing/transit model; human venue approval; authenticated accounts; notification channel flexible. Automatic Coordinator assignment, deferred buffers/expiry and nonautomatic status changes are later superseded. Lockout thresholds are unspecified customer policy; 30 minutes/five failures is an implementation choice. |
| Week 4 Project Instructions.docx, First Release paragraphs 34-79 | Twenty core areas: access, requests, drafts, review, assignment, status, information updates; venue catalogue/calendar/search/suitability/request/approval/conflicts; equipment requests/availability/reservations; registration; changes; notifications. The catalogue groups these into connected workflows, not isolated screens. |
| Same DOCX, Deliverables paragraphs 80-112; rubrics 155-179 | C4 system design; executable code, tests/CI and README; instructor repository access; significant decisions, trade-offs and traceability. The user's seven folder names/order are used explicitly; the source table orders design/testing/meetings differently. |
| G1G2 Week4 Clarification.xlsx, Sheet1 rows 2-11 | Preloaded internal accounts; none-required equipment counts complete; capacity differs from planning attendance; tentative holds exist. Earlier separate-Event treatment of Sessions (row 9) is superseded by Week 9 row 38 and the current Session implementation. |
| Week 7 Customer Changes.pdf p. 1 changes 1-3 | Venue setup/turnaround buffers; preserve Events and flag bookings on venue loss; multiple independent venue bookings. Reflected in arrangements ERD, lifecycle/user flow and API components. |
| Same PDF p. 2 changes 4-6 | Expiring holds; Lead-only allocation queue and assignment; Safety Officer gate after arrangements and before confirmation. These supersede early auto-assignment and deferred-expiry/buffer answers. |
| Week 7 Guide to Managing Changes.pdf p. 1 sections 1-6; pp. 2-3 examples | Maintain C4, class, sequence, data model, interfaces and tests with changed requirements. This pack includes those model types and links actual API code. The guide's reopening examples conflict with later instructor/team no-reopening guidance; this design task changes no Jira state and records gaps separately. |
| G1G2 Week9 Clarification.xlsx, G1G2 rows 2-8, 15-29 | Contracts stay offline; no specified minimum lead time; submitted changes pass through Coordinator; pending changes become obsolete at terminal Events; preloaded roles; material changes require re-review. A two-year submission horizon is a team rule, not a verbatim customer requirement. |
| Same workbook rows 30-46 | Staff choose hold expiry; Safety Review precedes confirmation; Leads assign immediately and cannot coordinate personally; multiple Session windows and Session-specific equipment. Diagram responsibilities follow these later clarifications. |
| Same workbook rows 47-67 | Save buffer changes and flag conflicts; row 50 permits open-ended venue blocks, superseding row 42; venue loss returns Events to Planning (51); notify Organiser/Attendees when replacement/formal change is confirmed (52); automatic safety entry (63), decisions/comments (65), no self-registration (67). Automatic initial safety entry remains an explicit implementation gap. Row 58's narrower Lead wording conflicts with rows 31/37's system-wide view; diagrams show actual scoped routes, not an invented new policy. |

### Supplementary notation references

The lecture-backed C4, class and sequence views remain the required design
foundation. Supplementary views add data movement and lifecycle explanation:
[Mermaid flowchart](https://mermaid.js.org/syntax/flowchart.html),
[state diagram](https://mermaid.js.org/syntax/stateDiagram.html) and
[ER notation](https://mermaid.js.org/syntax/entityRelationshipDiagram.html)
define the text DSL used. The [IBM DFD reference](https://www.ibm.com/think/topics/data-flow-diagram)
use context Level 0 followed by Level 1 decomposition. Our cylinder store glyph
is a declared Mermaid adaptation, not a claim of strict Yourdon/Gane-Sarson
notation. These supplementary diagrams do not introduce extra runtime services.

### Assumptions and review boundaries

- Main `0773a721` remains the application baseline; documentation-only changes
  do not retroactively change the independently tested tree.
- The confirmed display names are Bryan (Product Owner only), Amareet (Scrum
  Master and Developer), Aaron, Xiang Ying, Le Xin and Ji Ning (Developers).
  Confirmed GitHub mappings respectively: bryanseah234, amareetkm2024-del,
  Bl0oper, xiangyingg, lexinphun2024-debug and jininggg. Authorship is not
  inferred from role or Jira assignment.
- The user's earlier 9 PM SGT cutoff is the working deadline, ahead of the
  source instructions' 23:59 cutoff. Submission packaging follows the user's
  exact numbered folder names. This task does not submit to eLearn.
- [CONFIRM] `README.md`, repository access: a team member must verify both
  instructors have access; public visibility alone is not an access receipt.
- [CONFIRM] `docs/decisions/release-1-as-built-reconciliation.md`, ADR-019,
  T-82 and scheduling rows: PO/owners must resolve acceptance of documented
  target/code differences. This documentation PR cannot establish acceptance.
- Issues for other owners: legacy architecture files listed above remain
  contradictory outside this task's ownership; `docs/source-of-truth.md` still
  indexes those older views. Owners should reconcile links after this PR merges.

## Submission packaging uses the canonical sources

Keep only `docs/design/` as the tracked diagram source. Do not commit generated
renders or a second tree under `submission/3. SYSTEM DESIGNS/source/` in this PR.
Build renders with the command above, then archive the committed source tree
at packaging time (replace `<submission>` with the local submission parent):

```bash
git archive --format=zip --output="<submission>/3. SYSTEM DESIGNS/System Design - sources.zip" HEAD docs/design/ docs/architecture.md docs/decisions/release-1-as-built-reconciliation.md design.md
python -m zipfile -c "<submission>/System Designs.zip" "<submission>/3. SYSTEM DESIGNS"
```

Run from the repository root after committing the intended source version.
The final outer ZIP combines the source archive with the generated renders;
its source files originate from `docs/design/`, not a maintained submission
mirror. Generated ZIPs stay in local submission output. Shared submission
skeleton/policy changes are owned by #444, which was still open at this review.
