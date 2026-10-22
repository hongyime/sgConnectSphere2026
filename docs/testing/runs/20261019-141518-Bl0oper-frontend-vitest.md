---
date: 2026-10-19T14:15:18+08:00
runner: Bl0oper
scope: frontend/vitest
environment: local
run_type: automated
test_case_version: "171026"
database: mocked
commit: e1d6f01
---

SCRUM-44 / E05-S05 gate F1: the whole frontend Vitest suite, `npx vitest run
--no-file-parallelism` (the Windows setting), jsdom with a stubbed `fetch`.
Includes Bryan's `VenueForm.test.tsx` (from #305) and this branch's
`VenueForm.conflicts.test.tsx`. Run by Claude for Aaron, from 14:15:18 to
14:17:55.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| TC_E05S05_01 | Staff save buffer values and see them on the venue inventory detail | PASS | Bryan's: 30 and 45 sent as numbers; the card reads "30 minutes" and "45 minutes" |
| TC_E05S05_01 | New buffer controls default to zero and inventory displays legacy zero values | PASS | Bryan's |
| TC_E05S05_01 | Venue Staff create a venue with both buffers and see the saved values in inventory | PASS | Bryan's |
| MULTIPLE | Invalid buffer values are explained and not submitted | PASS | Bryan's 4 cases: "Setup time must be whole minutes between 0 and 2147483647." and the same for Turnaround time; nothing sent |
| TC_E05S05_03 | A save that creates a conflict stays on the form and lists the pair | PASS | New. Warning "Changes saved, and some bookings now conflict"; line "Client B Isolation Event (EVT-2003), 15 Jan 2027, 12:30 pm – 2:00 pm: conflicts with Client A Planning Event"; "Back to venue inventory"; the page scrolls to the top |
| TC_E05S05_03 | A chain of conflicts lists every later booking, with or without an event code | PASS | New. Two lines, the second "Evening Talk (no code), 15 Jan 2027, 2:15 pm – 4:00 pm: conflicts with Client A Planning Event, Client B Isolation Event" |
| TC_E05S05_03 | The conflict list renders and survives inside StrictMode | PASS | New |
| TC_E05S05_03 | Saving again with no new conflicts clears the list and returns to the inventory | PASS | New |
| TC_E05S05_03 | A reply without a conflict list is treated as no conflicts | PASS | New. Back to the inventory, no scroll |
| TC_E05S05_03 | A conflict line without an event code or partners still reads plainly | PASS | New |
| MULTIPLE | Rest of the frontend suite | PASS | 50 files, 449/449 tests passed in total |
