---
date: 2026-10-24T18:26:58+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 211026
database: real
commit: f4c3169
pr: 343
---

Xiang Ying supplied 13 original hand-taken screenshots after following the attendance click-through and full registration/completion/attendance instructions. Run end is reconstructed from the final supplied image modification time; captures span 18:16:03–18:26:58 Asia/Singapore on 24 October 2026. No agent/browser-automation screenshot is used as manual evidence.

Tested application f4c3169 is a local-only integration merge with parents attendance 988b557328a6cce3c15228d0bee861b122572cad and registration frontend b6fef3b586de8eb7664d7465cf2e3d1844ad50a7 (includes its backend ancestry). Attendance parent already contains merged completion #324. The local assembly is not pushed into #343, and this record does not claim registration #326/#327 is merged into main. The existing attendance implementation is exercised with those dependencies. Local frontend/backend use a fresh seeded real PostgreSQL database through migration 0024; no production write or deployment claim. Synthetic setup created preloaded COMPLETED/CONFIRMED fixtures; the separate integration fixture initially had zero registrations. Automated readiness only logged in and read initial state; the supplied human run performs registration, completion and attendance.

Fixture substitutions: assigned Coordinator A coord_a@connectsphere.com replaces canonical coordinator_1; generated synthetic Completed/Confirmed events replace Charity Run/Tech Conference while retaining the case statuses and counts. Integration code E09-INTEGRATION-3898568b uses two Sessions and two Event registrations. Actual times, not a controlled clock, were used.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E09S06_01 | Verify that marking a registered Attendee as attended for a event after the event is Completed should update their record without changing the registration figure | PASS | Completed E09-ATTENDANCE-COMPLETED-e4d271a9 initially shows Registered5/Attended0; save success shows5/1; supplied reload capture shows5/1 and attendee_a Attended. Reload crop omits event heading and is attributed by supplied sequence. Integration independently shows Completed registration count2 unchanged while attendance becomes1 and persists on reload. |
| TC_E09S06_02 | Verify that a registered Attendee who did not attend should be shown as registered but not attended once the event is Completed | PASS | Fixture crop shows attendee_b@example.com Registered but not attended; its event heading is omitted and attributed by the supplied sequence. Integration full-context Completed capture also shows Attendee B Registered but not attended, while A is Attended. |
| TC_E09S06_03 | Verify that attempting to record attendance before the event is Completed should be blocked | PASS | Confirmed E09-ATTENDANCE-CONFIRMED-10ffec1d shows the explicit completion requirement and5/0; that crop excludes buttons. Integration E09-INTEGRATION-3898568b supplies full-context Confirmed2/0, completion requirement and both disabled Mark attended controls. These images evidence UI blocking, not a manually issued API request. |
| TC_E09S06_04 | Verify that registration and attendance counts should be viewable side by side for each event | PASS | Completed fixture code and status visible with Registered5 and Attended4 together. |
| MULTIPLE | Human registration to completion to attendance integration | PASS | Supplied A confirmation lists both Sessions, B confirmation lists first Session only. Subsequent Confirmed roster shows2 Event registrations despite3 Session choices; UI attendance is blocked. Same event then shows completion success, followed by attendance success and reload Registered2/Attended1 with A Attended/B not attended. Registration confirmation crops show title/range but omit account identity/event code; attribution follows supplied sequence and matches later named roster. Screenshots do not compare database registration timestamps or Session-link rows before/after; those persistence invariants remain separately supported by automated real-DB evidence. Confirmation text mentions email, but external email delivery is not independently verified here. |
| MULTIPLE | Unassigned Coordinator refused | PASS | Supplied Coordinator B sequence shows Access refused / This event is not assigned to you. Crop omits address bar and signed-in account; role/event attribution is from the supplied execution sequence, not independently visible in this image. |

## Screenshots

- [TC_E09S06_01-1](evidence/20261024-182658-xiangyingg-frontend-e2e/TC_E09S06_01-1.png): Completed fixture, Registered5/Attended0.
- [TC_E09S06_01-2](evidence/20261024-182658-xiangyingg-frontend-e2e/TC_E09S06_01-2.png): Attendance saved, registration unchanged5, attendance1.
- [TC_E09S06_01-3](evidence/20261024-182658-xiangyingg-frontend-e2e/TC_E09S06_01-3.png): Supplied reload,5/1 and Attendee A Attended; event heading cropped.
- [TC_E09S06_02-1](evidence/20261024-182658-xiangyingg-frontend-e2e/TC_E09S06_02-1.png): Attendee B Registered but not attended; event heading cropped.
- [TC_E09S06_03-1](evidence/20261024-182658-xiangyingg-frontend-e2e/TC_E09S06_03-1.png): Confirmed fixture and explicit completion requirement; controls cropped.
- [TC_E09S06_04-1](evidence/20261024-182658-xiangyingg-frontend-e2e/TC_E09S06_04-1.png): Completed fixture,5 registered and4 attended side by side.
- [MULTIPLE-unassigned-coordinator-denied](evidence/20261024-182658-xiangyingg-frontend-e2e/MULTIPLE-unassigned-coordinator-denied.png): Access refused; role/event context supplied by run sequence.
- [MULTIPLE-integration-registration-a](evidence/20261024-182658-xiangyingg-frontend-e2e/MULTIPLE-integration-registration-a.png): Registration success, two selected Sessions; A attribution supplied by sequence.
- [MULTIPLE-integration-registration-b](evidence/20261024-182658-xiangyingg-frontend-e2e/MULTIPLE-integration-registration-b.png): Registration success, first Session only; B attribution supplied by sequence.
- [MULTIPLE-integration-before-completion](evidence/20261024-182658-xiangyingg-frontend-e2e/MULTIPLE-integration-before-completion.png): Integration Confirmed2/0, completion requirement and disabled controls.
- [MULTIPLE-integration-completed](evidence/20261024-182658-xiangyingg-frontend-e2e/MULTIPLE-integration-completed.png): Same integration event Completed with success banner.
- [MULTIPLE-integration-attendance](evidence/20261024-182658-xiangyingg-frontend-e2e/MULTIPLE-integration-attendance.png): Same integration event saved2/1, A Attended and B not attended.
- [MULTIPLE-integration-reloaded](evidence/20261024-182658-xiangyingg-frontend-e2e/MULTIPLE-integration-reloaded.png): Supplied integration reload2/1 and individual labels; right edge of status pill cropped.

Original registration-a, registration-b and reloaded filenames ended in `.png..png`; repository names normalize that suffix only. All 13 images retain their supplied bytes and are below 1000 KB. Historical sessions remain unchanged. Independent human review of code, cases and this evidence is still required; no Jira Done claim.
