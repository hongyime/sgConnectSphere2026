# Archive supplied manual screenshots

Organise the user's saved human E06-S02/E06-S03 screenshots under the new T-93 repository evidence layout without editing merged execution records or claiming a fresh manual run. Branch docs/manual-screenshot-archives began from main 8599ad2 on 16 October.

## Work completed

Read current AGENTS, run README/evidence README, source-of-truth and T-93 rules. Extracted 22 E06-S02 and 24 E06-S03 original PNG images from the tester's saved Word documents. Original local Word files are retained. Assets live under docs/testing/runs/evidence/20261008-212539-jininggg-frontend-e2e/ and 20261015-014746-jininggg-frontend-e2e/, with TC_ID-sequence filenames, README indexes and source-order/caption manifests. Updated root evidence index and both testing guides for discovery.

Only supplied human images were archived. Automated browser images were not copied. The extraction preserved source bytes and all images are below 1000 KB. Partial scope is explicit, including period-only TC_E06S03_08 screenshots (not withdrawal), partial conflict/advisory evidence, and supplemental mobile/access views. No skipped case was upgraded to PASS.

## Policy and provenance

Both historical records predate the 16 October cutoff and remain byte-identical to main. The added indexes are archival supplements requested by the user, not edits to old records, backdated executions or compliance reruns. T-93's current Sprint 3 Done-story rerun requirement still needs real current human execution where applicable. No application, database or Jira changes.

## Validation and next step

20261016-153956-jininggg-tooling.md records 46 byte-for-byte matches, valid image/size/name/ID checks, resolved index links and unchanged original records. All archive files pass explicit pre-commit checks. Checksum strings initially triggered false secret detections, so unnecessary hashes were removed from committed manifests while byte comparisons remain verified. Full repository check retains existing Windows 3 failures/11 errors among 146 tooling tests.

The user authorised committing, pushing and creating a PR for this archival task on 16 October. Do not invent fresh manual results or edit immutable records. Review and commit the assets/indexes when authorised; use a docs-only branch/title without a SCRUM key to avoid accidental Jira completion. Original Word documents remain ignored local sources.


## Publication preparation

Refreshed origin/main, still 8599ad2. Required pre-commit repository check again
retains the same Windows tooling 3 failures/11 errors among 146 tests; archive
hygiene and prior asset validation pass. Publish a documentation PR with four
sections and a PostPlan, without a closing Jira clause or manual-rerun claim.
Keep the original records and local Word documents unchanged.
