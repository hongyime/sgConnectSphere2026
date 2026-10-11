---
date: 2026-10-07T10:59:45+08:00
runner: xiangyingg
scope: backend/unit
environment: local
run_type: regression
test_case_version: '031026'
database: mocked
commit: 83754ab
pr: 216
---

Command: `npm test --workspace backend`. Timestamp captured at command completion.
Executed on the uncommitted coverage-review working tree merging latest main
into branch HEAD 83754ab; the commit field identifies HEAD, not the unstaged changes.

| TC_ID | Test Name | Outcome | Remarks |
| --- | --- | --- | --- |
| MULTIPLE | SCRUM-52 coverage review regression | PASS | Observed exit code 0; command and coverage scope above. |

Final output:

```text
  service.ts                        |   97.59 |    87.12 |     100 |   97.59 | ...1,184-185,237-238
  status.ts                         |   87.14 |    85.71 |      75 |   87.14 | 52-53,57-63
 src/modules/eventNotifications     |   94.84 |     85.1 |     100 |   94.84 |
  inbox.ts                          |   94.91 |    96.29 |     100 |   94.91 | 35-37
  service.ts                        |   94.82 |    80.59 |     100 |   94.82 | 61-64,121-125
 src/modules/eventVisibility        |   84.98 |    69.73 |   81.25 |   84.98 |
  runtime.ts                        |   58.18 |     62.5 |      40 |   58.18 | 11-13,16-25,27-36
  service.ts                        |   91.74 |    70.58 |     100 |   91.74 | ...5,174-180,216-217
 src/modules/notificationDispatcher |   68.34 |    76.19 |   81.81 |   68.34 |
  durable.ts                        |   93.33 |      100 |      50 |   93.33 | 43-45
  emailTemplate.ts                  |     100 |      100 |     100 |     100 |
  inApp.ts                          |     100 |       75 |     100 |     100 | 12
  postgres.ts                       |    34.1 |    42.85 |      75 |    34.1 | 37-38,47-129
 src/modules/shared                 |   84.61 |      100 |      50 |   84.61 |
  roles.ts                          |   84.61 |      100 |      50 |   84.61 | 12-13
 src/modules/venueBooking           |   66.07 |    88.34 |   79.31 |   66.07 |
  blocks.ts                         |   46.09 |    91.11 |    62.5 |   46.09 | ...7,219-244,250-255
  calendar.ts                       |     100 |      100 |     100 |     100 |
  catalogue.ts                      |   59.92 |    88.79 |   76.92 |   59.92 | ...9,493-510,516-548
  matchAccessibility.ts             |     100 |      100 |     100 |     100 |
  search.ts                         |   74.44 |    74.07 |     100 |   74.44 | 39-46,75-89
------------------------------------|---------|----------|---------|---------|----------------------
```
