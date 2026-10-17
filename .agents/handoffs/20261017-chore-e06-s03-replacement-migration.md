# E06-S03 migration-only release prerequisite

Split exact reviewed0020 SQL from application PR299 to follow production migration sequencing after Xiang Ying's review. Branch chore/e06-s03-replacement-migration from main c44c6af; only SQL and documentation/evidence. No application or deployment configuration changes.

Byte parity verified with PR299. Populated0019 index upgrade1/1 passed on root checkout aea9fad plus uncommitted main merge; record pins actual checkout, not migration-only HEAD. Repo hygiene/env pass; Windows158 tooling tests retain3 failures/11 errors. No production query, ledger check, migration apply or deployment action authorised/performed. Deploy owner must review/merge migration-only PR, inspect production prerequisites, apply exact file, verify ledger/index and commit sanitized record before dependent PR299 queues. Merge main into299 after migration merges to remove SQL from its diff. PR298 remains separate dependency; green root CI skips8 combined cases until real decisions module exists.

Temporary release worktree holds only this task, with tooling junction to existing root dependencies; remove after fully pushed and clean. Intentional E06S02 integration and preexisting review worktrees untouched. E11 implementation remains in task-specific stash. No story Done/Jira change.
