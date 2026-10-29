Reorganise course lecture slide decks from loose docs/slides/ into the docs/slides/lecture/ subfolder, and track and populate the Week 11 client presentation slide deck.

## Task Details

- **Branch**: `docs/reorganise-lecture-slides`
- **Scope**:
  - Move 10 course lecture PDF slide decks into `docs/slides/lecture/` to keep `docs/slides/` clean and organised.
  - Track `docs/slides/presentation/Week 11 Slide Template.pptx`.
  - Populate all 17 slides of the presentation deck with comprehensive course-mandated answers: project index with PostPlan and C4 links, customer changes (most vs least impact), CFO update table with 3 concrete human-added value examples beyond AI, AI usage analysis and rework disclosures, controlling AI (Delegate, Constrain, Verify, Own), Git collaboration strategy, testing strategy with metrics table, CI/CD pipeline architecture and value case study, team contribution breakdown, and closing notes.
- **Traceability**: Course presentation and reference material hygiene; follow-up to PR #359.
- **Verification**: `python scripts/check.py` and pre-commit hooks validate cleanly.
