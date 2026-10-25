---
date: 2026-10-21T00:27:20+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: 171026
database: real
commit: 1a68102
pr: 324
---

# E08-S05 supplied human screenshot session — partial acceptance

SCRUM-62 / E08-S05; supports implementation PR #324. Xiang Ying performed the
browser steps and supplied six hand-taken screenshots. The agent copied and
reviewed the originals; no automated screenshot is substituted as human evidence.
Application HEAD `1a68102` was checked in the running story worktree. The separate
evidence branch is based on main, not the tested implementation. Local synthetic
PostgreSQL had migration 0022 applied; no production deployment is evidenced.

Session end is reconstructed from the latest original screenshot file timestamp
(2026-10-21T00:27:20+08:00); source images span 21 October 2026 00:13–00:27 Singapore time.
The activity screenshot records manual completion at 00:16. This is preservation
of the supplied session, not a new human re-run on the documentation branch.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E08S05_01 | Confirmed event automatically becomes Completed after its end | SKIP | No supported automatic-completion capture supplied. File 01-2 shows Completed at 21 Oct 00:16 while the displayed end is 21 Oct 23:39; it is consistent with manual completion, not proof of automatic completion after end. Event code/header is cropped out. |
| TC_E08S05_02 | Assigned Coordinator marks a started Confirmed event complete | PASS | Visible manual result is in supplied 01-2 plus 05-2: start 20 Oct 22:39; Completed at 21 Oct 00:16 before its end; activity shows Confirmed → Completed by Coordinator A. These are attributed to the MANUAL fixture through the tester's step sequence; event code is cropped out and no final-click/success-toast image was supplied. Supplied 02-2 is the wrong item and is not used to prove manual completion. |
| TC_E08S05_03 | Premature completion blocked | PASS | 03-1 shows E08-PREMATURE-1609A9EF still Confirmed, start 27 Oct 23:39 and a before-start refusal explanation. Supplied 02-2 shows the same premature event still Confirmed. The action button is cropped out, so this records the visible before-start restriction, not a separately observed server-write refusal. |
| TC_E08S05_04 | Cancelled event never auto-completes | SKIP | 04-2 shows E08-CANCELLED-ED2491FB still Cancelled with original end 20 Oct 22:39 and message it will never automatically complete. No before/evaluator execution evidence accompanies the image; a full post-evaluation outcome is not claimed from this static view alone. |
| TC_E08S05_05 | Completion transition recorded in activity log | PASS | 05-2 shows Status changed, Confirmed → Completed, Coordinator A, 21 Oct 2026 12:16 am. This proves a manual actor entry, not an automatic System entry. The live assigned-Coordinator log substitutes for the canonical Administrator example; reviewer acceptance of this deviation remains required. |
| TC_E08S05_06 | Exact end-time boundary | SKIP | No human controlled-clock run. Existing automated unit/real-DB boundary evidence is in implementation #324; it is not relabelled manual PASS. |
| MULTIPLE | Another Coordinator cannot access event completion | PASS | Supplied refusal screen shows Access refused / This event is not assigned to you. Coordinator B and the MANUAL target are attributed from the tester's login/navigation sequence; account and event code are absent from this crop. |

## Fixture and filename mapping

The human guide used these synthetic events, prepared separately from the human
observations: MANUAL `E08-MANUAL-677fd101`, PREMATURE
`E08-PREMATURE-1609a9ef`, AUTO `E08-AUTO-37ae63cc`, CANCELLED
`E08-CANCELLED-ed2491fb`. Canonical example names, dates and Coordinator identity
were substituted; canonical requirements and cases are unchanged. The user
followed Coordinator A / Coordinator B logins; cropped account attribution is
stated rather than invented from the pixels.

Original names and bytes are retained. In particular:

- `TC_E08S05_02-2.png` is a PREMATURE/Confirmed image, not manual Completed proof.
- `TC_E08S05_01-2.png` is consistent with the manual fixture's period and manual
  completion timestamp. It is not proof of automatic completion: its displayed
  end had not been reached at the status-change time.
- `TC_E08S05_05-2.png` names Coordinator A. It is manual activity proof and does
  not satisfy the requested System-actor capture, despite its supplied suffix.
- `TC_E08S05_03-1.png` crops off the button; 01-2 and 05-2 omit the event code.
  No missing context is silently filled in as an independently visible fact.

## Remaining acceptance evidence

1. AUTO fixture: event code, Confirmed status and passed end before evaluation;
   authorized evaluator execution, then Completed and System activity after it.
2. CANCELLED fixture: before/after evaluation context showing it stays Cancelled.
3. Prefer a correctly named MANUAL result with the event code/status and manual
   activity together, and a PREMATURE capture including the disabled action.
4. Human acceptance of the Coordinator-versus-Administrator Activity log role
   substitution. Exact-boundary automated proof remains separate.

No source changes, Jira status/sprint/estimate changes, or story Done claim.
Independent peer review, acceptance and release/merge gates remain on #324.

## Screenshots

- [TC_E08S05_03-1.png](evidence/20261021-002720-xiangyingg-frontend-e2e/TC_E08S05_03-1.png): Premature event, future start, Confirmed and visible before-start explanation; button cropped.
- [TC_E08S05_02-2.png](evidence/20261021-002720-xiangyingg-frontend-e2e/TC_E08S05_02-2.png): Wrong-item filename: premature event remains Confirmed; not manual Completed proof.
- [TC_E08S05_01-2.png](evidence/20261021-002720-xiangyingg-frontend-e2e/TC_E08S05_01-2.png): Completed result with start/end/status-change times; code omitted; consistent with manual completion before end.
- [TC_E08S05_05-2.png](evidence/20261021-002720-xiangyingg-frontend-e2e/TC_E08S05_05-2.png): Confirmed → Completed by Coordinator A at 00:16; manual activity, not automatic System.
- [TC_E08S05_04-2.png](evidence/20261021-002720-xiangyingg-frontend-e2e/TC_E08S05_04-2.png): Cancelled fixture, past original end and cancelled-protection message; evaluator run not independently captured.
- [MULTIPLE-unassigned-coordinator-denied.png](evidence/20261021-002720-xiangyingg-frontend-e2e/MULTIPLE-unassigned-coordinator-denied.png): Access refused for another Coordinator per supplied login sequence; account/event context cropped.
