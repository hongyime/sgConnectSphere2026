# Manual-run screenshots

Hand-taken screenshots from manual test runs (T-93 in
`docs/bdr/B-team-decisions.md`). One folder per session record, named like the
record without `.md`; one or more images per test case, named by TC_ID:

```text
evidence/
  20261016-101500-lexinphun2024-debug-frontend-e2e/
    TC_E11S01_02-1.png
    TC_E11S01_02-2.png
```

PNG or JPG, under 1000 KB each, cropped to what matters, with no passwords,
tokens, connection strings or real personal data. Commit them with the record
and link them from its `## Screenshots` section. The full rules are in
`docs/testing/runs/README.md` under "Screenshots for manual runs (T-93)".
