# D. Story boundary rulings

Results of the overlap audits. Three outright duplications were removed, two stories were merged into their counterparts, two were retitled, and four pairs were kept apart with the boundary recorded. B-11 came from the test-case audit rather than the story audit.

| ID | Stories | Ruling | Reasoning |
| --- | --- | --- | --- |
| B-01 | E01-S02 and E01-S03 | Kept separate | E01-S02 governs which events a user can see; E01-S03 governs which fields within an event are visible. Horizontal and vertical access control. |
| B-02 | E03-S02 and E03-S06 | Kept separate | A clarification request blocks the request and moves it to Awaiting Clarification. A comment changes no status and blocks nothing. |
| B-03 | E03-S05 and E03-S07 | Kept separate | E03-S05 is read-only and covers status and its history. E03-S07 covers the editable fields and who may change them. |
| B-04 | E07-S01 and E07-S05 | Kept separate | Standing operational status is a column on EQUIPMENT. A time-bounded withdrawal is a dated row in EQUIPMENT_UNAVAILABILITY. The schema backs the distinction. |
| B-05 | E05-S01 Sc2 and E10-S02 Sc1 | Cross-referenced | The same invariant from opposite directions: the venue shrinks, or attendance grows. Change one rule and the other must change with it. |
| B-06 | E02-S03 | Retitled | Read as data capture, which E02-S01 already covered. Its real content is the vocabulary and the matching contract. |
| B-07 | E05-S02 | Retitled | Same pattern as B-06, with capture already covered by E05-S01. |
| B-08 | E06-S01 and E06-S02 | Duplication removed | Both stated that failing criteria are named. E06-S01 now returns near matches; E06-S02 names the failures. |
| B-09 | E07-S04 and E07-S03 | Duplication removed | E07-S04's first checklist line restated the whole of E07-S03. |
| B-10 | E09-S04 and E09-S05 | Duplication removed | Both asserted that waitlisted Attendees are notified when a place is released. Retained in E09-S04 only. |
| B-11 | E09-S02 Sc4 and E10-S02 Sc4 | Duplication removed | Both described a venue change reducing capacity below the registered count, with the same trigger, actor and outcome. Surfaced by the test-case audit, which produced two near-identical cases. E09-S02's scenario was deleted and E10-S02's retained, because detecting the impact of a change belongs to Change Management while E09-S02 owns enforcement at registration time. |
