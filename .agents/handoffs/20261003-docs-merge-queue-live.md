# docs/merge-queue-live

Goal: record in decision 0012 that step 2 of the merge-queue rollout was
applied live on 3 October 2026, and be the first PR to go through the queue
so the rollout is verified end to end. No Jira key; process change under
decision 0012.

Done: decision 0012 Status gains the apply record (commit, checks, read-back
parameters, the earlier strict=false change); STATE entry.

Decisions without team sign-off: none.

Not done: nothing. If this PR times out in the queue, the first suspect is a
required-check workflow missing the merge_group trigger (0012 Consequences).
