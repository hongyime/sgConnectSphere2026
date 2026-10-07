# 0011 - Load Inter from Google Fonts

## Status

Accepted - landing with the pull request that adds the Google Fonts
stylesheet to `frontend/index.html`. Relates to SCRUM-117.

## Context

`design.md` section 3.2 names one typeface, Inter, and the skeleton's font
stack already leads with it. Until this change nothing loaded the file, so
every user saw their system face instead. Section 11.1 recorded that gap and
asked for a decision: self-host Inter, or drop the name and accept the system
face. `CONTRIBUTING.md` also says not to add a third-party service until the
choice is written down. This file is that record.

Loading the stylesheet means every page view asks `fonts.googleapis.com` and
`fonts.gstatic.com` for the font, which sends the visitor's IP address to
Google. The team accepted that trade-off for Release 1 rather than vendoring
the font file.

## Decision

Load Inter from Google Fonts.

`frontend/index.html` preconnects to `fonts.googleapis.com` and
`fonts.gstatic.com`, then loads

```text
https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap
```

Those five weights are the ones the shared blocks use. `display=swap` lets
text paint in the system face immediately and swap to Inter when the file
arrives. No npm package is added.

Section 14 of `design.md` says a section 11 item closes when the skeleton
changes or this document is amended, and the row is then removed. The
Typeface row is removed in the same change. Section 3.2 points here.

## Alternatives considered

- **Self-host `InterVariable.woff2` under `frontend/public/fonts` with an
  `@font-face` rule.** Preferred by the reviewer of the loading change,
  because it adds no third party and no dependency. Not taken for this
  change: the weights are already served by the stylesheet, and swapping to
  a local file later does not require touching any block. Revisit if the
  privacy cost becomes unacceptable.
- **Install `@fontsource-variable/inter`.** Rejected: it is a new npm
  dependency for a file the stylesheet already provides.
- **Drop `Inter` from the stack and keep the system face.** Rejected: the
  Figma plan and `design.md` both chose Inter, and the stack already names
  it.

## Consequences

- Visitors' IP addresses are sent to Google on each page load that fetches
  the font. There is no subresource integrity hash on the stylesheet,
  because Google's CSS URL is not content-addressed.
- The app has no Content-Security-Policy yet, so the two new origins do not
  collide with one. A future policy must allow `fonts.googleapis.com` and
  `fonts.gstatic.com`, or this decision has to be replaced by self-hosting.
- Self-hosting can replace the three `<link>` tags later without changing
  any shared block.

## Reversibility

Delete the font-face links from `frontend/index.html` and either self-host
the file or remove `Inter` from the stack in `frontend/src/styles.css`. No
data migration.

## References

- `frontend/index.html` - the three `<link>` tags.
- `design.md` section 3.2 - the type rule, which points here.
- `design.md` section 14 - a resolved section 11 row is removed, not left
  marked resolved.
- SCRUM-117 - the design-language ticket this closes the typeface part of.
