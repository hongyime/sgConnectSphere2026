# ERD: registration, safety and durable notifications

An Event registration selects Sessions through a join table. Attendance belongs to a registration. Notifications are user-facing rows; channel deliveries carry durable transport state. Audit event and actor links are nullable so history survives relevant deletion. Keyless entities in the drawing are relationship anchors, not missing physical definitions. Safety decisions and factors are recorded in audit_logs (field_changed=safety_check); there is no physical safety_checks table.

## Read the diagram

Notation: Mermaid crow-foot ER; selected physical tables.

[Editable Mermaid source](10-erd-registration-notifications.mmd). The submission pack supplies SVG, high-resolution PNG and PDF renders with the same basename.

## Evidence

Week 4 PDF p. 63; migrations 0001, 0002_durable_notification_dispatch, 0017, 0023, 0024. Lecture references use PDF page numbers, not necessarily printed slide numbers.

As-built snapshot: main `0773a721`, 5 November 2026. Read the [scope and discrepancy inventory](README.md) before interpreting delivery completeness.
