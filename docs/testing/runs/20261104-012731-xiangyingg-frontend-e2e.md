---
date: 2026-11-04T01:27:31+08:00
runner: xiangyingg
scope: frontend/e2e
environment: local
run_type: manual
test_case_version: "021126"
database: real
commit: 85e2097
pr: 420
---

Human tester supplied this screenshot during the local Singapore-time manual
run. This record captures the supplied observation only, not the complete
TC01–05 acceptance sequence. Test data uses the actual run date, 2026-11-04,
and inclusive maximum 2028-11-04, instead of the canonical case's example dates.
The application uses the isolated native PostgreSQL manual-test database.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E02S07_01 | A date beyond two calendar years should block request submission | PASS | Supplied browser capture shows Event name E02 Horizon TC01-TC02 and refusal: Session 2 (New Session), start date and time must be on or before 2028-11-04 (Singapore time); edit this Session before submitting again. This establishes the visible Session-specific start-field refusal only. The screenshot does not show the saved Session inputs, a Draft reload, or an end-field refusal; those remain additional evidence to collect. |

## Screenshots

- [TC_E02S07_01-1](evidence/20261104-012731-xiangyingg-frontend-e2e/TC_E02S07_01-1.png): Human-supplied Event identity and Session-specific start-date horizon refusal. The saved Session title in the refusal is New Session, not Afternoon.

## Remaining evidence

- Capture the saved out-of-range Session dates and Event dates, with Event identity.
- Capture TC01's separate end-field refusal.
- Complete TC02–05, including correction, reload and successful resubmission.
- Add later observations in a new immutable record; do not edit this session file.
- This partial evidence does not close SCRUM-180 or replace independent review and acceptance.
