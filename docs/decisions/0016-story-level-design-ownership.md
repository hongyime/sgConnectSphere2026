# 0016 - Story-level design ownership and cross-story coordination

## Status

Accepted for work moving forward, 18 October 2026.

## Decision

1. The owner of each story owns its story-specific design as well as its
   implementation. For UI work, that owner selects and updates the relevant
   Figma frames, checks the flow against the story and its test cases, and links
   the reviewed frame from the story or pull request.
2. Amareet Kaur Madas coordinates design across stories: she helps organize the
   shared Figma workspace, checks consistency with `design.md` and the shared
   frontend skeleton, and helps resolve cross-story design questions. This
   coordination role does not transfer ownership of every story's screens away
   from its story owner.
3. A story owner can ask Amareet or another teammate for design review. Shared
   patterns or changes to `design.md` should be reviewed across affected
   stories before implementation spreads the change.

## Context

ADR-017 assigns frontend implementation to story owners, while the Figma
refinement plan had referred to a singular "design owner" without saying
whether that person designed every story or coordinated shared consistency.
This distinction keeps story accountability clear while giving the team one
cross-story design contact.

## Scope and consequences

This decision applies prospectively. It does not change historical story
assignments, acceptance criteria, or prior design decisions. Jira assignees and
story estimates remain unchanged by this record. `design.md` remains the design
language authority; Figma remains a proposal until reviewed and linked to the
relevant story.
