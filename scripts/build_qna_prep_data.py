#!/usr/bin/env python3
"""Build script to synthesize the ConnectSphere Exam Cockpit & Master Postplan.

Extracts canonical data from:
  - docs/backlog/release-1/*.md (65 stories)
  - docs/testing/tc-coverage.md (394 test cases)
  - docs/testing/defects.md (Defects D-01 to D-04)
  - docs/bdr/A-customer-clarifications.md (C-01 to C-136)
  - docs/bdr/B-team-decisions.md (T-01 to T-108)

Generates:
  - artifacts/final-qna-prep-guide.html (Self-contained Postplan HTML Web App)

Enforces:
  - Strict compliance with scripts/check_postplan_html.py
  - Absolutely zero machine-specific paths (relative paths & live GitHub/Jira URLs only)
  - Zero external runtime dependencies (inline CSS and vanilla JS)
  - Complete 65-story technical lineage & 12 High-Risk Topic Dossiers
"""
from __future__ import annotations

import html
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
BACKLOG_DIR = REPO_ROOT / "docs" / "backlog" / "release-1"
TC_COVERAGE_PATH = REPO_ROOT / "docs" / "testing" / "tc-coverage.md"
DEFECTS_PATH = REPO_ROOT / "docs" / "testing" / "defects.md"
BDR_C_PATH = REPO_ROOT / "docs" / "bdr" / "A-customer-clarifications.md"
BDR_T_PATH = REPO_ROOT / "docs" / "bdr" / "B-team-decisions.md"
OUTPUT_HTML_PATH = REPO_ROOT / "artifacts" / "final-qna-prep-guide.html"

GITHUB_REPO_URL = "https://github.com/hongyime/sgConnectSphere2026"
JIRA_BASE_URL = "https://theprawnworkspace.atlassian.net/browse"

# Canonical mapping for 65 stories to Jira keys
STORY_JIRA_MAP = {
    "E01-S01": "SCRUM-16",
    "E01-S02": "SCRUM-17",
    "E01-S03": "SCRUM-18",
    "E01-S04": "SCRUM-19",
    "E01-S08": "SCRUM-23",
    "E01-S11": "SCRUM-25",
    "E01-S12": "SCRUM-156",
    "E01-S13": "SCRUM-157",
    "E02-S01": "SCRUM-26",
    "E02-S02": "SCRUM-27",
    "E02-S03": "SCRUM-28",
    "E02-S05": "SCRUM-30",
    "E02-S07": "SCRUM-180",
    "E03-S01": "SCRUM-32",
    "E03-S02": "SCRUM-33",
    "E03-S03": "SCRUM-34",
    "E03-S05": "SCRUM-35",
    "E03-S06": "SCRUM-36",
    "E03-S07": "SCRUM-37",
    "E03-S08": "SCRUM-153",
    "E03-S09": "SCRUM-154",
    "E03-S10": "SCRUM-155",
    "E03-S11": "SCRUM-176",
    "E03-S12": "SCRUM-196",
    "E04-S02": "SCRUM-39",
    "E05-S01": "SCRUM-40",
    "E05-S02": "SCRUM-41",
    "E05-S03": "SCRUM-42",
    "E05-S04": "SCRUM-43",
    "E05-S05": "SCRUM-44",
    "E05-S06": "SCRUM-152",
    "E06-S01": "SCRUM-45",
    "E06-S02": "SCRUM-46",
    "E06-S03": "SCRUM-47",
    "E06-S04": "SCRUM-48",
    "E06-S05": "SCRUM-49",
    "E06-S06": "SCRUM-50",
    "E06-S07": "SCRUM-260",
    "E07-S01": "SCRUM-51",
    "E07-S02": "SCRUM-52",
    "E07-S03": "SCRUM-53",
    "E07-S04": "SCRUM-54",
    "E07-S05": "SCRUM-55",
    "E07-S06": "SCRUM-56",
    "E07-S07": "SCRUM-57",
    "E07-S08": "SCRUM-253",
    "E07-S09": "SCRUM-245",
    "E08-S03": "SCRUM-60",
    "E08-S04": "SCRUM-61",
    "E08-S05": "SCRUM-62",
    "E08-S06": "SCRUM-158",
    "E09-S01": "SCRUM-63",
    "E09-S02": "SCRUM-64",
    "E09-S03": "SCRUM-65",
    "E09-S04": "SCRUM-66",
    "E09-S05": "SCRUM-67",
    "E09-S06": "SCRUM-68",
    "E09-S07": "SCRUM-69",
    "E10-S01": "SCRUM-70",
    "E10-S02": "SCRUM-71",
    "E10-S04": "SCRUM-73",
    "E10-S05": "SCRUM-74",
    "E11-S01": "SCRUM-75",
    "E14-S02": "SCRUM-86",
    "E14-S03": "SCRUM-197",
}

# Technical architecture metadata per epic / story
STORY_TECH_MAP = {
    # E01: Access & Identity
    "E01-S01": {
        "route": "POST /api/auth/session, POST /api/auth/recover",
        "controller": "backend/src/modules/accessControl/sessions.ts",
        "migration": "0003_auth_sessions.sql, 0007_password_reset_delivery.sql",
        "component": "frontend/src/features/accessControl/LoginPage.tsx",
        "spoken": "Login verifies bcrypt credentials, creates an HTTP-only secure session cookie, and triggers automatic account lockout after 5 consecutive failed attempts.",
        "limit": "Lockout is account-specific, reset via email token with 15-minute expiration; failed login returns generic credentials error without disclosing email existence.",
        "evidence_pr": "PR #95 (Auth session cookies & lockout recovery)",
        "code_link": "backend/src/modules/accessControl/sessions.ts",
    },
    "E01-S02": {
        "route": "GET /api/events, GET /api/events?id=<id>",
        "controller": "backend/src/modules/eventVisibility/service.ts",
        "migration": "0002_event_visibility.sql",
        "component": "frontend/src/features/organiser/Organiser.tsx",
        "spoken": "Organiser event queries enforce strict tenant isolation via client_organisation_id checks at the database query layer.",
        "limit": "Cross-organisation event requests immediately return 403 Forbidden without disclosing event existence.",
        "evidence_pr": "PR #41 (Organiser tenant isolation)",
        "code_link": "backend/src/modules/eventVisibility/service.ts",
    },
    "E01-S03": {
        "route": "GET /api/attendee/events?open=1",
        "controller": "backend/src/modules/attendeeVisibility/service.ts",
        "migration": "0004_attendee_visibility.sql",
        "component": "frontend/src/features/attendee/EventRegistration.tsx",
        "spoken": "Attendees query public events through a sanitised projection that strictly hides internal notes, budgets, coordinator assignments, and pending arrangements.",
        "limit": "Only Confirmed events with open registration windows appear on the attendee catalogue.",
        "evidence_pr": "PR #42 (Attendee public projection sanitisation)",
        "code_link": "backend/src/modules/attendeeVisibility/service.ts",
    },
    "E01-S04": {
        "route": "GET /api/account/profile, PATCH /api/account/profile",
        "controller": "backend/src/modules/accessControl/profile.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/accessControl/ProfileForm.tsx",
        "spoken": "Users can edit their contact name and phone number; client organisation membership is displayed read-only per team decision T-61.",
        "limit": "Organisation editing is deferred to Release 2 to protect tenancy and audit attribution.",
        "evidence_pr": "PR #47 (Profile details update & T-61 read-only org)",
        "code_link": "backend/src/modules/accessControl/profile.ts",
    },
    "E01-S08": {
        "route": "POST /api/auth/register, POST /api/auth/verify",
        "controller": "backend/src/modules/accessControl/registration.ts",
        "migration": "0006_verification_tokens.sql",
        "component": "frontend/src/features/accessControl/RegisterForm.tsx",
        "spoken": "User registration creates an unverified account, normalises case-insensitive email, and dispatches a verification token via transactional outbox.",
        "limit": "Unverified accounts cannot sign in; duplicate email registration returns a generic success response to prevent email harvesting.",
        "evidence_pr": "PR #43 (User registration & token verification)",
        "code_link": "backend/src/modules/accessControl/registration.ts",
    },
    "E01-S11": {
        "route": "POST /api/account/deactivate",
        "controller": "backend/src/modules/accessControl/deactivation.ts",
        "migration": "0003_auth_sessions.sql, 0010_audit_logs_immutable.sql",
        "component": "frontend/src/features/accessControl/ProfileForm.tsx",
        "spoken": "Account deactivation terminates all active sessions in auth_sessions and blocks further sign-ins while preserving immutable historical audit records per T-09.",
        "limit": "Deactivation is soft-delete; personal data is retained for audit logging rather than hard-deleted.",
        "evidence_pr": "PR #93 (Account deactivation cascade)",
        "code_link": "backend/src/modules/accessControl/deactivation.ts",
    },
    "E01-S12": {
        "route": "GET /api/coordinator/events",
        "controller": "backend/src/modules/eventVisibility/service.ts",
        "migration": "0008_coordinator_assignment.sql",
        "component": "frontend/src/features/coordinator/CoordinatorWorkspace.tsx",
        "spoken": "Coordinators only see events explicitly assigned to them, preventing accidental cross-coordinator interference in planning workspaces.",
        "limit": "Lead Coordinators have a separate oversight route; standard Coordinators receive 403 on unassigned events.",
        "evidence_pr": "PR #232 (Role queues & coordinator isolation)",
        "code_link": "backend/src/modules/eventVisibility/service.ts",
    },
    "E01-S13": {
        "route": "POST /api/auth/session (role routing)",
        "controller": "backend/src/modules/accessControl/sessions.ts",
        "migration": "0012_user_role_enum_additions.sql",
        "component": "frontend/src/app/routes.tsx",
        "spoken": "Authentication router directs Event Coordinator Lead and Safety Officer to dedicated workspaces upon sign-in based on user_roles membership.",
        "limit": "Lead and Safety Officer accounts are seeded with distinct credentials; multi-role switching occurs via explicit role selection.",
        "evidence_pr": "PR #232 (Lead & Safety Officer role onboarding)",
        "code_link": "backend/src/modules/accessControl/sessions.ts",
    },
    # E02: Event Request Submission
    "E02-S01": {
        "route": "POST /api/events",
        "controller": "backend/src/modules/eventLifecycle/service.ts",
        "migration": "0001_connectsphere_schema.sql, 0005_event_request_fields.sql",
        "component": "frontend/src/features/organiser/OrganiserRequestFlow.tsx",
        "spoken": "Event Organiser submits an event request with all 10 mandatory fields; equipment and layout accept an explicit 'none required' per C-36/C-59.",
        "limit": "Submission moves the request from Draft to Under Review (or Unassigned Queue under C-69).",
        "evidence_pr": "PR #29 (Event request submission slice)",
        "code_link": "backend/src/modules/eventLifecycle/service.ts",
    },
    "E02-S02": {
        "route": "POST /api/events?draft=1, PATCH /api/events?draft=1",
        "controller": "backend/src/modules/eventLifecycle/service.ts",
        "migration": "0005_event_request_fields.sql",
        "component": "frontend/src/features/organiser/OrganiserDrafts.tsx",
        "spoken": "Organisers can save partially filled event requests as Drafts without triggering validation rules or coordinator assignment.",
        "limit": "Drafts remain private to the authoring organiser until formal submission.",
        "evidence_pr": "PR #79 (Organiser draft request persistence)",
        "code_link": "backend/src/modules/eventLifecycle/service.ts",
    },
    "E02-S03": {
        "route": "POST /api/events (accessibility tags), GET /api/venues/search?accessibility=...",
        "controller": "backend/src/modules/venueBooking/matchAccessibility.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/organiser/OrganiserRequestFlow.tsx",
        "spoken": "Accessibility needs are captured as structured tags plus an unparsed free-text note; structured tags feed advisory venue suitability checks.",
        "limit": "Per T-60, accessibility matching is enforced in SQL queries and unit tested; coordinator UI integration is structured for Release 2.",
        "evidence_pr": "PR #87 (Accessibility matching primitives)",
        "code_link": "backend/src/modules/venueBooking/matchAccessibility.ts",
    },
    "E02-S05": {
        "route": "POST /api/events?copy=1 (KNOWN DEFECT D-04 · Single Genuine Open Defect at HEAD)",
        "controller": "backend/src/modules/eventLifecycle/service.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/organiser/CompletedEvents.tsx",
        "spoken": "Intended to duplicate completed event requirements into a fresh draft with cleared dates per T-90/T-99; tracked as open defect D-04. Branch feature/SCRUM-30-reuse-event-details was deliberately withheld from main to prevent shallow copy corruption of child session envelopes per ADR-018.",
        "limit": "Open defect D-04: Organiser UI lacks the copy button and API copy endpoint is not present on main; unmerged to protect multi-session envelope integrity per ADR-018.",
        "evidence_pr": "Tracked in docs/testing/defects.md (SCRUM-259, SCRUM-30)",
        "code_link": "backend/src/modules/eventLifecycle/service.ts",
    },
    "E02-S07": {
        "route": "POST /api/events, PATCH /api/events (validation)",
        "controller": "backend/src/modules/eventLifecycle/dateHorizon.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/organiser/OrganiserRequestFlow.tsx",
        "spoken": "Enforces a strict 2-year forward scheduling horizon calculated against Singapore Standard Time (T-87), rejecting dates past 24 months.",
        "limit": "No minimum lead time is enforced per customer clarification C-71; coordinator evaluates feasibility.",
        "evidence_pr": "PR #389 (Event date horizon validation)",
        "code_link": "backend/src/modules/eventLifecycle/dateHorizon.ts",
    },
    # E03: Review & Coordination Status
    "E03-S01": {
        "route": "POST /api/events (auto-assignment on main)",
        "controller": "backend/src/modules/eventLifecycle/repository.ts",
        "migration": "0008_coordinator_assignment.sql",
        "component": "frontend/src/features/coordinator/CoordinatorWorkspace.tsx",
        "spoken": "On submission, system assigns the coordinator with the lowest active event workload (T-14); superseded by Lead Queue in C-69.",
        "limit": "Done story that stays Done per T-74; Lead Queue replacement is tracked under E03-S08 and defect D-01.",
        "evidence_pr": "PR #141 (Coordinator auto-assignment)",
        "code_link": "backend/src/modules/eventLifecycle/repository.ts",
    },
    "E03-S02": {
        "route": "POST /api/events?action=request_clarification",
        "controller": "backend/src/modules/eventLifecycle/clarification.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/coordinator/RequestClarification.tsx",
        "spoken": "Coordinator returns a submitted request to Awaiting Clarification with specific questions, notifying the Organiser.",
        "limit": "Organiser responds to clarifications; request status moves back to Under Review upon resubmission.",
        "evidence_pr": "PR #147 (Request clarification flow)",
        "code_link": "backend/src/modules/eventLifecycle/clarification.ts",
    },
    "E03-S03": {
        "route": "POST /api/events?action=approve, POST /api/events?action=reject",
        "controller": "backend/src/modules/eventLifecycle/decision.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/coordinator/DecisionPanel.tsx",
        "spoken": "Coordinator approves or rejects a request; approval transitions status to Approved (ready for venue planning), rejection records mandatory reasons.",
        "limit": "Rejected events are terminal unless an administrative appeal is handled offline.",
        "evidence_pr": "PR #147 (Review approval & rejection decisions)",
        "code_link": "backend/src/modules/eventLifecycle/decision.ts",
    },
    "E03-S05": {
        "route": "GET /api/events?id=<id>&timeline=1",
        "controller": "backend/src/modules/eventLifecycle/status.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/events/EventDetails.tsx",
        "spoken": "Displays the linear progression of event lifecycle statuses from Submission to Confirmed/Completed with timestamps.",
        "limit": "Organiser and Coordinator see identical lifecycle stage history with private coordinator notes redacted.",
        "evidence_pr": "PR #147 (Lifecycle timeline presentation)",
        "code_link": "backend/src/modules/eventLifecycle/status.ts",
    },
    "E03-S06": {
        "route": "GET /api/events?id=<id>&comments=1, POST /api/events?id=<id>&comments=1",
        "controller": "backend/src/modules/eventVisibility/service.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/events/EventDetails.tsx",
        "spoken": "Provides bidirectional planning dialogue between Coordinator and Organiser during Under Review and Planning.",
        "limit": "Comments are immutable once posted and audit-stamped with author and timestamp.",
        "evidence_pr": "PR #166 (Planning discussion comments)",
        "code_link": "backend/src/modules/eventVisibility/service.ts",
    },
    "E03-S07": {
        "route": "PATCH /api/events?id=<id>",
        "controller": "backend/src/modules/eventVisibility/service.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/coordinator/CoordinatorWorkspace.tsx",
        "spoken": "Allows Coordinator to adjust event parameters post-approval; Organiser edits to dates or attendance route through E10 change requests per T-16.",
        "limit": "Editing after venue or equipment arrangements are confirmed triggers reconfirmation flags under E10-S02.",
        "evidence_pr": "PR #176 (Post-approval editing splits)",
        "code_link": "backend/src/modules/eventVisibility/service.ts",
    },
    "E03-S08": {
        "route": "POST /api/events?assign=1 (Lead Queue Assignment; shipped via SCRUM-261 #450/#453; logged D-01 in 6 Nov audit)",
        "controller": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
        "migration": "0027_event_assignment_actor.sql",
        "component": "frontend/src/features/roleQueues/RoleQueues.tsx",
        "spoken": "Unassigned request queue for Event Coordinator Lead to assign submissions directly per C-69/T-83; logged as D-01 in morning audit and safely shipped to main via SCRUM-261 (PR #450, #453).",
        "limit": "Historical defect D-01: Auto-assign algorithm was active during morning audit; evening PR #450 & #453 (SCRUM-261) removed auto-assign and restored Lead queue with assigned_by tracking. 31 passing tests.",
        "evidence_pr": "PR #450 (commit a8f2d879), PR #453 (commit ced06372), PR #454 (commit b5370843)",
        "code_link": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
    },
    "E03-S09": {
        "route": "POST /api/events?reassign=1&by_lead=1 (Direct Lead Reassignment; shipped via SCRUM-261 #450/#453; logged D-02 in 6 Nov audit)",
        "controller": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
        "migration": "0027_event_assignment_actor.sql",
        "component": "frontend/src/features/roleQueues/RoleQueues.tsx",
        "spoken": "Lead reassignment of active events without requiring incoming coordinator acceptance per T-83; logged as D-02 in morning audit and safely shipped to main via SCRUM-261 (PR #450, #453).",
        "limit": "Historical defect D-02: Endpoint returned 403 on main during morning audit; evening PR #450 & #453 implemented full direct coordinator reassignment with audit reason capture.",
        "evidence_pr": "PR #450 (commit a8f2d879), PR #453 (commit ced06372)",
        "code_link": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
    },
    "E03-S10": {
        "route": "GET /api/internal/lead/oversight (Lead Oversight & Workload; shipped via SCRUM-261 #450/#453; logged D-03 in 6 Nov audit)",
        "controller": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
        "migration": "0027_event_assignment_actor.sql",
        "component": "frontend/src/features/roleQueues/RoleQueues.tsx",
        "spoken": "Lead global dashboard overseeing active coordinators and workload distributions; logged as D-03 in morning audit and safely shipped to main via SCRUM-261 (PR #450, #453).",
        "limit": "Historical defect D-03: Endpoint returned 403 during morning audit; evening PR #450 & #453 restored Lead oversight dashboard with live assignment counts.",
        "evidence_pr": "PR #450 (commit a8f2d879), PR #453 (commit ced06372)",
        "code_link": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
    },
    "E03-S11": {
        "route": "POST /api/events?reassign=1 (coordinator peer)",
        "controller": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
        "migration": "0008_coordinator_assignment.sql",
        "component": "frontend/src/features/coordinator/CoordinatorWorkspace.tsx",
        "spoken": "Coordinator peer-initiated reassignment requiring incoming coordinator acceptance; Done story preserved under T-74.",
        "limit": "Historically implemented in Sprint 2 under T-15 before C-69/T-83 established Lead-only reassignment authority.",
        "evidence_pr": "PR #176 (Peer coordinator reassignment)",
        "code_link": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
    },
    "E03-S12": {
        "route": "PATCH /api/events (UI alert standardisation)",
        "controller": "backend/src/modules/eventVisibility/service.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/coordinator/CoordinatorWorkspace.tsx",
        "spoken": "Replaces plain status paragraphs with standard accessible Alert component with role='status' across coordinator edit actions (T-97).",
        "limit": "Pure frontend accessibility and UX standardisation story; retains existing validation and error handling.",
        "evidence_pr": "PR #303 (Shared Alert component for coordinator editing)",
        "code_link": "frontend/src/features/coordinator/CoordinatorWorkspace.tsx",
    },
    # E04: Programme & Sessions
    "E04-S02": {
        "route": "GET /api/events?sessions=1, POST /api/events?sessions=1, DELETE /api/events?sessions=1",
        "controller": "backend/src/modules/eventSessions/repository.ts",
        "migration": "0014_event_sessions.sql",
        "component": "frontend/src/features/organiser/SessionEditor.tsx",
        "spoken": "Multi-session event management: creates child sessions under an event envelope per C-107/T-79; venue bookings and equipment attach to sessions.",
        "limit": "When session deletion leaves only 1 session, T-108 sync trigger automatically aligns event dates and attendance to match.",
        "evidence_pr": "PR #408 (Session authoring & screen management)",
        "code_link": "backend/src/modules/eventSessions/repository.ts",
    },
    # E05: Venue Catalogue & Availability
    "E05-S01": {
        "route": "GET /api/venues, POST /api/venues, PATCH /api/venues?id=<id>",
        "controller": "backend/src/modules/venueBooking/catalogue.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/venue/VenueCatalogue.tsx",
        "spoken": "Venue Staff manages venue inventory, capacities, layout configurations, and accessibility features.",
        "limit": "Retiring a venue is blocked if future active bookings or holds exist (T-18).",
        "evidence_pr": "PR #48 (Venue catalogue management)",
        "code_link": "backend/src/modules/venueBooking/catalogue.ts",
    },
    "E05-S02": {
        "route": "GET /api/venues?suitable=1",
        "controller": "backend/src/modules/venueBooking/suitability.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/venue/VenueSuitability.tsx",
        "spoken": "Evaluates venue suitability based on layout capacity, accessibility features, and opening hours; returns advisory mismatch flags (T-63).",
        "limit": "Suitability is purely advisory; Venue Staff retain final authority to accept requests even if flagged unsuitable (C-06, E06-S02).",
        "evidence_pr": "PR #71 (Venue suitability evaluation engine)",
        "code_link": "backend/src/modules/venueBooking/suitability.ts",
    },
    "E05-S03": {
        "route": "GET /api/venues?calendar=1&month=...",
        "controller": "backend/src/modules/venueBooking/calendar.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/venue/VenueCalendar.tsx",
        "spoken": "Renders venue calendar in Singapore timezone displaying Free, Tentative Hold, Pending Request, Confirmed Booking, and Blocked windows.",
        "limit": "Occupancy display includes per-venue setup and turnaround buffers (T-66).",
        "evidence_pr": "PR #89 (Venue calendar Singapore timezone grid)",
        "code_link": "backend/src/modules/venueBooking/calendar.ts",
    },
    "E05-S04": {
        "route": "POST /api/venues?block=1",
        "controller": "backend/src/modules/venueBooking/blocks.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/venue/VenueBlockout.tsx",
        "spoken": "Venue Staff creates maintenance and unavailability blocks with standard reasons (maintenance, renovation, safety concern).",
        "limit": "Sprint 2 implementation refused blocks overlapping bookings; superseded by E05-S06 which allows blocks and flags overlaps as Conflicting.",
        "evidence_pr": "PR #151 (Venue maintenance blocks)",
        "code_link": "backend/src/modules/venueBooking/blocks.ts",
    },
    "E05-S05": {
        "route": "PATCH /api/venues?buffers=1",
        "controller": "backend/src/modules/venueBooking/catalogue.ts",
        "migration": "0011_venue_setup_turnaround_buffers.sql, 0016_venue_buffer_write_guard.sql",
        "component": "frontend/src/features/venue/VenueForm.tsx",
        "spoken": "Venue Staff configures per-venue whole-minute setup and turnaround buffers (C-65, T-66), expanding booking occupancy windows.",
        "limit": "Exclusion constraints in Postgres enforce [start - setup, end + turnaround]; maintenance blocks do not get buffered (T-80).",
        "evidence_pr": "PR #234 (Per-venue setup/turnaround buffers)",
        "code_link": "backend/src/modules/venueBooking/catalogue.ts",
    },
    "E05-S06": {
        "route": "POST /api/venues?unavailability=1, PATCH /api/venues?unavailability=1",
        "controller": "backend/src/modules/venueBooking/blocks.ts",
        "migration": "0025_venue_unavailability.sql",
        "component": "frontend/src/features/venue/VenueBlockout.tsx",
        "spoken": "A venue block can be created over confirmed bookings without being blocked: the block saves, overlapping bookings become Conflicting, and confirmed events return to Planning for resolution (C-119, T-80, T-81).",
        "limit": "Block edits retain full history (T-91); lifting blocks notifies affected coordinators without silently resurrecting replaced bookings.",
        "evidence_pr": "PR #348 (Venue unavailability lifecycle & conflict flags)",
        "code_link": "backend/src/modules/venueBooking/blocks.ts",
    },
    # E06: Venue Search & Booking
    "E06-S01": {
        "route": "GET /api/venues/search?q=...",
        "controller": "backend/src/modules/venueBooking/search.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/venue/VenueSearch.tsx",
        "spoken": "Searches active venues by keyword, location, and capacity; returns all matching venues with suitability mismatch badges (T-63).",
        "limit": "Search results factor in setup/turnaround buffers to determine real-time availability for the requested time slot.",
        "evidence_pr": "PR #92 (Venue search with mismatch badges)",
        "code_link": "backend/src/modules/venueBooking/search.ts",
    },
    "E06-S02": {
        "route": "POST /api/venues/suitability-check",
        "controller": "backend/src/modules/venueBooking/suitability.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/venue/VenueSuitability.tsx",
        "spoken": "Checks venue operating hours, headcount against layout capacities, and accessibility needs; marks venues Unsuitable if outside hours (T-77).",
        "limit": "Unsuitable venues can still be requested by coordinators; suitability failure reasons are presented to Venue Staff for human discretion.",
        "evidence_pr": "PR #178 (Operating hours & suitability check)",
        "code_link": "backend/src/modules/venueBooking/suitability.ts",
    },
    "E06-S03": {
        "route": "POST /api/venues/bookings, POST /api/venues/bookings?action=withdraw",
        "controller": "backend/src/modules/venueBooking/bookingRequests.ts",
        "migration": "0019_venue_bookings_contract.sql, 0020_released_booking_replacement_retry.sql",
        "component": "frontend/src/features/venue/VenueBookingForm.tsx",
        "spoken": "Coordinator requests venue booking or withdraws pending request; multiple bookings allowed per event (T-68), first request transitions to Planning. Guards against booking race conditions.",
        "limit": "Withdrawal locks venue row FOR NO KEY UPDATE then booking FOR UPDATE (T-95); Released bookings permit fresh replacement requests (T-96).",
        "evidence_pr": "PR #298 (Venue booking requests & withdrawal concurrency)",
        "code_link": "backend/src/modules/venueBooking/bookingRequests.ts",
    },
    "E06-S04": {
        "route": "POST /api/venues/bookings?action=decide (approve/reject)",
        "controller": "backend/src/modules/venueBooking/decisions.ts",
        "migration": "0019_venue_bookings_contract.sql",
        "component": "frontend/src/features/venue/BookingRequests.tsx",
        "spoken": "Venue Staff approves or rejects booking requests with optional alternative venue suggestions (C-08); writes immutable audit entries (T-76).",
        "limit": "Approval serializes via FOR UPDATE locks, rechecking that the buffered window has not been claimed concurrently (T-100).",
        "evidence_pr": "PR #298 (Staff booking decisions & suggestion chaining)",
        "code_link": "backend/src/modules/venueBooking/decisions.ts",
    },
    "E06-S05": {
        "route": "POST /api/venues/holds, POST /api/venues/holds?action=extend",
        "controller": "backend/src/modules/venueBooking/holds.ts",
        "migration": "0013_tentative_venue_holds.sql",
        "component": "frontend/src/features/venue/TentativeHolds.tsx",
        "spoken": "Coordinator places tentative holds occupying buffered windows; shipped code follows T-92 (48h default, 1h-14d custom, unlimited logged extensions).",
        "limit": "Hold ceases occupying venue immediately at clock_timestamp() (T-92); converting hold to booking request ends expiry timer (T-78).",
        "evidence_pr": "PR #245 (Tentative venue holds & T-92 expiry)",
        "code_link": "backend/src/modules/venueBooking/holds.ts",
    },
    "E06-S06": {
        "route": "POST /api/venues/bookings (concurrency guard)",
        "controller": "backend/src/modules/venueBooking/decisions.ts",
        "migration": "0016_venue_buffer_write_guard.sql",
        "component": "frontend/src/features/venue/VenueBookingForm.tsx",
        "spoken": "Prevents booking race and double-booking: PostgreSQL exclusion constraint blocks overlapping holds or bookings across buffered occupancy windows (T-100).",
        "limit": "Losing concurrent request returns 409 Conflict with clear buffered window timeframe without leaking competing event titles (T-102).",
        "evidence_pr": "PR #378 (Venue booking exclusion guard & concurrency tests)",
        "code_link": "backend/src/modules/venueBooking/decisions.ts",
    },
    "E06-S07": {
        "route": "POST /api/venues/bookings?action=set_primary",
        "controller": "backend/src/modules/venueBooking/bookingPrimary.ts",
        "migration": "0019_venue_bookings_contract.sql",
        "component": "frontend/src/features/coordinator/CoordinatorWorkspace.tsx",
        "spoken": "First confirmed venue automatically becomes primary; coordinator may designate another confirmed venue as primary (T-78).",
        "limit": "Pending or unconfirmed venues cannot be marked primary; primary designation dictates public attendee display (E09-S01).",
        "evidence_pr": "PR #421 (Primary venue selection & attendee routing)",
        "code_link": "backend/src/modules/venueBooking/bookingPrimary.ts",
    },
    # E07: Equipment & Technical Support
    "E07-S01": {
        "route": "GET /api/equipment, POST /api/equipment",
        "controller": "backend/src/modules/equipmentSupport/catalogue.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/support/EquipmentCatalogue.tsx",
        "spoken": "Technical Support Staff maintains equipment inventory, asset tags, total quantities, and operational condition.",
        "limit": "Quantity updates cannot reduce total stock below the maximum concurrently reserved quantity across active events.",
        "evidence_pr": "PR #212 (Equipment inventory catalogue)",
        "code_link": "backend/src/modules/equipmentSupport/catalogue.ts",
    },
    "E07-S02": {
        "route": "GET /api/equipment?requests=1, POST /api/equipment?requests=1",
        "controller": "backend/src/modules/equipmentSupport/requests.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/support/EquipmentRequests.tsx",
        "spoken": "Coordinator requests equipment quantities; technical support staff reviews requests during planning stage (C-22).",
        "limit": "Requests are validated against inventory item types and can be edited prior to reservation.",
        "evidence_pr": "PR #215 (Equipment request workflows)",
        "code_link": "backend/src/modules/equipmentSupport/requests.ts",
    },
    "E07-S03": {
        "route": "GET /api/equipment/availability?date=...",
        "controller": "backend/src/modules/equipmentSupport/availability.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/support/EquipmentAvailability.tsx",
        "spoken": "Calculates free equipment quantities by subtracting overlapping active reservations from total stock for a target time window.",
        "limit": "Checked on date/time only; no physical transit or logistics buffer constraints between venues (C-07, C-20).",
        "evidence_pr": "PR #221 (Equipment availability calculation)",
        "code_link": "backend/src/modules/equipmentSupport/availability.ts",
    },
    "E07-S04": {
        "route": "POST /api/equipment/reservations",
        "controller": "backend/src/modules/equipmentSupport/reservations.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/support/EquipmentReservations.tsx",
        "spoken": "Reserves equipment stock against requests; partial reservations are allowed in planning, but any shortfall blocks event confirmation (T-24).",
        "limit": "Atomic SQL decrement serialized under FOR UPDATE lock on the equipment inventory row prevents stock overselling.",
        "evidence_pr": "PR #224 (Equipment reservation transactions)",
        "code_link": "backend/src/modules/equipmentSupport/reservations.ts",
    },
    "E07-S05": {
        "route": "POST /api/equipment?action=unavailability",
        "controller": "backend/src/modules/equipmentSupport/unavailability.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/support/EquipmentUnavailability.tsx",
        "spoken": "Marks damaged or servicing equipment unavailable, reducing bookable pool; notifies coordinators of affected reservations.",
        "limit": "Unavailability periods validate that existing confirmed reservations are not silently cancelled without notification.",
        "evidence_pr": "PR #225 (Equipment maintenance & unavailability)",
        "code_link": "backend/src/modules/equipmentSupport/unavailability.ts",
    },
    "E07-S06": {
        "route": "POST /api/equipment/support-requests",
        "controller": "backend/src/modules/equipmentSupport/supportRequests.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/coordinator/TechnicalSupport.tsx",
        "spoken": "Coordinator records that an event requires on-site technical staff presence during setup or live operation (T-23).",
        "limit": "Technical support request is mandatory to fulfill readiness if the organiser requested technician presence.",
        "evidence_pr": "PR #227 (Technical support staffing requests)",
        "code_link": "backend/src/modules/equipmentSupport/supportRequests.ts",
    },
    "E07-S07": {
        "route": "POST /api/equipment/support-requests?action=assign",
        "controller": "backend/src/modules/equipmentSupport/staffAssignments.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/support/TechnicianStaffing.tsx",
        "spoken": "Assigns technical staff to support requests; PR #239 fixed 40P01 deadlocks by enforcing Request FOR UPDATE then User FOR NO KEY UPDATE.",
        "limit": "Technicians cannot be assigned to overlapping support requests; race condition verified via 25-round concurrent test in CI.",
        "evidence_pr": "PR #239 (Technician deadlock fix & 40P01 exclusion resolution)",
        "code_link": "backend/src/modules/equipmentSupport/staffAssignments.ts",
    },
    "E07-S08": {
        "route": "GET /api/equipment?sessions=1, POST /api/equipment?sessions=1",
        "controller": "backend/src/modules/equipmentSupport/requests.ts",
        "migration": "0014_event_sessions.sql",
        "component": "frontend/src/features/support/EquipmentRequests.tsx",
        "spoken": "Links equipment requests and reservations directly to child Sessions per C-107/T-79; free quantities evaluated per session timeframe.",
        "limit": "Multi-session events require session association; single-session events automatically infer the parent session.",
        "evidence_pr": "PR #418 (Per-session equipment reservations)",
        "code_link": "backend/src/modules/equipmentSupport/requests.ts",
    },
    "E07-S09": {
        "route": "POST /api/venues?task=staffing&reconfirm=list, POST ... reconfirm",
        "controller": "backend/src/modules/equipmentSupport/staffAssignments.ts",
        "migration": "0026_support_reconfirmation.sql",
        "component": "frontend/src/features/support/SupportReconfirmation.tsx",
        "spoken": "Event date changes flag assigned technical staff for reconfirmation; moving staff shifts their schedule and triggers auto safety review (T-104).",
        "limit": "Reconfirmation is refused with 409 if an assigned technician has a clash at the new event time.",
        "evidence_pr": "PR #424 (Technical staff date reconfirmation)",
        "code_link": "backend/src/modules/equipmentSupport/staffAssignments.ts",
    },
    # E08: Readiness & Confirmation
    "E08-S03": {
        "route": "GET /api/events?readiness=1, POST /api/events?action=submit_safety_review",
        "controller": "backend/src/modules/eventReadiness/readiness.ts",
        "migration": "0001_connectsphere_schema.sql, 0017_event_safety_review_status.sql",
        "component": "frontend/src/features/coordinator/EventReadiness.tsx",
        "spoken": "Coordinator inspects readiness checklist; first-time planning requires manual coordinator submission to enter Safety Review (C-70, T-71).",
        "limit": "All venue bookings must be Confirmed and technical requirements fulfilled with zero shortfall before submission is enabled.",
        "evidence_pr": "PR #283 (Event readiness & manual Safety Review submission)",
        "code_link": "backend/src/modules/eventReadiness/readiness.ts",
    },
    "E08-S04": {
        "route": "POST /api/events?action=revert_to_planning",
        "controller": "backend/src/modules/eventReadiness/autoSafetyReview.ts",
        "migration": "0017_event_safety_review_status.sql",
        "component": "frontend/src/features/coordinator/CoordinatorWorkspace.tsx",
        "spoken": "Coordinator manually reverts Confirmed event to Planning; also auto-triggered on venue loss (T-81); re-enters Safety Review automatically once ready (T-82).",
        "limit": "Reversion leaves arrangements intact but marks affected items for reconfirmation; event cannot re-confirm without clearing flags.",
        "evidence_pr": "PR #385 (Event reversion & automatic Safety Review re-entry)",
        "code_link": "backend/src/modules/eventReadiness/autoSafetyReview.ts",
    },
    "E08-S05": {
        "route": "POST /api/events?action=complete",
        "controller": "backend/src/modules/eventLifecycle/completion.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/events/EventCompletion.tsx",
        "spoken": "Transitions event to Completed once all sessions finish, or allows Coordinator early completion once the final session starts (T-26).",
        "limit": "Terminal state: pending change requests are marked Obsolete (T-88); event can no longer accept edits, bookings, or registrations.",
        "evidence_pr": "PR #337 (Event completion & obsolete change cleanup)",
        "code_link": "backend/src/modules/eventLifecycle/completion.ts",
    },
    "E08-S06": {
        "route": "POST /api/internal/safety/review?action=decide (approve/request_changes)",
        "controller": "backend/src/modules/eventReadiness/safetyReturn.ts",
        "migration": "0017_event_safety_review_status.sql",
        "component": "frontend/src/features/roleQueues/SafetyReview.tsx",
        "spoken": "Safety Officer assesses event safety factors; approval directly transitions event to Confirmed per T-107 without a second coordinator click.",
        "limit": "Rejection or change requests return event to Planning with mandatory comments; coordinator must adjust arrangements and resubmit.",
        "evidence_pr": "PR #392 (Safety Officer decision workflow & factor checklist)",
        "code_link": "backend/src/modules/eventReadiness/safetyReturn.ts",
    },
    # E09: Attendee Registration
    "E09-S01": {
        "route": "GET /api/attendee/events?registration=1, POST /api/attendee/events?registration=1",
        "controller": "backend/src/modules/attendeeRegistration/service.ts",
        "migration": "0001_connectsphere_schema.sql, 0024_registration_sessions.sql",
        "component": "frontend/src/features/attendee/EventRegistration.tsx",
        "spoken": "Attendees register for confirmed events selecting one or more sessions within attendee capacity limits (T-85); enforces 1 active registration per account per event.",
        "limit": "Guest registrations prohibited (C-35); registrations validate open registration window and pre-fill authenticated profile details.",
        "evidence_pr": "PR #362 (Attendee registration & session multi-select)",
        "code_link": "backend/src/modules/attendeeRegistration/service.ts",
    },
    "E09-S02": {
        "route": "POST /api/attendee/events?registration=1 (capacity check)",
        "controller": "backend/src/modules/attendeeRegistration/capacity.ts",
        "migration": "0024_registration_sessions.sql",
        "component": "frontend/src/features/organiser/EventRegistrations.tsx",
        "spoken": "Enforces both per-session layout capacity and combined attendee capacity; over-capacity submissions route to Pending for Organiser review (T-85).",
        "limit": "Parent event row locked FOR UPDATE during seat decrement to serialize concurrent registrations against race conditions.",
        "evidence_pr": "PR #362 (Dual capacity enforcement & Pending review state)",
        "code_link": "backend/src/modules/attendeeRegistration/capacity.ts",
    },
    "E09-S03": {
        "route": "PATCH /api/events?registration_dates=1",
        "controller": "backend/src/modules/attendeeRegistration/service.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/organiser/RegistrationPeriod.tsx",
        "spoken": "Organiser sets registration open/close dates and optional withdrawal deadline (C-24, C-44); setting close after start returns 428 Precondition.",
        "limit": "428 requires explicit confirmLateClose: true override to prevent accidental post-start registration windows.",
        "evidence_pr": "PR #365 (Registration period configuration & 428 guard)",
        "code_link": "backend/src/modules/attendeeRegistration/service.ts",
    },
    "E09-S04": {
        "route": "POST /api/attendee/events?waitlist=1",
        "controller": "backend/src/modules/attendeeRegistration/capacity.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/attendee/WaitingList.tsx",
        "spoken": "When combined attendee capacity is full, attendees join event-level waitlist (T-98); when a seat frees, all waitlisted are notified (C-23, T-46).",
        "limit": "First-come claim race on freed seat: no automated FIFO auto-promotion; claiming converts waitlist row to registered.",
        "evidence_pr": "PR #394 (Event-level waitlist & broadcast notification claim)",
        "code_link": "backend/src/modules/attendeeRegistration/capacity.ts",
    },
    "E09-S05": {
        "route": "POST /api/attendee/events?action=withdraw",
        "controller": "backend/src/modules/attendeeRegistration/service.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/attendee/EventRegistration.tsx",
        "spoken": "Attendees can withdraw before the withdrawal deadline; withdrawal frees session capacity and notifies waitlisted attendees.",
        "limit": "Withdrawals past the deadline are refused; Organisers can manually override withdrawals if contacted offline.",
        "evidence_pr": "PR #370 (Attendee registration withdrawal)",
        "code_link": "backend/src/modules/attendeeRegistration/service.ts",
    },
    "E09-S06": {
        "route": "POST /api/events/attendance?mark=1",
        "controller": "backend/src/modules/eventAttendance/service.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/coordinator/EventAttendance.tsx",
        "spoken": "Coordinators mark attendee check-in status (Attended, No-Show) on event day; supports live attendance tracking.",
        "limit": "Attendance records are restricted to confirmed attendees and exportable for post-event reporting.",
        "evidence_pr": "PR #350 (Live event day attendance check-in)",
        "code_link": "backend/src/modules/eventAttendance/service.ts",
    },
    "E09-S07": {
        "route": "GET /api/events?registrations=1&export=csv",
        "controller": "backend/src/modules/attendeeRegistration/organiser.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/organiser/EventRegistrations.tsx",
        "spoken": "Organiser exports attendee registration and session selections to CSV; personal data restricted per role access boundaries (T-32).",
        "limit": "Export streams CSV directly with appropriate content-disposition and sanitised fields to prevent formula injection.",
        "evidence_pr": "PR #372 (Attendee registration CSV export)",
        "code_link": "backend/src/modules/attendeeRegistration/organiser.ts",
    },
    # E10: Changes, Rescheduling & Cancellation
    "E10-S01": {
        "route": "POST /api/events/change-requests, PATCH /api/events/change-requests?action=review",
        "controller": "backend/src/modules/changeManagement/repository.ts",
        "migration": "0022_change_request_obsolete.sql",
        "component": "frontend/src/features/events/EventEditForm.tsx",
        "spoken": "Organiser requests critical date/attendance changes on approved events; Coordinator reviews with arrangement impact preview.",
        "limit": "Approved changes flag arrangements for reconfirmation; terminal events automatically mark pending change requests Obsolete (T-88).",
        "evidence_pr": "PR #380 (Change request review & obsolete lifecycle)",
        "code_link": "backend/src/modules/changeManagement/repository.ts",
    },
    "E10-S02": {
        "route": "PATCH /api/events?edit=1&reviewed=<rev>, PATCH /api/events?preview=1",
        "controller": "backend/src/modules/changeManagement/arrangementImpact.ts",
        "migration": "0026_support_reconfirmation.sql",
        "component": "frontend/src/features/events/ArrangementReview.tsx",
        "spoken": "Dry-run preview (&preview=1) inside a transaction savepoint returns impact and revision fingerprint; save verifies fingerprint to prevent review races.",
        "limit": "Flags affected venue bookings and technical staff (T-104); returns 409 if arrangements mutated between preview and save.",
        "evidence_pr": "PR #380 (Arrangement impact preview & revision fingerprinting)",
        "code_link": "backend/src/modules/changeManagement/arrangementImpact.ts",
    },
    "E10-S04": {
        "route": "POST /api/events?action=cancel",
        "controller": "backend/src/modules/eventLifecycle/cancellation.ts",
        "migration": "0001_connectsphere_schema.sql, 0022_change_request_obsolete.sql",
        "component": "frontend/src/features/events/EventDetails.tsx",
        "spoken": "Organiser or Coordinator cancels event with mandatory reason; releases all venue bookings, equipment reservations, and staff assignments.",
        "limit": "Dispatches cancellation notices to all registered attendees, assigned staff, and venues; pending change requests marked Obsolete (T-88).",
        "evidence_pr": "PR #330 (Event cancellation cascade & resource release)",
        "code_link": "backend/src/modules/eventLifecycle/cancellation.ts",
    },
    "E10-S05": {
        "route": "GET /api/venues/recovery?event=<id>, POST /api/venues/recovery?action=replace",
        "controller": "backend/src/modules/venueBooking/lostVenueRecovery.ts",
        "migration": "0025_venue_unavailability.sql",
        "component": "frontend/src/features/venue/LostVenueRecovery.tsx",
        "spoken": "Handles venue loss when venue becomes unavailable: booking is marked Conflicting, event returns to Planning, original details preserved (T-81).",
        "limit": "Coordinator searches replacement; lifting block does not overwrite active replacement (PR #355 / PR #367 fix).",
        "evidence_pr": "PR #367 (Lost venue recovery & booking preservation)",
        "code_link": "backend/src/modules/venueBooking/lostVenueRecovery.ts",
    },
    # E11: Notifications & Reminders
    "E11-S01": {
        "route": "GET /api/notifications, POST /api/notifications?read=1",
        "controller": "backend/src/modules/notificationDispatcher/postgres.ts",
        "migration": "0002_durable_notification_dispatch.sql",
        "component": "frontend/src/features/notifications/NotificationInbox.tsx",
        "spoken": "Transactional notification hub: inserts in-app notices and email outbox entries inside the business SQL transaction (T-37/T-105 XXL=13pts).",
        "limit": "Outbox pattern guarantees zero orphaned emails if business transaction rolls back; Brevo external relay processes asynchronously.",
        "evidence_pr": "PR #398 (Transactional outbox & notification routing)",
        "code_link": "backend/src/modules/notificationDispatcher/postgres.ts",
    },
    # E14: Audit & History
    "E14-S02": {
        "route": "GET /api/events?id=<id>&audit=1",
        "controller": "backend/src/modules/eventVisibility/service.ts",
        "migration": "0010_audit_logs_immutable.sql",
        "component": "frontend/src/features/events/ActivityLog.tsx",
        "spoken": "Immutable audit log tracking status transitions, booking approvals/releases, deactivations, and security events with actor and timestamp (T-75).",
        "limit": "PostgreSQL append-only table; updates and deletes prohibited by database trigger; coordinators view logs for their assigned events.",
        "evidence_pr": "PR #166 (Immutable audit logs & coordinator read access)",
        "code_link": "backend/src/modules/eventVisibility/service.ts",
    },
    "E14-S03": {
        "route": "GET /api/events?id=<id>&audit=1 (date formatting)",
        "controller": "backend/src/modules/eventVisibility/service.ts",
        "migration": "0010_audit_logs_immutable.sql",
        "component": "frontend/src/features/events/ActivityLog.tsx",
        "spoken": "Formats edited activity log timestamps in readable Singapore Standard Time (SST) in both Organiser and Coordinator views (T-97).",
        "limit": "Stored database timestamps remain canonical ISO UTC; formatting applied cleanly at display layer.",
        "evidence_pr": "PR #304 (Activity log Singapore time formatting)",
        "code_link": "frontend/src/features/events/ActivityLog.tsx",
    },
}

# Canonical mapping of 65 stories to verified execution run records in docs/testing/runs/
STORY_RUN_EVIDENCE_MAP = {
    "E01-S01": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E01-S02": "20261106-081527-Bl0oper-backend-db.md",
    "E01-S03": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E01-S04": "20261106-081527-Bl0oper-backend-db.md",
    "E01-S08": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E01-S11": "20261106-081527-Bl0oper-backend-db.md",
    "E01-S12": "20261106-081527-Bl0oper-backend-db.md",
    "E01-S13": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E02-S01": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E02-S02": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E02-S03": "20261106-081527-Bl0oper-backend-db.md",
    "E02-S05": "docs/testing/defects.md",
    "E02-S07": "20261106-144937-xiangyingg-tooling.md",
    "E03-S01": "20261106-221021-bryanseah234-backend-db.md",
    "E03-S02": "20261106-081527-Bl0oper-backend-db.md",
    "E03-S03": "20261106-081527-Bl0oper-backend-db.md",
    "E03-S05": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E03-S06": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E03-S07": "20261106-081527-Bl0oper-backend-db.md",
    "E03-S08": "docs/testing/defects.md",
    "E03-S09": "docs/testing/defects.md",
    "E03-S10": "docs/testing/defects.md",
    "E03-S11": "20261106-075740-Bl0oper-full-regression.md",
    "E03-S12": "20261106-075740-Bl0oper-full-regression.md",
    "E04-S02": "20261106-081527-Bl0oper-backend-db.md",
    "E05-S01": "20261106-081527-Bl0oper-backend-db.md",
    "E05-S02": "20261106-081527-Bl0oper-backend-db.md",
    "E05-S03": "20261106-081527-Bl0oper-backend-db.md",
    "E05-S04": "20261106-081527-Bl0oper-backend-db.md",
    "E05-S05": "20261106-081527-Bl0oper-backend-db.md",
    "E05-S06": "20261106-081527-Bl0oper-backend-db.md",
    "E06-S01": "20261106-081527-Bl0oper-backend-db.md",
    "E06-S02": "20261106-081527-Bl0oper-backend-db.md",
    "E06-S03": "20261106-081527-Bl0oper-backend-db.md",
    "E06-S04": "20261106-081527-Bl0oper-backend-db.md",
    "E06-S05": "20261106-081527-Bl0oper-backend-db.md",
    "E06-S06": "20261106-081527-Bl0oper-backend-db.md",
    "E06-S07": None,
    "E07-S01": "20261106-081527-Bl0oper-backend-db.md",
    "E07-S02": "20261106-081527-Bl0oper-backend-db.md",
    "E07-S03": "20261106-081527-Bl0oper-backend-db.md",
    "E07-S04": "20261106-081527-Bl0oper-backend-db.md",
    "E07-S05": "20261106-081527-Bl0oper-backend-db.md",
    "E07-S06": "20261106-081527-Bl0oper-backend-db.md",
    "E07-S07": "20261106-081527-Bl0oper-backend-db.md",
    "E07-S08": "20261106-081527-Bl0oper-backend-db.md",
    "E07-S09": "20261106-081527-Bl0oper-backend-db.md",
    "E08-S03": "20261106-081527-Bl0oper-backend-db.md",
    "E08-S04": "20261106-081527-Bl0oper-backend-db.md",
    "E08-S05": "20261106-081527-Bl0oper-backend-db.md",
    "E08-S06": "20261106-081527-Bl0oper-backend-db.md",
    "E09-S01": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E09-S02": "20261106-081527-Bl0oper-backend-db.md",
    "E09-S03": "20261106-081527-Bl0oper-backend-db.md",
    "E09-S04": "20261106-075740-Bl0oper-full-regression.md",
    "E09-S05": "20261106-081527-Bl0oper-backend-db.md",
    "E09-S06": "20261106-081527-Bl0oper-backend-db.md",
    "E09-S07": "20261106-081051-Bl0oper-frontend-e2e.md",
    "E10-S01": "20261106-081527-Bl0oper-backend-db.md",
    "E10-S02": "20261106-081527-Bl0oper-backend-db.md",
    "E10-S04": "20261106-081527-Bl0oper-backend-db.md",
    "E10-S05": "20261106-081527-Bl0oper-backend-db.md",
    "E11-S01": "20261106-221021-bryanseah234-backend-db.md",
    "E14-S02": "20261106-081527-Bl0oper-backend-db.md",
    "E14-S03": "20261106-075740-Bl0oper-full-regression.md",
}


def parse_markdown_stories() -> list[dict]:
    stories = []
    for f in sorted(BACKLOG_DIR.glob("*.md")):
        text = f.read_text(encoding="utf-8")
        blocks = re.split(r"\n(?=##\s+E\d{2}-S\d+)", text)
        for b in blocks[1:]:
            lines = b.splitlines()
            header = lines[0].strip()
            m = re.match(r"^##\s+(E\d{2}-S\d+(?:\.\d+)?)\s+[-\u2013\u2014]\s+(.+?)$", header)
            if not m:
                continue
            sid = m.group(1).strip()
            title = m.group(2).strip()
            epic = sid.split("-")[0]

            sprint_m = re.search(r"^-\s+\*\*Sprint\*\*:\s*(.+)$", b, re.M)
            pts_m = re.search(r"^-\s+\*\*Points\*\*:\s*(.+)$", b, re.M)
            bdr_m = re.search(r"^-\s+\*\*BDR references\*\*:\s*(.+)$", b, re.M)
            owner_m = re.search(r"^-\s+\*\*Owner\*\*:\s*(.+)$", b, re.M)

            sprint = sprint_m.group(1).strip() if sprint_m else "Sprint 1"
            pts_raw = pts_m.group(1).strip() if pts_m else ""
            try:
                pts = int(pts_raw)
            except ValueError:
                pts = pts_raw
            bdr = bdr_m.group(1).strip() if bdr_m else ""
            owner = owner_m.group(1).strip() if owner_m else ""

            # User story text
            us_m = re.search(r"### User story\s*\n\s*(.*?)(?=\n###|\Z)", b, re.S)
            user_story = us_m.group(1).strip() if us_m else ""

            # Acceptance criteria scenarios
            scenarios = []
            sc_matches = re.finditer(r"####\s+(Scenario\s+\d+\s+[-\u2013\u2014]\s+[^\n]+)\s*\n\s*(.*?)(?=\n####|\n###|\Z)", b, re.S)
            for sc in sc_matches:
                sc_title = sc.group(1).strip()
                sc_text = sc.group(2).strip()
                scenarios.append({"title": sc_title, "text": sc_text})

            # Checklist
            checklist = []
            cl_m = re.search(r"### Checklist\s*\n\s*(.*?)(?=\n##|\Z)", b, re.S)
            if cl_m:
                for cl_line in cl_m.group(1).splitlines():
                    if cl_line.strip().startswith("- "):
                        checklist.append(cl_line.strip()[2:])

            jira_key = STORY_JIRA_MAP.get(sid, "")
            tech_info = STORY_TECH_MAP.get(sid, {})

            stories.append({
                "story_id": sid,
                "title": title,
                "epic": epic,
                "sprint": sprint,
                "points": pts,
                "bdr": bdr,
                "owner": owner,
                "jira_key": jira_key,
                "user_story": user_story,
                "scenarios": scenarios,
                "checklist": checklist,
                "route": tech_info.get("route", "Internal / API"),
                "controller": tech_info.get("controller", "backend/src/modules/"),
                "migration": tech_info.get("migration", "0001_connectsphere_schema.sql"),
                "component": tech_info.get("component", "frontend/src/"),
                "spoken": tech_info.get("spoken", f"Delivers {title} under {sprint}."),
                "limit": tech_info.get("limit", "Validated against acceptance criteria and test suite."),
                "evidence_pr": tech_info.get("evidence_pr", f"Jira {jira_key}"),
                "code_link": tech_info.get("code_link", "backend/src/"),
            })

    return stories


def parse_tc_coverage() -> tuple[list[dict], dict[str, list[dict]]]:
    text = TC_COVERAGE_PATH.read_text(encoding="utf-8")
    start_marker = "## Case-by-case status"
    end_marker = "## Active tests that cover behaviour"
    case_block = text.split(start_marker)[1].split(end_marker)[0]

    all_cases = []
    story_cases_map = defaultdict(list)

    for line in case_block.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        parts = [p.strip() for p in line.split("|")]
        if len(parts) >= 6:
            col1 = parts[1].replace("`", "").strip()
            if col1.startswith("TC_") and col1 != "TC_ID":
                tc_id = col1
                story_id = parts[2].strip()
                scenario = parts[3].strip()
                status = parts[4].strip()
                where = "|".join(parts[5:-1]).strip()

                case_obj = {
                    "tc_id": tc_id,
                    "story_id": story_id,
                    "scenario": scenario,
                    "status": status,
                    "where": where,
                }
                all_cases.append(case_obj)
                story_cases_map[story_id].append(case_obj)

    return all_cases, story_cases_map


def parse_defects() -> list[dict]:
    text = DEFECTS_PATH.read_text(encoding="utf-8")
    defects = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("| D-"):
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if len(parts) >= 7:
                defects.append({
                    "id": parts[0],
                    "jira": parts[1],
                    "story": parts[2],
                    "tc_ids": parts[3],
                    "found_in": parts[4],
                    "summary": parts[5],
                    "status": parts[6],
                })
    return defects


def parse_clarifications() -> list[dict]:
    text = BDR_C_PATH.read_text(encoding="utf-8")
    c_items = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("| C-"):
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if len(parts) >= 7:
                c_items.append({
                    "id": parts[0],
                    "who": parts[1],
                    "sec": parts[2],
                    "question": parts[3],
                    "answer": parts[4],
                    "status": parts[5],
                    "settled": parts[6],
                })
    return c_items


def parse_decisions() -> list[dict]:
    text = BDR_T_PATH.read_text(encoding="utf-8")
    t_items = []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("| T-"):
            parts = [p.strip() for p in line.split("|")[1:-1]]
            if len(parts) >= 5:
                t_items.append({
                    "id": parts[0],
                    "decision": parts[1],
                    "rationale": parts[2],
                    "affects": parts[3],
                    "follows": parts[4],
                })
    return t_items




def parse_adrs() -> list[dict]:
    adrs = []
    adr_dir = Path("docs/adr")
    for p in sorted(adr_dir.glob("ADR-*.md")):
        txt = p.read_text(encoding="utf-8")
        first_line = txt.strip().splitlines()[0]
        m = re.match(r"^#\s+(ADR-\d+)\s+[\u2013\u2014-]\s+(.+)$", first_line)
        if not m:
            continue
        aid, title = m.group(1), m.group(2).strip()
        status_m = re.search(r"\*\*Status:\*\*\s*([^\n\r]+)", txt)
        status = status_m.group(1).strip() if status_m else "Accepted"
        bdr_m = re.search(r"\*\*Related BDR:\*\*\s*([^\n\r]+)", txt)
        bdr_raw = bdr_m.group(1).strip() if bdr_m else ""
        bdr_refs = [x.strip() for x in re.split(r"[,;]\s*", bdr_raw) if x.strip() and x.strip() != "—"]

        def extract_section(name: str) -> str:
            m = re.search(rf"###\s+{re.escape(name)}\s*\n(.*?)(?=\n###|\Z)", txt, re.S)
            return m.group(1).strip() if m else ""

        context = extract_section("Context")
        decision = extract_section("Decision")
        alts = extract_section("Alternatives considered")
        buys = extract_section("What it buys us")
        costs = extract_section("What it costs us")
        conseq = extract_section("Consequences")

        rel_path = f"docs/adr/{p.name}"
        github_url = f"{GITHUB_REPO_URL}/blob/main/{rel_path}"
        search_blob = f"{aid} {title} {status} {bdr_raw} {context} {decision} {alts} {buys} {costs} {conseq}"

        adrs.append({
            "id": aid,
            "title": title,
            "status": status,
            "bdr_raw": bdr_raw,
            "bdr_refs": bdr_refs,
            "context": context,
            "decision": decision,
            "alternatives": alts,
            "buys": buys,
            "costs": costs,
            "consequences": conseq,
            "filename": p.name,
            "rel_path": rel_path,
            "github_url": github_url,
            "search_blob": search_blob,
        })
    return adrs


def build_html() -> str:
    stories = parse_markdown_stories()
    all_cases, story_cases_map = parse_tc_coverage()
    defects = parse_defects()
    c_items = parse_clarifications()
    t_items = parse_decisions()
    adrs = parse_adrs()

    known_decision_ids = {f"decision-{d['id'].lower()}" for d in t_items}
    known_clarification_ids = {f"clarification-{c['id'].lower()}" for c in c_items}
    known_adr_ids = {f"adr-{a['id']}" for a in adrs}

    # Concise summaries for prominent story card badges
    c_summary_map = {}
    c_full_map = {}
    for c in c_items:
        ans = c["answer"]
        short = ans[:65].rsplit(" ", 1)[0] + "..." if len(ans) > 68 else ans
        c_summary_map[c["id"]] = short
        c_full_map[c["id"]] = ans

    t_summary_map = {}
    t_full_map = {}
    for t in t_items:
        dec = t["decision"]
        short = dec[:65].rsplit(" ", 1)[0] + "..." if len(dec) > 68 else dec
        t_summary_map[t["id"]] = short
        t_full_map[t["id"]] = dec

    adr_summary_map = {a["id"]: a["title"] for a in adrs}

    # Attach test cases to stories
    for s in stories:
        sid = s["story_id"]
        s["test_cases"] = story_cases_map.get(sid, [])

    # High-Risk Battle Dossiers metadata
    dossiers = [
        {
            "id": 1,
            "title": "Multi-Session Restoration",
            "tag": "Architecture",
            "category": "architecture",
            "status": "Restored (T-79)",
            "lineage": "C-62 → T-48 withdrawal → C-107 → T-79 / ADR-018 restoration",
            "hook": "Multi-session events were never permanently deleted: withdrawn under customer ambiguity in Week 4 (T-48), but formally reinstated in Week 9 (C-107, T-79, ADR-018) with first-class database tables and multi-session registration enforcing both session and combined event capacity.",
            "reality": "Shipped code actively enforces child sessions under an Event envelope (0014_event_sessions.sql, 0024_registration_sessions.sql, PR #426). Do NOT tell the examiner sessions are out of scope.",
            "code": "backend/src/modules/eventSessions/repository.ts",
            "test": "backend/tests/eventSessionsRoutes.integration.test.ts",
            "migration": "backend/database/migrations/0014_event_sessions.sql",
            "tc": "TC_E04S02_01 to TC_E04S02_05",
            "jira": "SCRUM-39",
            "pr": "PR #408 / PR #426",
        },
        {
            "id": 2,
            "title": "Venue Setup & Turnaround Buffers",
            "tag": "Concurrency",
            "category": "concurrency",
            "status": "Enforced (T-66)",
            "lineage": "C-18/C-38 excluded → C-65/T-66 reinstated → T-100 claim reservation → 0016_venue_buffer_write_guard.sql",
            "hook": "Buffers are per-venue whole minutes applied before start and after end; PostgreSQL exclusion constraints guard the buffered range against overlapping bookings, holds, and concurrent booking race conditions, while buffer edits flag existing bookings as Conflicting rather than silently dropping them.",
            "reality": "Occupancy window is [starts_at - setup_minutes, ends_at + turnaround_minutes]. Maintenance blocks are venue properties and are NOT buffered (T-80). Guards booking race conditions.",
            "code": "backend/src/modules/venueBooking/decisions.ts",
            "test": "backend/tests/venueBufferConflicts.integration.test.ts",
            "migration": "backend/database/migrations/0016_venue_buffer_write_guard.sql",
            "tc": "TC_E06S06_03, TC_E05S05_01 to _05",
            "jira": "SCRUM-44 / SCRUM-50",
            "pr": "PR #234 / PR #378",
        },
        {
            "id": 3,
            "title": "Tentative Holds: Shipped T-92 vs Target T-84",
            "tag": "Specification Delta",
            "category": "specs",
            "status": "Shipped T-92",
            "lineage": "C-01/C-16 deprioritised → C-68/T-69 expiry mandatory → T-92 shipped default vs T-84 student target",
            "hook": "In production code, holds follow team decision T-92 with a 48-hour default and instant SQL expiry on clock_timestamp(); the student backlog spec was updated to T-84 (per-hold custom expiry, max 2 reasoned extensions), leaving T-84 as an accepted backlog delta.",
            "reality": "A hold ceases occupying a venue immediately when expires_at <= clock_timestamp(), even before the cron cleanup runs. Converted holds that become formal pending requests never restore hold expiry upon withdrawal.",
            "code": "backend/src/modules/venueBooking/holds.ts:114",
            "test": "backend/tests/venueHolds.integration.test.ts",
            "migration": "backend/database/migrations/0013_tentative_venue_holds.sql",
            "tc": "TC_E06S05_01 to TC_E06S05_08",
            "jira": "SCRUM-49",
            "pr": "PR #245 / PR #252",
        },
        {
            "id": 4,
            "title": "Safety Review Dual Pathways",
            "tag": "State Machine",
            "category": "architecture",
            "status": "Shipped (T-82/T-107)",
            "lineage": "C-70/T-71 Operational Safety Check → T-82 automatic transition → T-103 interrupted review → T-107 direct confirmation",
            "hook": "First-time planning requires manual Coordinator submission to ensure all arrangements are ready, but replanning after a change or venue loss re-enters Safety Review automatically in the same database transaction once the last flagged item is reconfirmed.",
            "reality": "Initial submission is at submission.ts:307. Automatic entry is at autoSafetyReview.ts:55-78. Safety Officer approval confirms the event immediately (T-107); no redundant coordinator confirm step.",
            "code": "backend/src/modules/eventReadiness/autoSafetyReview.ts",
            "test": "backend/tests/safetyReview.integration.test.ts",
            "migration": "backend/database/migrations/0017_event_safety_review_status.sql",
            "tc": "TC_E08S03_01, TC_E08S04_05, TC_E08S06_01 to _04",
            "jira": "SCRUM-60 / SCRUM-158",
            "pr": "PR #283 / PR #392",
        },
        {
            "id": 5,
            "title": "Technician Deadlock & Lock Order (PR #239)",
            "tag": "Concurrency Bug Fix",
            "category": "concurrency",
            "status": "Fixed in PR #239",
            "lineage": "E07-S07 flaky CI on exclusion constraint → PR #239 root cause diagnosis → FOR NO KEY UPDATE fix",
            "hook": "Concurrent technician assignments deadlocked on PostgreSQL exclusion constraints (40P01); PR #239 resolved this booking race by enforcing an explicit lock order: locking the request FOR UPDATE, then locking the technician's user row FOR NO KEY UPDATE before checking clashes.",
            "reality": "FOR NO KEY UPDATE prevents blocking foreign-key references (e.g. notifications). Handled 40P01 backstop as a 409 clash. Verified by a 25-round concurrent race test in CI.",
            "code": "backend/src/modules/equipmentSupport/staffAssignments.ts:88",
            "test": "backend/tests/staffAssignments.integration.test.ts",
            "migration": "backend/database/migrations/0001_connectsphere_schema.sql",
            "tc": "TC_E07S07_03",
            "jira": "SCRUM-57",
            "pr": "PR #239",
        },
        {
            "id": 6,
            "title": "Attendee Capacity & Waitlist Races",
            "tag": "Race Protection",
            "category": "concurrency",
            "status": "Shipped (T-85/T-98)",
            "lineage": "C-78/C-97/C-107 → T-85 dual capacity limits → T-98 event-level waitlist",
            "hook": "Dual attendee capacity guards enforce per-session and event-level caps in SQL; registration locks the parent event row to prevent oversubscription across concurrent signups, and if an individual session is full, the registration routes to Pending for Organiser review.",
            "reality": "Waitlist is strictly event-level (T-98). Freed places trigger a simultaneous broadcast notification to all waitlisted attendees for a first-come claim race (C-23, T-46); no automated FIFO seat bumping.",
            "code": "backend/src/modules/attendeeRegistration/capacity.ts",
            "test": "backend/tests/attendeeRegistration.integration.test.ts",
            "migration": "backend/database/migrations/0024_registration_sessions.sql",
            "tc": "TC_E09S02_03, TC_E09S04_01 to _05",
            "jira": "SCRUM-64 / SCRUM-66",
            "pr": "PR #362 / PR #394",
        },
        {
            "id": 7,
            "title": "Transactional Outbox & Brevo Rollback",
            "tag": "Reliability",
            "category": "reliability",
            "status": "Shipped (ADR-006)",
            "lineage": "C-04/T-35 delivery channel → ADR-006 transactional outbox → 0002_durable_notification_dispatch.sql",
            "hook": "External email delivery via Brevo never runs inline with business logic; notification records are persisted to an atomic PostgreSQL outbox table inside the business transaction, ensuring zero orphaned emails if a transaction rolls back.",
            "reality": "Worker polls pending rows with exponential backoff up to 5 retries. Tests intercept HTTP requests at provider boundary to guarantee 100% offline isolation.",
            "code": "backend/src/modules/notificationDispatcher/postgres.ts",
            "test": "tests/notifications/postgres.test.ts",
            "migration": "backend/database/migrations/0002_durable_notification_dispatch.sql",
            "tc": "TC_E11S01_08, TC_E11S01_10 to _16",
            "jira": "SCRUM-75",
            "pr": "PR #398",
        },
        {
            "id": 8,
            "title": "Lost Venue Recovery & Lifecycle (PR #355)",
            "tag": "Lifecycle Preservation",
            "category": "architecture",
            "status": "Fixed in PR #367",
            "lineage": "C-66/C-120 → T-67/T-81 venue loss reversion → PR #355 / PR #367 restoration preservation",
            "hook": "When a venue becomes unavailable, the booking is flagged Conflicting and the Confirmed event returns to Planning without losing its equipment, tech support, or registrations; lifting an unavailability block never silently resurrects an obsolete booking if a replacement is already active.",
            "reality": "Original booking stays Conflicting until coordinator explicitly cancels it. PR #367 ensures lifting a maintenance block inspects descendant replacements before restoring.",
            "code": "backend/src/modules/venueBooking/lostVenueRecovery.ts",
            "test": "backend/tests/lostVenueRecovery.integration.test.ts",
            "migration": "backend/database/migrations/0025_venue_unavailability.sql",
            "tc": "TC_E10S05_01 to TC_E10S05_04",
            "jira": "SCRUM-74",
            "pr": "PR #355 / PR #367",
        },
        {
            "id": 9,
            "title": "Change Requests & Revision Fingerprinting",
            "tag": "Optimistic Locking",
            "category": "concurrency",
            "status": "Shipped (T-88)",
            "lineage": "C-14/C-52/C-77 → T-16/T-88 obsolete in completion/cancellation transaction → 0022_change_request_obsolete.sql",
            "hook": "Coordinator event edits use optimistic revision fingerprinting generated via dry-run transaction savepoints (&preview=1); submitting with &reviewed=<revision> prevents race conditions if arrangements change while the Coordinator is reviewing impacts.",
            "reality": "When an event completes or is cancelled, the lifecycle service atomically marks its pending change requests Obsolete in the same transaction.",
            "code": "backend/src/modules/changeManagement/arrangementImpact.ts",
            "test": "backend/tests/changeRequests.integration.test.ts",
            "migration": "backend/database/migrations/0022_change_request_obsolete.sql",
            "tc": "TC_E10S01_01 to _06, TC_E10S02_01 to _09",
            "jira": "SCRUM-70 / SCRUM-71",
            "pr": "PR #380",
        },
        {
            "id": 10,
            "title": "Lead Oversight Isolation & Known Gaps (D-01 to D-03)",
            "tag": "Defect Disclosure",
            "category": "defects",
            "status": "Shipped on main (SCRUM-261)",
            "lineage": "C-69/C-104/C-128 → T-70/T-83 Lead queue & reassignment → Morning Defects D-01..D-03 → Evening SCRUM-261 Merge",
            "hook": "We declare defects with total honesty: D-01 through D-03 were documented on 6 Nov morning audit against unmerged feature/SCRUM-153. That evening, SCRUM-261 merged to main (PR #450, #454, #453) shipping migration 0027_event_assignment_actor.sql and 31 tests; D-04 remains the single genuine open defect at HEAD.",
            "reality": "Lead workload queue and oversight view were merged to main via technical enabler SCRUM-261 (commits a8f2d879, b5370843, ced06372).",
            "code": "backend/src/modules/eventLifecycle/repository.ts:assignCoordinatorOnSubmit",
            "test": "backend/tests/leadOversight.test.ts",
            "migration": "backend/database/migrations/0027_event_assignment_actor.sql",
            "tc": "TC_E03S08_01, TC_E03S09_01, TC_E03S10_01",
            "jira": "SCRUM-256 / SCRUM-257 / SCRUM-258 / SCRUM-261",
            "pr": "PR #450 / PR #453 / PR #454",
        },
        {
            "id": 11,
            "title": "Multi-Role Tenancy & Deactivation Cascades",
            "tag": "Security & Audit",
            "category": "security",
            "status": "Shipped (T-86/T-59)",
            "lineage": "C-33/C-136 → T-10 single role → T-86 multi-role many-to-many → T-59 test schema isolation",
            "hook": "Users can hold multiple system roles simultaneously in user_roles; deactivating an account immediately purges all active auth sessions and blocks login while preserving immutable historical audit records for forensic accountability.",
            "reality": "PostgreSQL test schema mirrors public schema in the same database (T-59) to prevent cross-test contamination and ensure rollback safety without docker.",
            "code": "backend/src/modules/accessControl/deactivation.ts",
            "test": "backend/tests/deactivation.integration.test.ts",
            "migration": "backend/database/migrations/0012_user_role_enum_additions.sql",
            "tc": "TC_E01S11_01 to _03",
            "jira": "SCRUM-25",
            "pr": "PR #93",
        },
        {
            "id": 12,
            "title": "Date Horizon & Boundary Rules (2-Year SST)",
            "tag": "Validation Boundary",
            "category": "specs",
            "status": "Shipped (T-87)",
            "lineage": "C-71/C-72 → T-87 2-year horizon policy → E02-S07 / SCRUM-180",
            "hook": "We enforce a strict 2-year forward horizon based on Singapore Standard Time, while intentionally rejecting arbitrary minimum lead-time restrictions to preserve coordinator planning flexibility as decided in T-87.",
            "reality": "Evaluated dynamically as clock_timestamp() AT TIME ZONE 'Asia/Singapore' + INTERVAL '2 years'. Minimum lead time was rejected by customer C-71.",
            "code": "backend/src/modules/eventLifecycle/dateHorizon.ts",
            "test": "backend/tests/eventDateHorizon.integration.test.ts",
            "migration": "backend/database/migrations/0001_connectsphere_schema.sql",
            "tc": "TC_E02S07_01 to _03",
            "jira": "SCRUM-180",
            "pr": "PR #389",
        },
    ]


    # Team accountability matrix
    team_members = [
        {
            "name": "Bryan",
            "role": "Product Owner / Architecture Lead",
            "epics": "E01 Access, E02 Submission, Outbox & Database Migrations",
            "stories": "E01-S01..S08, E02-S01..S07, E11-S01",
            "pitch": "Architected database migrations 0001–0027, session auth with HTTP-only cookies, transactional outbox pattern, and overall team delivery discipline.",
        },
        {
            "name": "Amareet",
            "role": "Backend Concurrency & Technical Services",
            "epics": "E07 Equipment & Technical Support",
            "stories": "E07-S01..S09",
            "pitch": "Diagnosed and eliminated technician 40P01 deadlocks in PR #239 via lock hierarchy enforcement; author of equipment inventory and reservation transactions.",
        },
        {
            "name": "Aaron",
            "role": "Workflow & Safety Verification Lead",
            "epics": "E08 Readiness & Confirmation, E03 Review",
            "stories": "E08-S03..S06, E03-S01..S07",
            "pitch": "Authored the Safety Review state machine, automated re-entry algorithms, coordinator readiness checks, and decision factor auditing.",
        },
        {
            "name": "Xiang Ying",
            "role": "Attendee Registration & Capacity Systems",
            "epics": "E09 Attendee Registration",
            "stories": "E09-S01..S07",
            "pitch": "Engineered multi-session attendee registration, dual session/event capacity serialization (PR #426), and broadcast waitlist notifications.",
        },
        {
            "name": "Le Xin",
            "role": "Venue Booking & Inventory Systems",
            "epics": "E05 Venue Catalogue, E06 Search & Booking",
            "stories": "E05-S01..S06, E06-S01..S07",
            "pitch": "Implemented venue setup/turnaround buffers, PostgreSQL exclusion constraint guards (0016), tentative hold lifecycles, and timezone grids.",
        },
        {
            "name": "Ji Ning",
            "role": "Lifecycle Change & Rescheduling Lead",
            "epics": "E10 Changes & Cancellation, E14 Audit",
            "stories": "E10-S01..S05, E14-S02..S03",
            "pitch": "Delivered arrangement impact previews with revision fingerprinting (PR #380) and lost venue recovery with booking preservation (PR #367).",
        },
    ]



    fig_c4 = '<figure class="diagram-panel">\n        <svg viewBox="0 0 960 420" role="img" aria-labelledby="c4-title c4-desc">\n          <title id="c4-title">C4 Container Architecture of ConnectSphere</title>\n          <desc id="c4-desc">ConnectSphere C4 container diagram illustrating the React Single Page Application, Node.js API layer with cookie sessions, Supabase PostgreSQL database with dual public and test schemas, background transactional outbox worker, and external Brevo transactional email API.</desc>\n          <defs>\n            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n              <path d="M0 0L10 5L0 10z" fill="#75d6c2"/>\n            </marker>\n          </defs>\n\n          <!-- SPA Container -->\n          <rect x="40" y="60" width="240" height="150" rx="10" fill="#172733" stroke="#2c4559" stroke-width="2"/>\n          <text x="160" y="95" fill="#75d6c2" font-size="16" font-weight="bold" text-anchor="middle">Single-Page App</text>\n          <text x="160" y="120" fill="#9db2c4" font-size="12" text-anchor="middle">React 18 · TypeScript · Vite</text>\n          <text x="160" y="145" fill="#e8edf2" font-size="11" text-anchor="middle">Organiser · Coordinator · Venue Staff</text>\n          <text x="160" y="165" fill="#e8edf2" font-size="11" text-anchor="middle">Tech Staff · Safety Officer · Lead</text>\n          <text x="160" y="190" fill="#ffd166" font-size="11" text-anchor="middle">Same-origin HTTP-only cookies</text>\n\n          <!-- API Gateway Container -->\n          <rect x="360" y="60" width="240" height="150" rx="10" fill="#172733" stroke="#75d6c2" stroke-width="2"/>\n          <text x="480" y="95" fill="#75d6c2" font-size="16" font-weight="bold" text-anchor="middle">API Server / Serverless</text>\n          <text x="480" y="120" fill="#9db2c4" font-size="12" text-anchor="middle">Node.js 20 · TypeScript</text>\n          <text x="480" y="145" fill="#e8edf2" font-size="11" text-anchor="middle">Role-based Access Middleware</text>\n          <text x="480" y="165" fill="#e8edf2" font-size="11" text-anchor="middle">Optimistic Revision Checks</text>\n          <text x="480" y="190" fill="#78a7ff" font-size="11" text-anchor="middle">Atomic Savepoints &amp; Rollbacks</text>\n\n          <!-- Database Container -->\n          <rect x="680" y="60" width="240" height="150" rx="10" fill="#172733" stroke="#2c4559" stroke-width="2"/>\n          <text x="800" y="95" fill="#75d6c2" font-size="16" font-weight="bold" text-anchor="middle">Database</text>\n          <text x="800" y="120" fill="#9db2c4" font-size="12" text-anchor="middle">PostgreSQL 17 (Supabase)</text>\n          <text x="800" y="145" fill="#e8edf2" font-size="11" text-anchor="middle">Dual \'public\' and \'test\' schemas</text>\n          <text x="800" y="165" fill="#e8edf2" font-size="11" text-anchor="middle">Exclusion Constraints (0016)</text>\n          <text x="800" y="190" fill="#ffd166" font-size="11" text-anchor="middle">Row-Level Security (RLS)</text>\n\n          <!-- Outbox Relay Worker -->\n          <rect x="360" y="270" width="240" height="100" rx="10" fill="#1f3445" stroke="#2c4559" stroke-width="2"/>\n          <text x="480" y="300" fill="#75d6c2" font-size="14" font-weight="bold" text-anchor="middle">Outbox Relay Worker</text>\n          <text x="480" y="325" fill="#9db2c4" font-size="11" text-anchor="middle">Background Dispatch Daemon</text>\n          <text x="480" y="345" fill="#e8edf2" font-size="11" text-anchor="middle">Polls notification_outbox table</text>\n\n          <!-- External Brevo Service -->\n          <rect x="680" y="270" width="240" height="100" rx="10" fill="#172733" stroke="#2c4559" stroke-width="2"/>\n          <text x="800" y="300" fill="#78a7ff" font-size="14" font-weight="bold" text-anchor="middle">External Brevo API</text>\n          <text x="800" y="325" fill="#9db2c4" font-size="11" text-anchor="middle">Transactional Email Provider</text>\n          <text x="800" y="345" fill="#e8edf2" font-size="11" text-anchor="middle">Offline intercepted in CI</text>\n\n          <!-- Connecting Arrows -->\n          <line x1="280" y1="135" x2="360" y2="135" stroke="#75d6c2" stroke-width="2" marker-end="url(#arrow)"/>\n          <text x="320" y="125" fill="#9db2c4" font-size="10" text-anchor="middle">HTTPS</text>\n\n          <line x1="600" y1="135" x2="680" y2="135" stroke="#75d6c2" stroke-width="2" marker-end="url(#arrow)"/>\n          <text x="640" y="125" fill="#9db2c4" font-size="10" text-anchor="middle">TCP/SSL</text>\n\n          <line x1="480" y1="210" x2="480" y2="270" stroke="#75d6c2" stroke-width="2" marker-end="url(#arrow)"/>\n          <text x="515" y="245" fill="#9db2c4" font-size="10" text-anchor="middle">Persists</text>\n\n          <line x1="600" y1="320" x2="680" y2="320" stroke="#75d6c2" stroke-width="2" marker-end="url(#arrow)"/>\n          <text x="640" y="310" fill="#9db2c4" font-size="10" text-anchor="middle">REST</text>\n        </svg>\n        <figcaption class="diagram-caption">Figure 1.1: ConnectSphere C4 Container Architecture showing isolation of transactional state from external Brevo delivery.</figcaption>\n      </figure>'
    fig_fsm = '<figure class="diagram-panel">\n        <svg viewBox="0 0 960 420" role="img" aria-labelledby="fsm-title fsm-desc">\n          <title id="fsm-title">Event Lifecycle State Machine</title>\n          <desc id="fsm-desc">Comprehensive event lifecycle state machine showing transitions through Draft, Submitted, Under Review, Approved, Planning, Safety Review, Confirmed, Completed, and Cancelled, along with reversion and replacement loops for venue loss.</desc>\n          <defs>\n            <marker id="fsm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n              <path d="M0 0L10 5L0 10z" fill="#75d6c2"/>\n            </marker>\n          </defs>\n\n          <!-- States -->\n          <rect x="30" y="60" width="110" height="50" rx="8" fill="#172733" stroke="#2c4559" stroke-width="2"/>\n          <text x="85" y="90" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">Draft</text>\n\n          <rect x="180" y="60" width="120" height="50" rx="8" fill="#172733" stroke="#2c4559" stroke-width="2"/>\n          <text x="240" y="90" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">Submitted</text>\n\n          <rect x="340" y="60" width="130" height="50" rx="8" fill="#172733" stroke="#2c4559" stroke-width="2"/>\n          <text x="405" y="90" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">Under Review</text>\n\n          <rect x="510" y="60" width="110" height="50" rx="8" fill="#172733" stroke="#2c4559" stroke-width="2"/>\n          <text x="565" y="90" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">Approved</text>\n\n          <rect x="660" y="60" width="110" height="50" rx="8" fill="#1f3445" stroke="#75d6c2" stroke-width="2"/>\n          <text x="715" y="90" fill="#75d6c2" font-size="14" font-weight="bold" text-anchor="middle">Planning</text>\n\n          <rect x="810" y="60" width="120" height="50" rx="8" fill="#1f3445" stroke="#ffd166" stroke-width="2"/>\n          <text x="870" y="90" fill="#ffd166" font-size="14" font-weight="bold" text-anchor="middle">Safety Review</text>\n\n          <rect x="810" y="240" width="120" height="50" rx="8" fill="#1f3445" stroke="#48bb78" stroke-width="2"/>\n          <text x="870" y="270" fill="#48bb78" font-size="14" font-weight="bold" text-anchor="middle">Confirmed</text>\n\n          <rect x="550" y="240" width="120" height="50" rx="8" fill="#172733" stroke="#78a7ff" stroke-width="2"/>\n          <text x="610" y="270" fill="#78a7ff" font-size="14" font-weight="bold" text-anchor="middle">Completed</text>\n\n          <rect x="340" y="240" width="120" height="50" rx="8" fill="#172733" stroke="#ff9f9f" stroke-width="2"/>\n          <text x="400" y="270" fill="#ff9f9f" font-size="14" font-weight="bold" text-anchor="middle">Cancelled</text>\n\n          <!-- State Transitions -->\n          <line x1="140" y1="85" x2="180" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>\n          <line x1="300" y1="85" x2="340" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>\n          <line x1="470" y1="85" x2="510" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>\n          <line x1="620" y1="85" x2="660" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>\n          <text x="640" y="75" fill="#9db2c4" font-size="9" text-anchor="middle">1st booking</text>\n\n          <line x1="770" y1="85" x2="810" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>\n          <text x="790" y="75" fill="#9db2c4" font-size="9" text-anchor="middle">All Ready</text>\n\n          <line x1="870" y1="110" x2="870" y2="240" stroke="#48bb78" stroke-width="2" marker-end="url(#fsm-arrow)"/>\n          <text x="915" y="175" fill="#48bb78" font-size="10" text-anchor="middle">Approved (T-107)</text>\n\n          <!-- Reversion & Venue Loss Loop -->\n          <path d="M810 270 Q715 340 715 115" fill="none" stroke="#ffd166" stroke-width="2" stroke-dasharray="4" marker-end="url(#fsm-arrow)"/>\n          <text x="745" y="325" fill="#ffd166" font-size="10" text-anchor="middle">Venue Loss / Revert (T-81/T-28)</text>\n\n          <!-- Safety Rejection Loop -->\n          <path d="M840 60 Q790 20 740 60" fill="none" stroke="#ff9f9f" stroke-width="2" marker-end="url(#fsm-arrow)"/>\n          <text x="790" y="32" fill="#ff9f9f" font-size="9" text-anchor="middle">Safety Rejection (Changes Requested)</text>\n\n          <!-- Terminal Transitions -->\n          <line x1="810" y1="265" x2="670" y2="265" stroke="#78a7ff" stroke-width="2" marker-end="url(#fsm-arrow)"/>\n          <text x="740" y="255" fill="#9db2c4" font-size="9" text-anchor="middle">End of last session</text>\n\n          <path d="M715 110 L430 240" fill="none" stroke="#ff9f9f" stroke-width="2" stroke-dasharray="4" marker-end="url(#fsm-arrow)"/>\n          <text x="560" y="195" fill="#ff9f9f" font-size="10" text-anchor="middle">Coordinator / Organiser Cancel (E10-S04)</text>\n        </svg>\n        <figcaption class="diagram-caption">Figure 2.1: Lifecycle state machine including Safety Review and automatic Confirmed → Planning reversion on venue loss.</figcaption>\n      </figure>'
    fig_lock = '<figure class="diagram-panel">\n        <svg viewBox="0 0 960 380" role="img" aria-labelledby="lock-title lock-desc">\n          <title id="lock-title">PostgreSQL Concurrency Lock Order and Hierarchy</title>\n          <desc id="lock-desc">Database concurrency lock hierarchy diagram displaying top-down lock ordering from Events FOR UPDATE, Event Sessions FOR UPDATE, Venues FOR NO KEY UPDATE, Venue Bookings FOR UPDATE, Support Requests FOR UPDATE, down to Users FOR NO KEY UPDATE from PR #239 preventing 40P01 deadlocks.</desc>\n          <defs>\n            <marker id="lock-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">\n              <path d="M0 0L10 5L0 10z" fill="#ffd166"/>\n            </marker>\n          </defs>\n\n          <!-- Level 1 -->\n          <rect x="340" y="20" width="280" height="45" rx="6" fill="#172733" stroke="#75d6c2" stroke-width="2"/>\n          <text x="480" y="47" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">1. events (FOR UPDATE)</text>\n\n          <!-- Level 2 -->\n          <rect x="340" y="90" width="280" height="45" rx="6" fill="#172733" stroke="#75d6c2" stroke-width="2"/>\n          <text x="480" y="117" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">2. event_sessions (FOR UPDATE)</text>\n\n          <!-- Level 3 -->\n          <rect x="180" y="170" width="280" height="45" rx="6" fill="#1f3445" stroke="#78a7ff" stroke-width="2"/>\n          <text x="320" y="197" fill="#78a7ff" font-size="13" font-weight="bold" text-anchor="middle">3A. venues (FOR NO KEY UPDATE)</text>\n\n          <rect x="500" y="170" width="280" height="45" rx="6" fill="#172733" stroke="#75d6c2" stroke-width="2"/>\n          <text x="640" y="197" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">3B. support_requests (FOR UPDATE)</text>\n\n          <!-- Level 4 -->\n          <rect x="180" y="250" width="280" height="45" rx="6" fill="#172733" stroke="#75d6c2" stroke-width="2"/>\n          <text x="320" y="277" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">4A. venue_bookings (FOR UPDATE)</text>\n\n          <rect x="500" y="250" width="280" height="45" rx="6" fill="#1f3445" stroke="#ffd166" stroke-width="2"/>\n          <text x="640" y="277" fill="#ffd166" font-size="13" font-weight="bold" text-anchor="middle">4B. users (FOR NO KEY UPDATE) [PR #239]</text>\n\n          <!-- Level 5 -->\n          <rect x="340" y="325" width="280" height="40" rx="6" fill="#172733" stroke="#2c4559" stroke-width="2"/>\n          <text x="480" y="350" fill="#9db2c4" font-size="12" text-anchor="middle">5. notification_outbox (Atomic Insert)</text>\n\n          <!-- Arrows -->\n          <line x1="480" y1="65" x2="480" y2="90" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>\n          <line x1="420" y1="135" x2="350" y2="170" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>\n          <line x1="540" y1="135" x2="610" y2="170" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>\n          <line x1="320" y1="215" x2="320" y2="250" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>\n          <line x1="640" y1="215" x2="640" y2="250" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>\n        </svg>\n        <figcaption class="diagram-caption">Figure 2.2: Strict top-down lock hierarchy. Step 4B locks technician user rows FOR NO KEY UPDATE, eliminating 40P01 exclusion deadlocks.</figcaption>\n      </figure>'
    fig_vel = '<figure class="diagram-panel">\n        <svg viewBox="0 0 960 300" role="img" aria-labelledby="vel-title vel-desc">\n          <title id="vel-title">Reconciled Agile Velocity Comparison Across Sprints 1 to 4</title>\n          <desc id="vel-desc">Grouped bar chart comparing reported Jira chart velocity, fair product-story title audit velocity, and strict Definition of Done verified velocity across Sprint 1, Sprint 2, Sprint 3, and Sprint 4.</desc>\n\n          <!-- Axis lines -->\n          <line x1="80" y1="230" x2="900" y2="230" stroke="#2c4559" stroke-width="1"/>\n          <line x1="80" y1="160" x2="900" y2="160" stroke="#2c4559" stroke-width="1" stroke-dasharray="4"/>\n          <line x1="80" y1="90" x2="900" y2="90" stroke="#2c4559" stroke-width="1" stroke-dasharray="4"/>\n          <line x1="80" y1="20" x2="900" y2="20" stroke="#2c4559" stroke-width="1" stroke-dasharray="4"/>\n\n          <text x="65" y="235" fill="#9db2c4" font-size="12" text-anchor="end">0</text>\n          <text x="65" y="165" fill="#9db2c4" font-size="12" text-anchor="end">25</text>\n          <text x="65" y="95" fill="#9db2c4" font-size="12" text-anchor="end">50</text>\n          <text x="65" y="25" fill="#9db2c4" font-size="12" text-anchor="end">75</text>\n\n          <!-- Sprint 1 Group (Base X: 120) -->\n          <rect x="120" y="143" width="30" height="87" fill="#ffd166" rx="3"/>\n          <text x="135" y="137" fill="#ffd166" font-size="11" font-weight="bold" text-anchor="middle">31</text>\n          <rect x="155" y="163" width="30" height="67" fill="#78a7ff" rx="3"/>\n          <text x="170" y="157" fill="#78a7ff" font-size="11" font-weight="bold" text-anchor="middle">24</text>\n          <rect x="190" y="163" width="30" height="67" fill="#75d6c2" rx="3"/>\n          <text x="205" y="157" fill="#75d6c2" font-size="11" font-weight="bold" text-anchor="middle">24</text>\n          <text x="170" y="252" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Sprint 1</text>\n\n          <!-- Sprint 2 Group (Base X: 320) -->\n          <rect x="320" y="45" width="30" height="185" fill="#ffd166" rx="3"/>\n          <text x="335" y="39" fill="#ffd166" font-size="11" font-weight="bold" text-anchor="middle">66</text>\n          <rect x="355" y="118" width="30" height="112" fill="#78a7ff" rx="3"/>\n          <text x="370" y="112" fill="#78a7ff" font-size="11" font-weight="bold" text-anchor="middle">40</text>\n          <rect x="390" y="199" width="30" height="31" fill="#75d6c2" rx="3"/>\n          <text x="405" y="193" fill="#75d6c2" font-size="11" font-weight="bold" text-anchor="middle">11</text>\n          <text x="370" y="252" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Sprint 2</text>\n\n          <!-- Sprint 3 Group (Base X: 520) -->\n          <rect x="520" y="135" width="30" height="95" fill="#ffd166" rx="3"/>\n          <text x="535" y="129" fill="#ffd166" font-size="11" font-weight="bold" text-anchor="middle">34</text>\n          <rect x="555" y="135" width="30" height="95" fill="#78a7ff" rx="3"/>\n          <text x="570" y="129" fill="#78a7ff" font-size="11" font-weight="bold" text-anchor="middle">34</text>\n          <rect x="590" y="149" width="30" height="81" fill="#75d6c2" rx="3"/>\n          <text x="605" y="143" fill="#75d6c2" font-size="11" font-weight="bold" text-anchor="middle">29</text>\n          <text x="570" y="252" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Sprint 3</text>\n\n          <!-- Sprint 4 Group (Base X: 720) -->\n          <rect x="720" y="82" width="30" height="148" fill="#ffd166" rx="3"/>\n          <text x="735" y="76" fill="#ffd166" font-size="11" font-weight="bold" text-anchor="middle">53</text>\n          <rect x="745" y="118" width="30" height="112" fill="#78a7ff" rx="3"/>\n          <text x="760" y="112" fill="#78a7ff" font-size="11" font-weight="bold" text-anchor="middle">40</text>\n          <rect x="770" y="143" width="30" height="87" fill="#75d6c2" rx="3"/>\n          <text x="785" y="137" fill="#75d6c2" font-size="11" font-weight="bold" text-anchor="middle">31</text>\n          <text x="760" y="252" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Sprint 4</text>\n\n          <!-- Legend -->\n          <rect x="260" y="278" width="12" height="12" fill="#ffd166" rx="2"/>\n          <text x="280" y="289" fill="#9db2c4" font-size="11">Jira Chart (43.7 avg)</text>\n          <rect x="440" y="278" width="12" height="12" fill="#78a7ff" rx="2"/>\n          <text x="460" y="289" fill="#9db2c4" font-size="11">Product Title Audit (32.7 avg)</text>\n          <rect x="650" y="278" width="12" height="12" fill="#75d6c2" rx="2"/>\n          <text x="670" y="289" fill="#9db2c4" font-size="11">Strict DoD Evidence (21.3 avg)</text>\n        </svg>\n        <figcaption class="diagram-caption">Figure 2.3: Reconciled Agile velocity comparison proving we never inflated numbers or rewrote sprint history.</figcaption>\n      </figure>'


    # Pre-render Story Cards HTML
    story_cards_html = []
    epic_adr_rules = {
        "E01": ["ADR-007", "ADR-008", "ADR-015", "ADR-016"],
        "E02": ["ADR-001", "ADR-002", "ADR-018"],
        "E03": ["ADR-003", "ADR-007", "ADR-019"],
        "E04": ["ADR-003", "ADR-018"],
        "E05": ["ADR-003", "ADR-011"],
        "E06": ["ADR-003", "ADR-013", "ADR-014"],
        "E07": ["ADR-003", "ADR-010"],
        "E08": ["ADR-006", "ADR-014"],
        "E09": ["ADR-003", "ADR-018"],
        "E10": ["ADR-015", "ADR-016", "ADR-017"],
        "E11": ["ADR-006"],
        "E12": ["ADR-008", "ADR-015"],
        "E13": ["ADR-002"],
        "E14": ["ADR-009"],
        "E15": ["ADR-012", "ADR-019"],
    }
    story_specific_adr_rules = {
        "E02-S05": ["ADR-001", "ADR-018"],
        "E04-S02": ["ADR-018"],
        "E06-S06": ["ADR-003"],
        "E07-S04": ["ADR-003", "ADR-010"],
        "E09-S02": ["ADR-003", "ADR-018"],
        "E10-S01": ["ADR-016"],
        "E10-S02": ["ADR-015"],
        "E10-S05": ["ADR-017"],
        "E11-S01": ["ADR-006"],
        "E14-S01": ["ADR-009"],
        "E14-S02": ["ADR-009"],
        "E14-S03": ["ADR-009"],
        "E01-S01": ["ADR-015", "ADR-016"],
        "E03-S08": ["ADR-007", "ADR-019"],
        "E03-S09": ["ADR-007", "ADR-019"],
        "E03-S10": ["ADR-007", "ADR-019"],
    }

    for s in stories:
        sid = s["story_id"]
        safe_sid = sid.lower().replace("-", "")
        cases = s["test_cases"]
        active_cases = [c for c in cases if "active" in c["status"] or "✅" in c["status"]]
        defect_cases = [c for c in cases if "defect" in c["status"] or "⚠️" in c["status"]]
        scaffold_cases = [c for c in cases if "scaffold" in c["status"] or "⏳" in c["status"]]

        # Status badge (✅ Done, ⚠️ Partial, 🚨 Open defect)
        if sid in ["E03-S08", "E03-S09", "E03-S10"]:
            story_status_type = "defect"
            defect_map = {"E03-S08": "D-01", "E03-S09": "D-02", "E03-S10": "D-03"}
            status_badge_html = f'<span class="badge badge-defect">🚨 Open Defect ({defect_map[sid]} · Shipped on main)</span> <span class="badge badge-status">Shipped via SCRUM-261</span>'
        elif sid == "E02-S05":
            story_status_type = "defect"
            status_badge_html = '<span class="badge badge-defect">🚨 Open Defect (D-04)</span>'
        elif sid == "E06-S07":
            story_status_type = "partial"
            status_badge_html = '<span class="badge badge-partial">⚠️ Partial (Gate Incomplete)</span>'
        else:
            story_status_type = "done"
            status_badge_html = '<span class="badge badge-status">✅ Done</span>'

        # Generate comprehensive aliases (e.g. e5s4, e05s04, e5s04, scrum-44, tc_e07s07_03, etc.)
        aliases = [safe_sid, sid.lower(), s["jira_key"].lower(), s["jira_key"].lower().replace("-", "")]
        sid_m = re.match(r"^E(\d+)-S(\d+)", sid)
        if sid_m:
            e_num = int(sid_m.group(1))
            s_num = int(sid_m.group(2))
            aliases.extend([
                f"e{e_num}s{s_num}",
                f"e{e_num:02d}s{s_num}",
                f"e{e_num}s{s_num:02d}",
                f"e{e_num:02d}s{s_num:02d}",
                f"e{e_num}-s{s_num}",
                f"e{e_num:02d}-s{s_num:02d}",
                f"e{e_num}-s{s_num:02d}",
                f"e{e_num:02d}-s{s_num}",
            ])
        pr_m = re.search(r"PR #?(\d+)", s.get("evidence_pr", ""))
        if pr_m:
            pr_num = pr_m.group(1)
            aliases.extend([f"pr{pr_num}", f"pr-{pr_num}"])
        for c in cases:
            tc_clean = c["tc_id"].lower()
            aliases.extend([tc_clean, tc_clean.replace("_", ""), tc_clean.replace("_", "-")])
        if sid in ["E06-S02", "E06-S03", "E06-S06"]:
            aliases.extend(["booking race", "booking-race"])
        if sid in ["E09-S01", "E09-S02", "E09-S04"]:
            aliases.extend(["attendee capacity", "attendee-capacity"])
        if sid in ["E06-S03", "E06-S05", "E06-S07"]:
            aliases.extend(["holds", "tentative holds"])
        alias_str = " ".join(set(aliases))

        tc_ids_str = " ".join(c["tc_id"] for c in cases)
        search_blob = f"{sid} {s['jira_key']} {s['title']} {s['owner']} {s['bdr']} {s['route']} {s['controller']} {s['migration']} {s['component']} {tc_ids_str} {s['spoken']} {s['limit']} {s['evidence_pr']} {alias_str}".lower()

        tc_tags = "".join(
            f'<span class="badge badge-tc">{c["tc_id"]}</span> '
            for c in cases[:6]
        )
        if len(cases) > 6:
            tc_tags += f'<span class="badge badge-muted">+{len(cases)-6} more</span>'

        scenarios_html = ""
        for sc in s.get("scenarios", []):
            scenarios_html += f'<div class="scenario-box"><strong>{html.escape(sc.get("title", "Scenario"))}</strong><p>{html.escape(sc.get("text", ""))}</p></div>'

        jira_url = f"{JIRA_BASE_URL}/{s['jira_key']}"
        code_url = f"{GITHUB_REPO_URL}/blob/main/{s['code_link']}"
        code_filename = Path(s["code_link"]).name

        # Evidence links: 3 direct evidence links (Jira, PR/test run, Source Code)
        if pr_m:
            pr_num = pr_m.group(1)
            pr_url = f"{GITHUB_REPO_URL}/pull/{pr_num}"
            pr_link_html = f'<a href="{pr_url}" target="_blank" rel="noopener" class="ev-link">🔀 Pull Request #{pr_num}</a>'
        elif "SCRUM-153" in s.get("evidence_pr", "") or "feature/SCRUM-153" in s.get("evidence_pr", ""):
            branch_url = f"{GITHUB_REPO_URL}/tree/feature/SCRUM-153-lead-oversight"
            pr_link_html = f'<a href="{branch_url}" target="_blank" rel="noopener" class="ev-link">🌿 Branch (feature/SCRUM-153)</a>'
        elif "defects.md" in s.get("evidence_pr", ""):
            defect_url = f"{GITHUB_REPO_URL}/blob/main/docs/testing/defects.md"
            pr_link_html = f'<a href="{defect_url}" target="_blank" rel="noopener" class="ev-link">🚨 Defect Registry</a>'
        else:
            pr_link_html = f'<a href="{jira_url}" target="_blank" rel="noopener" class="ev-link">📋 Jira {s["jira_key"]}</a>'

        primary_test_file = ""
        for c in cases:
            if c.get("where"):
                w_file = c["where"].split(":")[0].strip()
                if "/" in w_file:
                    primary_test_file = w_file
                    break
        if primary_test_file:
            test_url = f"{GITHUB_REPO_URL}/blob/main/{primary_test_file}"
            test_link_html = f'<a href="{test_url}" target="_blank" rel="noopener" class="ev-link">🧪 Test ({Path(primary_test_file).name})</a>'
        else:
            test_link_html = ""

        # Explicit Run Evidence link pointing to real execution records
        run_file = STORY_RUN_EVIDENCE_MAP.get(sid)
        if run_file and run_file.endswith(".md") and "defects.md" not in run_file:
            run_url = f"{GITHUB_REPO_URL}/blob/main/docs/testing/runs/{run_file}"
            run_link_html = f'<a href="{run_url}" target="_blank" rel="noopener" class="ev-link ev-link-run">📋 Run Evidence ({Path(run_file).name})</a>'
        elif sid == "E06-S07":
            run_link_html = '<span class="ev-link ev-link-partial" title="No matching test cases in workbook yet; gate incomplete">⚠️ Run Evidence: Pending Test Cases</span>'
        elif sid in ["E03-S08", "E03-S09", "E03-S10", "E02-S05"]:
            defect_url = f"{GITHUB_REPO_URL}/blob/main/docs/testing/defects.md"
            run_link_html = f'<a href="{defect_url}" target="_blank" rel="noopener" class="ev-link ev-link-defect">🚨 Defect Registry (defects.md)</a>'
        else:
            run_link_html = ""

        # Level 2 Definition of Done Checklist
        checklist_html = ""
        if s["checklist"]:
            items_html = "".join(f'<li><span class="chk-icon">☑</span> {html.escape(item)}</li>' for item in s["checklist"])
            checklist_html = f"""
            <div class="lineage-section">
              <h4>Definition of Done Verification Checklist ({len(s['checklist'])} criteria)</h4>
              <ul class="dod-checklist">
                {items_html}
              </ul>
            </div>
            """

        # Generate BDR & ADR Badges for Story Card with Informative Summaries
        bdr_chips = []
        raw_bdr = s.get("bdr", "")
        for item in [x.strip() for x in re.split(r"[,;]\s*", raw_bdr) if x.strip() and x.strip() != "—"]:
            if item.startswith("C-") and f"clarification-{item.lower()}" in known_clarification_ids:
                summary = c_summary_map.get(item, "")
                summary_span = f' <span class="chip-desc">{html.escape(summary)}</span>' if summary else ""
                bdr_chips.append(f'<a href="#clarification-{item.lower()}" class="chip chip-c" title="Clarification {item}: {html.escape(c_full_map.get(item, ""))}"><span class="chip-id">{item}</span>{summary_span}</a>')
            elif item.startswith("T-") and f"decision-{item.lower()}" in known_decision_ids:
                summary = t_summary_map.get(item, "")
                summary_span = f' <span class="chip-desc">{html.escape(summary)}</span>' if summary else ""
                bdr_chips.append(f'<a href="#decision-{item.lower()}" class="chip chip-t" title="Team Decision {item}: {html.escape(t_full_map.get(item, ""))}"><span class="chip-id">{item}</span>{summary_span}</a>')
            elif item.startswith("ADR-") and f"adr-{item}" in known_adr_ids:
                summary = adr_summary_map.get(item, "")
                summary_span = f' <span class="chip-desc">{html.escape(summary)}</span>' if summary else ""
                bdr_chips.append(f'<a href="#adr-{item}" class="chip chip-adr" title="Architecture Decision {item}: {html.escape(summary)}"><span class="chip-id">{item}</span>{summary_span}</a>')
            else:
                bdr_chips.append(f'<span class="chip chip-bdr">{html.escape(item)}</span>')
        bdr_chips_html = " ".join(bdr_chips) if bdr_chips else '<span class="text-muted">None cited</span>'

        story_adrs = story_specific_adr_rules.get(sid, epic_adr_rules.get(s.get("epic", ""), ["ADR-001", "ADR-003"]))
        adr_chips = []
        for aid in story_adrs:
            summary = adr_summary_map.get(aid, "")
            summary_span = f' <span class="chip-desc">{html.escape(summary)}</span>' if summary else ""
            if f"adr-{aid}" in known_adr_ids:
                adr_chips.append(f'<a href="#adr-{aid}" class="chip chip-adr" title="Architecture Decision {aid}: {html.escape(summary)}"><span class="chip-id">{aid}</span>{summary_span}</a>')
            else:
                adr_chips.append(f'<span class="chip chip-adr"><span class="chip-id">{aid}</span>{summary_span}</span>')
        adr_chips_html = " ".join(adr_chips)

        bdr_adr_block_html = f"""
        <div class="story-bdr-adr-block">
          <div class="lineage-row">
            <span class="lineage-label">BDR Lineage:</span>
            <div class="chips-list">{bdr_chips_html}</div>
          </div>
          <div class="lineage-row">
            <span class="lineage-label">Architectural Decisions:</span>
            <div class="chips-list">{adr_chips_html}</div>
          </div>
        </div>
        """

        story_cards_html.append(f"""
        <article class="story-card" id="story-{sid}" data-sid="{sid}" data-status="{story_status_type}" data-alias="{alias_str}" data-search="{html.escape(search_blob)}">
          <div class="story-header">
            <div class="story-title-row">
              <span class="story-id">{sid}</span>
              <a href="{jira_url}" target="_blank" rel="noopener" class="jira-pill">{s['jira_key']}</a>
              <span class="badge badge-sprint">{s['sprint']}</span>
              <span class="badge badge-points">{s['points']} pts</span>
              <span class="badge badge-owner">{html.escape(s['owner'])}</span>
              {status_badge_html}
            </div>
            <h3 class="story-title">{html.escape(s['title'])}</h3>
          </div>

          <div class="spoken-hook-box">
            <span class="hook-label">SAY THIS FIRST (10-SEC HOOK)</span>
            <p class="hook-text">"{html.escape(s['spoken'])}"</p>
          </div>

          <div class="story-meta-grid">
            <div><strong>Known Limitation / Boundary:</strong> <span>{html.escape(s['limit'])}</span></div>
            <div><strong>BDR References:</strong> <code>{html.escape(s['bdr'])}</code></div>
          </div>

          {bdr_adr_block_html}

          <div class="story-evidence-links">
            <a href="{jira_url}" target="_blank" rel="noopener" class="ev-link">🔗 Jira Ticket ({s['jira_key']})</a>
            {pr_link_html}
            <a href="{code_url}" target="_blank" rel="noopener" class="ev-link">💻 Source ({code_filename})</a>
            {test_link_html}
            {run_link_html}
            <span class="ev-badge">Coverage: {len(active_cases)} active / {len(cases)} total</span>
          </div>

          <div class="tc-summary-row">
            {tc_tags}
          </div>

          <details class="story-lineage-drawer">
            <summary class="drawer-toggle">Expand Full Lineage &amp; Technical Proof</summary>
            <div class="drawer-content">
              <div class="lineage-section">
                <h4>Given-When-Then Acceptance Criteria</h4>
                {scenarios_html if scenarios_html else '<p class="muted">See canonical backlog markdown.</p>'}
              </div>

              {checklist_html}

              <div class="lineage-section">
                <h4>Technical Slice Architecture</h4>
                <div class="tech-table">
                  <div><span>Route / Endpoint:</span> <code>{html.escape(s['route'])}</code></div>
                  <div><span>Backend Controller:</span> <code>{html.escape(s['controller'])}</code></div>
                  <div><span>Database Migration:</span> <code>{html.escape(s['migration'])}</code></div>
                  <div><span>Frontend Component:</span> <code>{html.escape(s['component'])}</code></div>
                </div>
              </div>

              <div class="lineage-section">
                <h4>All Associated Test Cases ({len(cases)})</h4>
                <ul class="tc-detail-list">
                  {''.join(f'<li><code>{c["tc_id"]}</code> — {html.escape(c["scenario"])} <span class="tc-status">{c["status"]}</span><br><small class="muted">{html.escape(c["where"])}</small></li>' for c in cases)}
                </ul>
              </div>
            </div>
          </details>
        </article>
        """)

    # Pre-render 12 Dossiers HTML
    dossiers_html = []
    for d in dossiers:
        d_id = d["id"]
        category = d.get("category", "all")
        pr_raw = d.get("pr", "")
        pr_aliases = " ".join([f"pr{m}" for m in re.findall(r"\d+", pr_raw)])
        jira_raw = d.get("jira", "")
        alias_str = f"dossier{d_id} d{d_id} {category} {pr_aliases} {jira_raw.lower()} {d['tag'].lower()} {d['status'].lower()}"
        search_blob = f"dossier {d_id} {d['title']} {category} {d['tag']} {d['status']} {d['lineage']} {d['hook']} {d['reality']} {d['code']} {d['test']} {d['migration']} {d['tc']} {jira_raw} {pr_raw} {alias_str}".lower()

        d_code = d['code']
        code_file = d_code.split(':')[0]
        code_anchor = f"#L{d_code.split(':')[1]}" if (':' in d_code and d_code.split(':')[1].isdigit()) else ("#" + d_code.split(':')[1] if ':' in d_code else "")
        code_href = f"{GITHUB_REPO_URL}/blob/main/{code_file}{code_anchor}"

        d_test = d['test']
        test_file = d_test.split(':')[0]
        test_anchor = f"#L{d_test.split(':')[1]}" if (':' in d_test and d_test.split(':')[1].isdigit()) else ("#" + d_test.split(':')[1] if ':' in d_test else "")
        test_href = f"{GITHUB_REPO_URL}/blob/main/{test_file}{test_anchor}"

        dossiers_html.append(f"""
        <article class="dossier-card" id="dossier-{d_id}" data-category="{category}" data-alias="{html.escape(alias_str)}" data-search="{html.escape(search_blob)}">
          <div class="dossier-header">
            <div class="dossier-title-wrap">
              <span class="dossier-tag">{html.escape(d['tag'])}</span>
              <span class="dossier-num">Dossier #{d_id}</span>
              <h3 class="dossier-title">{html.escape(d['title'])}</h3>
            </div>
            <span class="badge badge-status">{html.escape(d['status'])}</span>
          </div>

          <div class="dossier-lineage">
            <strong>BDR Lineage:</strong> <code>{html.escape(d['lineage'])}</code>
          </div>

          <div class="dossier-hook">
            <strong>Spoken Answer Hook:</strong>
            <p class="hook-text">{html.escape(d['hook'])}</p>
          </div>

          <div class="dossier-reality">
            <strong>Technical Reality &amp; Code Proof:</strong>
            <p>{html.escape(d['reality'])}</p>
          </div>

          <div class="dossier-proof-grid">
            <div><strong>Production Code:</strong> <a href="{code_href}" target="_blank" rel="noopener noreferrer" class="link-external"><code>{html.escape(d['code'])}</code> ↗</a></div>
            <div><strong>Verification Test:</strong> <a href="{test_href}" target="_blank" rel="noopener noreferrer" class="link-external"><code>{html.escape(d['test'])}</code> ↗</a></div>
            <div><strong>Database Migration:</strong> <code>{html.escape(d['migration'])}</code></div>
            <div><strong>Test Workbook Cases:</strong> <code>{html.escape(d['tc'])}</code></div>
            <div><strong>Jira Issue:</strong> <code>{html.escape(d['jira'])}</code></div>
            <div><strong>Merged PR:</strong> <span class="pr-pill">{html.escape(d['pr'])}</span></div>
          </div>
        </article>
        """)

    # Pre-render 4 Defects Cards HTML
    defects_cards_data = [
        {
            "id": "D-01",
            "jira": "SCRUM-256",
            "story": "E03-S08",
            "title": "Unassigned Lead Request Queue vs Auto-Assign Algorithm",
            "tcs": "TC_E03S08_01, TC_E03S08_03, TC_E03S08_04, TC_E03S08_05",
            "hook": "During our 6 Nov morning audit, D-01 was logged because submissions auto-assigned coordinators via least-busy algorithm on feature/SCRUM-153. That evening, SCRUM-261 was merged to main (PR #450 commit a8f2d879, PR #453 commit ced06372) introducing migration 0027_event_assignment_actor.sql and restoring the unassigned Lead queue with 31 passing tests.",
            "recon_status": "Shipped on main via SCRUM-261",
            "recon_class": "badge-success",
            "facts": "Morning audit logged open defect D-01 on unmerged feature/SCRUM-153 branch. Evening PR #450 and #453 merged technical enabler SCRUM-261 to main (commits a8f2d879, ced06372) with migration 0027_event_assignment_actor.sql (events.assigned_by tracking). 31 unit/db tests passing.",
        },
        {
            "id": "D-02",
            "jira": "SCRUM-257",
            "story": "E03-S09",
            "title": "Direct Lead Reassignment Route & Reason Capture",
            "tcs": "TC_E03S09_01, TC_E03S09_02, TC_E03S09_03",
            "hook": "Logged during morning audit when Lead direct reassignment returned 403 on unmerged branch feature/SCRUM-154. Shipped to main that evening via SCRUM-261 PR #450 and PR #453, enabling direct coordinator reassignments with mandatory reason logging per C-69/T-83.",
            "recon_status": "Shipped on main via SCRUM-261",
            "recon_class": "badge-success",
            "facts": "Morning audit documented missing reassignment route. Evening PR #450 & #453 merged PATCH /api/events/:id/reassign with audit reason capture into main.",
        },
        {
            "id": "D-03",
            "jira": "SCRUM-258",
            "story": "E03-S10",
            "title": "Lead Coordinator Oversight Dashboard & Live Workloads",
            "tcs": "TC_E03S10_01, TC_E03S10_02",
            "hook": "Logged during morning audit because Lead navigation omitted the oversight dashboard link on main. Shipped that evening via SCRUM-261 PR #453 (commit ced06372), restoring live workload indicators across all active coordinators.",
            "recon_status": "Shipped on main via SCRUM-261",
            "recon_class": "badge-success",
            "facts": "Morning audit documented missing oversight link. Evening PR #453 merged GET /api/internal/lead/oversight dashboard and live assignment count metrics into main.",
        },
        {
            "id": "D-04",
            "jira": "SCRUM-259",
            "story": "E02-S05",
            "title": "Event Detail Duplication for Draft Creation (Reuse Details)",
            "tcs": "TC_E02S05_01, TC_E02S05_02, TC_E02S05_03",
            "hook": "D-04 is our single genuine open defect at HEAD. The implementation on branch feature/SCRUM-30-reuse-event-details (commit 5d1e9ab0) shallow-cloned top-level event fields but dropped child session envelopes. Merging it would have violated ADR-018 multi-session integrity, so we strictly quarantined it as an open defect.",
            "recon_status": "Open Defect · Deliberately Withheld (ADR-018 Safeguard)",
            "recon_class": "badge-defect",
            "facts": "Branch feature/SCRUM-30-reuse-event-details (commit 5d1e9ab0) remains unmerged on origin. Shipped code requires child sessions under an Event envelope per ADR-018; shallow copy would corrupt session registration invariants.",
        },
    ]

    defects_html = []
    for d in defects_cards_data:
        did = d["id"]
        defects_html.append(f"""
        <div class="defect-card" id="defect-{did.lower()}" data-search="four defects defect {did.lower()} {html.escape(d['title'].lower())} {html.escape(d['facts'].lower())}">
          <div class="defect-card-header">
            <div class="defect-id-group">
              <span class="defect-id">{did}</span>
              <span class="badge {d['recon_class']}">{d['recon_status']}</span>
            </div>
            <span class="defect-jira">{d['jira']} · {d['story']}</span>
          </div>
          <h3 class="defect-title">{d['title']}</h3>
          <div class="defect-hook-box">
            <strong>Spoken Defense Hook:</strong>
            <p class="hook-text">{d['hook']}</p>
          </div>
          <div class="defect-facts-box">
            <strong>Git Investigation &amp; Lineage Facts:</strong>
            <p>{d['facts']}</p>
          </div>
          <div class="defect-tcs-row">
            <strong>Associated Failing Test Cases:</strong> <code>{d['tcs']}</code>
          </div>
        </div>
        """)

    # Pre-render 19 ADRs HTML
    adr_cards_html = []
    for a in adrs:
        aid = a["id"]
        status_cls = "badge-status" if "accepted" in a["status"].lower() else "badge-defect"
        bdr_chips = []
        for r in a["bdr_refs"]:
            if r.startswith("C-") and f"clarification-{r.lower()}" in known_clarification_ids:
                bdr_chips.append(f'<a href="#clarification-{r.lower()}" class="chip chip-c">{r}</a>')
            elif r.startswith("T-") and f"decision-{r.lower()}" in known_decision_ids:
                bdr_chips.append(f'<a href="#decision-{r.lower()}" class="chip chip-t">{r}</a>')
            else:
                bdr_chips.append(f'<span class="chip chip-bdr">{html.escape(r)}</span>')
        bdr_chips_str = " ".join(bdr_chips) if bdr_chips else '<span class="text-muted">None</span>'

        alts_html = f'<div class="adr-section"><h4>Alternatives Considered</h4><p>{html.escape(a["alternatives"])}</p></div>' if a["alternatives"] else ""

        adr_cards_html.append(f"""
        <article class="adr-card" id="adr-{aid}" data-search="{html.escape(a['search_blob'].lower())}" data-aid="{aid.lower()}">
          <div class="adr-header">
            <div class="adr-title-wrap">
              <span class="adr-id-badge">{aid}</span>
              <h3 class="adr-title">{html.escape(a['title'])}</h3>
            </div>
            <span class="badge {status_cls}">{html.escape(a['status'])}</span>
          </div>
          <div class="adr-bdr-row">
            <strong>Related BDR:</strong> {bdr_chips_str}
          </div>
          <div class="adr-body">
            <div class="adr-section">
              <h4>Context</h4>
              <p>{html.escape(a['context'])}</p>
            </div>
            <div class="adr-section">
              <h4>Decision</h4>
              <p>{html.escape(a['decision'])}</p>
            </div>
            {alts_html}
            <div class="adr-grid-two">
              <div class="adr-section-box buys-box">
                <h4>What It Buys Us</h4>
                <p>{html.escape(a['buys'])}</p>
              </div>
              <div class="adr-section-box costs-box">
                <h4>What It Costs Us / Consequences</h4>
                <p>{html.escape(a['costs'] or a['consequences'])}</p>
              </div>
            </div>
          </div>
          <div class="adr-footer">
            <a href="{a['github_url']}" target="_blank" rel="noopener noreferrer" class="link-external">📄 View {a['filename']} on GitHub ↗</a>
          </div>
        </article>
        """)

    # Pre-render 107 Decisions HTML
    decisions_cards_html = []
    for t in t_items:
        tid = t["id"]
        safe_tid = tid.lower().replace("-", "")
        extra_keywords = []
        if tid in ["T-34", "T-73", "T-96"]:
            extra_keywords.extend(["scrum velocity", "velocity", "story points", "burndown"])
        if tid in ["T-65", "T-93", "T-13"]:
            extra_keywords.extend(["ai governance", "ai-governance", "human review", "test integrity"])
        if tid in ["T-41", "T-42", "T-84", "T-100"]:
            extra_keywords.extend(["booking race", "concurrency lock"])
        if tid in ["T-46", "T-98"]:
            extra_keywords.extend(["attendee capacity", "capacity limit"])
        if tid in ["T-68", "T-69", "T-84", "T-92"]:
            extra_keywords.extend(["tentative holds", "holds"])
        extra_str = " ".join(extra_keywords)
        t_alias = f"{tid.lower()} {safe_tid} {extra_str}"
        t_search = f"{tid} {t['decision']} {t['rationale']} {t['affects']} {t.get('follows', '')} {extra_str}"
        follows_html = f'<div><strong>Follows / Supersedes:</strong> <code>{html.escape(t["follows"])}</code></div>' if t.get("follows") else ""
        decisions_cards_html.append(f"""
        <article class="decision-card" id="decision-{tid.lower()}" data-search="{html.escape(t_search.lower())}" data-alias="{t_alias}">
          <div class="decision-header">
            <span class="decision-id">{tid}</span>
            <span class="badge badge-status">Team Decision</span>
          </div>
          <h4 class="decision-title">{html.escape(t['decision'])}</h4>
          <p class="decision-body">{html.escape(t['rationale'])}</p>
          <div class="decision-consequences">
            <div><strong>Affects:</strong> {html.escape(t['affects'])}</div>
            {follows_html}
          </div>
        </article>
        """)

    # Pre-render 136 Clarifications HTML
    clarifications_cards_html = []
    for c in c_items:
        cid = c["id"]
        safe_cid = cid.lower().replace("-", "")
        c_alias = f"{cid.lower()} {safe_cid}"
        c_search = f"{cid} {c['who']} {c['sec']} {c['question']} {c['answer']} {c['settled']} {c['status']}"
        clarifications_cards_html.append(f"""
        <article class="clarification-card" id="clarification-{cid.lower()}" data-search="{html.escape(c_search.lower())}" data-alias="{c_alias}">
          <div class="clarification-header">
            <span class="clarification-id">{cid}</span>
            <span class="clarification-source">{html.escape(c['who'])} ({html.escape(c['sec'])})</span>
            <span class="badge badge-status">{html.escape(c['status'])}</span>
          </div>
          <p class="clarification-body"><strong>Q:</strong> {html.escape(c['question'])}</p>
          <p class="clarification-body"><strong>A:</strong> {html.escape(c['answer'])}</p>
          <div class="clarification-impact">
            <strong>Settled Impact:</strong>
            <p>{html.escape(c['settled'])}</p>
          </div>
        </article>
        """)

    # Pre-render Team Accountability Cards
    team_cards_html = []
    for m in team_members:
        team_cards_html.append(f"""
        <div class="team-member-card">
          <div class="team-header">
            <h4 class="member-name">{html.escape(m['name'])}</h4>
            <span class="member-role">{html.escape(m['role'])}</span>
          </div>
          <p><strong>Epics Owned:</strong> {html.escape(m['epics'])}</p>
          <p><strong>Stories:</strong> <code>{html.escape(m['stories'])}</code></p>
          <p class="member-pitch">{html.escape(m['pitch'])}</p>
        </div>
        """)

    # Now assemble the complete HTML
    html_output = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="description" content="ConnectSphere Final Assessment Q&amp;A Preparation Guide and Exam Cockpit">
  <title>ConnectSphere · Exam Cockpit &amp; Proof Router</title>
  <style>
    :root {{
      --bg: #091118;
      --panel: #111d27;
      --raised: #182937;
      --border: #233b4e;
      --accent: #38bdf8;
      --accent-glow: rgba(56, 189, 248, 0.15);
      --text: #e2e8f0;
      --text-bright: #f8fafc;
      --muted: #94a3b8;
      --success: #34d399;
      --warning: #fbbf24;
      --danger: #f87171;
      --purple: #c084fc;
      --sidebar-w: 280px;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.6;
      font-size: 15px;
    }}

    /* Layout */
    .app-layout {{
      display: flex;
      min-height: 100vh;
    }}

    /* Sidebar Drawer */
    .app-sidebar {{
      width: var(--sidebar-w);
      background: var(--panel);
      border-right: 1px solid var(--border);
      position: fixed;
      top: 0;
      left: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      z-index: 100;
      overflow-y: auto;
    }}
    .sidebar-brand {{
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}
    .brand-content {{
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }}
    .brand-icon {{ font-size: 1.75rem; }}
    .brand-title {{
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-bright);
      letter-spacing: -0.02em;
    }}
    .brand-sub {{
      font-size: 0.75rem;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }}
    .drawer-close-btn {{
      display: none;
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 1.5rem;
      cursor: pointer;
      padding: 0.25rem;
    }}

    /* Navigation */
    .sidebar-nav {{
      padding: 1rem 0.75rem;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }}
    .nav-label {{
      font-size: 0.7rem;
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 0.5rem 0.75rem 0.25rem;
    }}
    .nav-tab {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.7rem 0.85rem;
      background: transparent;
      border: 1px solid transparent;
      border-radius: 8px;
      color: var(--muted);
      font-size: 0.9rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: all 0.15s ease;
    }}
    .nav-tab:hover {{
      background: var(--raised);
      color: var(--text-bright);
      border-color: var(--border);
    }}
    .nav-tab.active {{
      background: var(--accent-glow);
      color: var(--accent);
      border-color: rgba(56, 189, 248, 0.4);
      font-weight: 600;
    }}
    .nav-tab-left {{
      display: flex;
      align-items: center;
      gap: 0.65rem;
    }}
    .nav-tab-icon {{ font-size: 1.1rem; }}
    .nav-pill {{
      font-size: 0.7rem;
      padding: 0.15rem 0.45rem;
      border-radius: 10px;
      background: var(--raised);
      border: 1px solid var(--border);
      color: var(--text);
    }}
    .nav-pill.pill-danger {{
      background: rgba(248, 113, 113, 0.15);
      border-color: rgba(248, 113, 113, 0.4);
      color: var(--danger);
    }}

    .drawer-anchor-link {{
      display: block;
      padding: 0.45rem 0.85rem;
      font-size: 0.82rem;
      color: var(--muted);
      text-decoration: none;
      border-radius: 6px;
      transition: color 0.15s;
    }}
    .drawer-anchor-link:hover {{
      color: var(--accent);
      background: var(--raised);
    }}

    .sidebar-footer {{
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border);
      font-size: 0.75rem;
      color: var(--muted);
      line-height: 1.4;
    }}

    /* Main Area */
    .app-main {{
      margin-left: var(--sidebar-w);
      width: calc(100% - var(--sidebar-w));
      display: flex;
      flex-direction: column;
      min-height: 100vh;
    }}

    /* Topbar */
    .app-topbar {{
      position: sticky;
      top: 0;
      z-index: 90;
      background: rgba(17, 29, 39, 0.95);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
      padding: 0.85rem 1.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }}
    .topbar-left {{
      display: flex;
      align-items: center;
      gap: 1rem;
    }}
    .drawer-toggle-btn {{
      display: none;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      background: var(--raised);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: var(--text-bright);
      font-size: 1.25rem;
      cursor: pointer;
    }}
    .view-indicator {{
      display: flex;
      flex-direction: column;
    }}
    .view-indicator-sub {{
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--muted);
      font-weight: 600;
    }}
    .view-indicator-title {{
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-bright);
    }}
    .topbar-right {{
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}
    .topbar-badge {{
      font-size: 0.75rem;
      padding: 0.25rem 0.65rem;
      border-radius: 999px;
      background: var(--raised);
      border: 1px solid var(--border);
      color: var(--muted);
      font-weight: 500;
    }}
    .topbar-badge.badge-sprint {{
      background: rgba(56, 189, 248, 0.12);
      border-color: rgba(56, 189, 248, 0.4);
      color: var(--accent);
    }}

    /* View Panels */
    .content-viewport {{
      padding: 2rem 2.5rem 5rem;
      max-width: 1300px;
      width: 100%;
      margin: 0 auto;
    }}
    .doc-section {{
      display: block;
    }}
    .view-panel {{
      display: none;
    }}
    .view-panel.active {{
      display: block;
      animation: fadeIn 0.15s ease;
    }}
    @keyframes fadeIn {{
      from {{ opacity: 0; transform: translateY(4px); }}
      to {{ opacity: 1; transform: translateY(0); }}
    }}

    /* Header Elements */
    .section-header-box {{
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border);
    }}
    .section-eyebrow {{
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent);
      font-weight: 700;
      margin-bottom: 0.35rem;
    }}
    .section-heading {{
      font-size: 1.85rem;
      font-weight: 800;
      color: var(--text-bright);
      letter-spacing: -0.02em;
      margin-bottom: 0.5rem;
    }}
    .section-lead {{
      font-size: 1rem;
      color: var(--muted);
      max-width: 900px;
    }}

    /* Banners & Panels */
    .how-to-answer-banner {{
      background: linear-gradient(135deg, rgba(24, 41, 55, 0.95), rgba(17, 29, 39, 0.95));
      border: 1px solid var(--accent);
      border-radius: 12px;
      padding: 1.75rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }}
    .banner-title {{
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 0.75rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}
    .sequence-steps {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 1rem 0;
    }}
    .sequence-step {{
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.85rem;
    }}
    .step-num {{
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
    }}
    .step-name {{
      font-weight: 600;
      color: var(--text-bright);
      margin-top: 0.2rem;
    }}
    .template-box {{
      background: rgba(0,0,0,0.25);
      border-left: 4px solid var(--accent);
      padding: 0.85rem 1.25rem;
      margin-top: 1rem;
      border-radius: 0 6px 6px 0;
      font-family: monospace;
      font-size: 0.95rem;
      color: #7dd3fc;
    }}
    .legend-row {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      margin-top: 1rem;
      align-items: center;
      font-size: 0.85rem;
      color: var(--muted);
    }}

    /* Top Answers Panel */
    .top-answers-panel {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem 1.5rem;
      margin-bottom: 2.5rem;
    }}
    .top-answers-header {{
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.85rem;
    }}
    .top-answers-title {{
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--text-bright);
    }}
    .top-chips-grid {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }}
    .top-chip {{
      background: var(--raised);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 0.35rem 0.85rem;
      color: var(--text);
      font-size: 0.85rem;
      cursor: pointer;
      transition: all 0.15s;
    }}
    .top-chip:hover {{
      border-color: var(--accent);
      color: var(--accent);
      background: var(--accent-glow);
    }}

    /* Contextual Search Containers (NO <form>) */
    .section-search-container {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 2rem;
    }}
    .search-input-wrap {{
      position: relative;
      display: flex;
      align-items: center;
    }}
    .search-icon {{
      position: absolute;
      left: 1rem;
      color: var(--muted);
      font-size: 1.1rem;
      pointer-events: none;
    }}
    .section-search-input {{
      width: 100%;
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem 2.5rem 0.75rem 2.75rem;
      color: var(--text-bright);
      font-size: 0.95rem;
      outline: none;
      transition: border-color 0.15s;
    }}
    .section-search-input:focus {{
      border-color: var(--accent);
      box-shadow: 0 0 0 2px var(--accent-glow);
    }}
    .search-clear-btn {{
      position: absolute;
      right: 0.75rem;
      background: transparent;
      border: none;
      color: var(--muted);
      font-size: 1.1rem;
      cursor: pointer;
      padding: 0.25rem;
    }}
    .search-clear-btn:hover {{ color: var(--text-bright); }}
    .filter-chips-row {{
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
    }}
    .chips-label {{
      font-size: 0.8rem;
      color: var(--muted);
      font-weight: 600;
      margin-right: 0.25rem;
    }}
    .filter-chip, .vault-filter-chip {{
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.3rem 0.75rem;
      color: var(--muted);
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.15s;
    }}
    .filter-chip:hover, .vault-filter-chip:hover {{
      color: var(--text-bright);
      border-color: var(--muted);
    }}
    .filter-chip.active, .vault-filter-chip.active {{
      background: var(--accent);
      color: var(--bg);
      font-weight: 700;
      border-color: var(--accent);
    }}
    .btn-toggle-drawers {{
      margin-left: auto;
      background: var(--raised);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.3rem 0.75rem;
      color: var(--text);
      font-size: 0.8rem;
      cursor: pointer;
    }}
    .btn-toggle-drawers:hover {{ border-color: var(--accent); color: var(--accent); }}
    .search-results-meta {{
      font-size: 0.8rem;
      color: var(--muted);
      margin-top: 0.75rem;
    }}

    /* Story Cards */
    .story-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      transition: border-color 0.15s;
    }}
    .story-card:hover {{ border-color: rgba(56, 189, 248, 0.4); }}
    .story-header {{
      margin-bottom: 0.75rem;
    }}
    .story-title-row {{
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
      margin-bottom: 0.5rem;
    }}
    .story-id {{
      font-weight: 800;
      font-size: 1.05rem;
      color: var(--accent);
    }}
    .jira-pill {{
      background: var(--raised);
      border: 1px solid var(--border);
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      color: var(--muted);
      text-decoration: none;
    }}
    .story-title {{
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-bright);
    }}
    .spoken-hook-box {{
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      margin: 0.85rem 0;
    }}
    .hook-label {{
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--accent);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      display: block;
      margin-bottom: 0.25rem;
    }}
    .hook-text {{
      color: #bae6fd;
      font-weight: 500;
    }}
    .story-meta-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 0.75rem;
      font-size: 0.85rem;
      background: rgba(0,0,0,0.2);
      border-left: 3px solid var(--border);
      padding: 0.75rem 1rem;
      margin: 0.85rem 0;
    }}

    /* Story BDR & ADR Block */
    .story-bdr-adr-block {{
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.85rem 1rem;
      margin: 0.85rem 0;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }}
    .lineage-row {{
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }}
    .lineage-label {{
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--muted);
      min-width: 140px;
    }}
    .chips-list {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }}
    .chip {{
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.76rem;
      text-decoration: none;
      line-height: 1.35;
      transition: all 0.15s ease;
    }}
    .chip-id {{
      font-weight: 700;
      white-space: nowrap;
    }}
    .chip-desc {{
      font-weight: 400;
      opacity: 0.9;
    }}
    .chip:hover {{
      transform: translateY(-1px);
      filter: brightness(1.2);
    }}
    .chip-adr {{
      background: rgba(192, 132, 252, 0.15);
      border: 1px solid rgba(192, 132, 252, 0.4);
      color: var(--purple);
    }}
    .chip-adr:hover {{ background: rgba(192, 132, 252, 0.25); }}
    .chip-t {{
      background: rgba(56, 189, 248, 0.15);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: var(--accent);
    }}
    .chip-t:hover {{ background: rgba(56, 189, 248, 0.25); }}
    .chip-c {{
      background: rgba(52, 211, 153, 0.15);
      border: 1px solid rgba(52, 211, 153, 0.4);
      color: var(--success);
    }}
    .chip-c:hover {{ background: rgba(52, 211, 153, 0.25); }}
    .chip-bdr {{
      background: var(--raised);
      border: 1px solid var(--border);
      color: var(--muted);
    }}

    /* Topic Dossier Chips */
    .dossier-filter-chip, .dossier-jump-chip {{
      background: var(--raised);
      border: 1px solid var(--border);
      color: var(--muted);
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.15s ease;
      white-space: nowrap;
    }}
    .dossier-filter-chip:hover, .dossier-jump-chip:hover {{
      color: var(--text-bright);
      border-color: var(--accent);
      background: rgba(56, 189, 248, 0.1);
    }}
    .dossier-filter-chip.active {{
      background: var(--accent);
      color: #0b1320;
      font-weight: 700;
      border-color: var(--accent);
    }}
    .dossier-jump-chip {{
      background: rgba(168, 85, 247, 0.08);
      border-color: rgba(168, 85, 247, 0.3);
      color: #c084fc;
      font-size: 0.75rem;
      padding: 0.25rem 0.6rem;
    }}

    @keyframes target-pulse {{
      0% {{
        outline: 3px solid #38bdf8;
        box-shadow: 0 0 25px rgba(56, 189, 248, 0.7);
      }}
      50% {{
        outline: 3px solid #f472b6;
        box-shadow: 0 0 35px rgba(244, 114, 182, 0.9);
      }}
      100% {{
        outline: 1px solid var(--border);
        box-shadow: none;
      }}
    }}
    .target-highlight {{
      animation: target-pulse 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
    }}

    .story-evidence-links {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
      align-items: center;
      margin: 0.85rem 0;
      font-size: 0.85rem;
    }}
    .ev-link {{
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.65rem;
      background: var(--raised);
      border: 1px solid var(--border);
      border-radius: 6px;
      color: var(--text);
      text-decoration: none;
      font-size: 0.8rem;
    }}
    .ev-link:hover {{ border-color: var(--accent); color: var(--accent); }}
    .ev-link-run {{
      background: rgba(52, 211, 153, 0.1);
      border-color: rgba(52, 211, 153, 0.35);
      color: var(--success);
    }}
    .ev-link-defect {{
      background: rgba(248, 113, 113, 0.1);
      border-color: rgba(248, 113, 113, 0.35);
      color: var(--danger);
    }}
    .ev-link-partial {{
      background: rgba(251, 191, 36, 0.1);
      border-color: rgba(251, 191, 36, 0.35);
      color: var(--warning);
    }}
    .ev-badge {{
      font-size: 0.78rem;
      color: var(--muted);
      margin-left: auto;
    }}
    .tc-summary-row {{
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
      margin-bottom: 0.85rem;
    }}

    /* Details Drawer */
    .story-lineage-drawer {{
      margin-top: 1rem;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }}
    .drawer-toggle {{
      background: var(--raised);
      padding: 0.75rem 1rem;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--muted);
      user-select: none;
    }}
    .drawer-toggle:hover {{ color: var(--text-bright); }}
    .drawer-content {{
      padding: 1.25rem;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }}
    .lineage-section h4 {{
      font-size: 0.9rem;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 0.65rem;
    }}
    .tech-table {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 0.65rem;
      font-size: 0.85rem;
    }}
    .scenario-box {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      font-size: 0.85rem;
    }}
    .dod-checklist {{
      list-style: none;
      font-size: 0.85rem;
      color: var(--text);
    }}
    .dod-checklist li {{
      margin-bottom: 0.35rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}
    .chk-icon {{ color: var(--success); }}
    .tc-detail-list {{
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }}
    .tc-detail-list li {{
      font-size: 0.82rem;
      padding: 0.35rem 0.65rem;
      border-radius: 4px;
      background: var(--panel);
      border: 1px solid var(--border);
    }}

    /* Badges */
    .badge {{
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.6rem;
      border-radius: 6px;
      font-size: 0.78rem;
      font-weight: 600;
    }}
    .badge-status, .badge-success {{
      background: rgba(52, 211, 153, 0.15);
      border: 1px solid rgba(52, 211, 153, 0.4);
      color: var(--success);
    }}
    .badge-defect, .badge-danger {{
      background: rgba(248, 113, 113, 0.15);
      border: 1px solid rgba(248, 113, 113, 0.4);
      color: var(--danger);
    }}
    .badge-partial, .badge-warning {{
      background: rgba(251, 191, 36, 0.15);
      border: 1px solid rgba(251, 191, 36, 0.4);
      color: var(--warning);
    }}
    .badge-owner, .badge-points, .badge-sprint, .badge-tc {{
      background: var(--raised);
      border: 1px solid var(--border);
      color: var(--muted);
    }}

    /* Defects Radar */
    .defect-recon-banner {{
      background: linear-gradient(135deg, rgba(35, 20, 25, 0.95), rgba(20, 15, 20, 0.95));
      border: 1px solid var(--danger);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }}
    .banner-badge-row {{
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }}
    .defect-recon-banner h3 {{
      font-size: 1.25rem;
      color: #fca5a5;
      margin-bottom: 0.5rem;
    }}
    .defect-recon-banner p {{
      font-size: 0.9rem;
      color: var(--text);
      margin-bottom: 0.5rem;
    }}
    .defects-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 1.5rem;
    }}
    .defect-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
    }}
    .defect-card-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }}
    .defect-id-group {{
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }}
    .defect-id {{
      font-size: 1.1rem;
      font-weight: 800;
      color: var(--danger);
    }}
    .defect-jira {{
      font-size: 0.8rem;
      color: var(--muted);
    }}
    .defect-title {{
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-bright);
      margin-bottom: 0.75rem;
    }}
    .defect-hook-box {{
      background: rgba(248, 113, 113, 0.08);
      border: 1px solid rgba(248, 113, 113, 0.25);
      border-radius: 8px;
      padding: 0.75rem;
      margin-bottom: 0.75rem;
    }}
    .defect-hook-box .hook-text {{ color: #fca5a5; }}
    .defect-facts-box {{
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.75rem;
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
    }}
    .defect-tcs-row {{
      font-size: 0.8rem;
      color: var(--muted);
    }}

    /* Dossiers */
    .dossiers-grid {{
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }}
    .dossier-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
    }}
    .dossier-header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }}
    .dossier-title-wrap {{
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }}
    .dossier-tag {{
      background: var(--accent-glow);
      border: 1px solid rgba(56, 189, 248, 0.4);
      color: var(--accent);
      padding: 0.15rem 0.5rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 700;
    }}
    .dossier-num {{
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--muted);
    }}
    .dossier-title {{
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-bright);
    }}
    .dossier-lineage {{
      font-size: 0.85rem;
      color: var(--muted);
      margin-bottom: 0.75rem;
    }}
    .dossier-hook {{
      background: rgba(56, 189, 248, 0.08);
      border: 1px solid rgba(56, 189, 248, 0.25);
      border-radius: 8px;
      padding: 0.85rem;
      margin-bottom: 0.75rem;
    }}
    .dossier-reality {{
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 0.85rem;
      font-size: 0.88rem;
      margin-bottom: 0.75rem;
    }}
    .dossier-proof-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 0.5rem;
      font-size: 0.82rem;
    }}

    /* Vault View */
    .vault-grid {{
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }}
    .adr-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
    }}
    .adr-header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.75rem;
    }}
    .adr-title-wrap {{
      display: flex;
      align-items: center;
      gap: 0.65rem;
      flex-wrap: wrap;
    }}
    .adr-id-badge {{
      font-weight: 800;
      font-size: 1.05rem;
      color: var(--purple);
    }}
    .adr-title {{
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-bright);
    }}
    .adr-bdr-row {{
      font-size: 0.85rem;
      margin-bottom: 1rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border);
    }}
    .adr-body {{
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
      font-size: 0.88rem;
    }}
    .adr-section h4 {{
      font-size: 0.82rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--accent);
      margin-bottom: 0.25rem;
    }}
    .adr-grid-two {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
      margin-top: 0.5rem;
    }}
    .adr-section-box {{
      padding: 0.85rem;
      border-radius: 8px;
      background: var(--bg);
      border: 1px solid var(--border);
    }}
    .adr-footer {{
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid rgba(35, 59, 78, 0.6);
      font-size: 0.82rem;
    }}

    .decision-card, .clarification-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
    }}
    .decision-header, .clarification-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }}
    .decision-id {{ font-weight: 800; color: var(--accent); }}
    .clarification-id {{ font-weight: 800; color: var(--success); }}
    .decision-date, .clarification-source {{ font-size: 0.8rem; color: var(--muted); }}
    .decision-title {{ font-size: 1rem; color: var(--text-bright); margin-bottom: 0.35rem; }}
    .decision-body, .clarification-body {{ font-size: 0.88rem; margin-bottom: 0.5rem; }}
    .decision-consequences, .clarification-impact {{
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 0.65rem;
      font-size: 0.82rem;
    }}

    /* Architecture View */
    .diagram-panel {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
    }}
    .diagram-panel svg {{
      width: 100%;
      height: auto;
      display: block;
      border-radius: 8px;
      background: var(--bg);
      border: 1px solid var(--border);
    }}
    .diagram-caption {{
      margin-top: 1rem;
      font-size: 0.9rem;
      color: var(--muted);
      line-height: 1.5;
    }}

    /* Team Matrix */
    .team-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.25rem;
      margin-top: 1rem;
    }}
    .team-member-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 1.25rem;
      font-size: 0.88rem;
    }}
    .team-header {{ margin-bottom: 0.5rem; }}
    .member-name {{ font-size: 1.05rem; font-weight: 700; color: var(--text-bright); }}
    .member-role {{ font-size: 0.78rem; color: var(--accent); }}
    .member-pitch {{
      margin-top: 0.65rem;
      padding-top: 0.65rem;
      border-top: 1px solid var(--border);
      font-style: italic;
      color: var(--muted);
    }}

    /* Links */
    .link-external, .link-internal {{
      color: var(--accent);
      text-decoration: none;
    }}
    .link-external:hover, .link-internal:hover {{ text-decoration: underline; }}
    .pr-pill {{
      display: inline-block;
      padding: 0.15rem 0.5rem;
      background: var(--raised);
      border: 1px solid var(--border);
      border-radius: 6px;
      font-size: 0.75rem;
    }}

    /* Mobile Responsive Overrides */
    @media (max-width: 1024px) {{
      .app-sidebar {{
        transform: translateX(-100%);
        transition: transform 0.25s ease-in-out;
        width: 290px;
        box-shadow: 4px 0 24px rgba(0,0,0,0.5);
      }}
      .app-sidebar.open {{
        transform: translateX(0);
      }}
      .drawer-close-btn {{
        display: block;
      }}
      .app-main {{
        margin-left: 0;
        width: 100%;
      }}
      .drawer-toggle-btn {{
        display: inline-flex;
      }}
      .content-viewport {{
        padding: 1.5rem 1rem 4rem;
      }}
      .topbar-badge:not(.badge-sprint) {{
        display: none;
      }}
      .drawer-backdrop {{
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.65);
        z-index: 99;
        backdrop-filter: blur(2px);
      }}
      .drawer-backdrop.active {{
        display: block;
      }}
    }}
  </style>
</head>
<body>
  <div class="app-layout">
    <!-- Backdrop overlay for mobile drawer -->
    <div id="drawer-backdrop" class="drawer-backdrop" aria-hidden="true"></div>

    <!-- Sliding Sidebar Drawer -->
    <aside id="app-sidebar" class="app-sidebar" aria-label="Main Navigation">
      <div class="sidebar-brand">
        <div class="brand-content">
          <span class="brand-icon">🎓</span>
          <div>
            <h2 class="brand-title">ConnectSphere</h2>
            <div class="brand-sub">Final Defense Cockpit</div>
          </div>
        </div>
        <button id="drawer-close" class="drawer-close-btn" aria-label="Close navigation drawer">✕</button>
      </div>

      <nav class="sidebar-nav" aria-label="Defense Navigation Views">
        <div class="nav-label">DEFENSE VIEWS</div>
        <button class="nav-tab active" data-view="view-how-to-answer">
          <div class="nav-tab-left">
            <span class="nav-tab-icon">📋</span>
            <span>How to Answer &amp; Protocol</span>
          </div>
        </button>
        <button class="nav-tab" data-view="view-defects-radar">
          <div class="nav-tab-left">
            <span class="nav-tab-icon">🚨</span>
            <span>Defects Radar &amp; Lineage</span>
          </div>
          <span class="nav-pill pill-danger">4</span>
        </button>
        <button class="nav-tab" data-view="view-dossiers">
          <div class="nav-tab-left">
            <span class="nav-tab-icon">🛡️</span>
            <span>12 Topic Dossiers</span>
          </div>
          <span class="nav-pill">12</span>
        </button>
        <button class="nav-tab" data-view="view-stories">
          <div class="nav-tab-left">
            <span class="nav-tab-icon">📖</span>
            <span>65 Stories &amp; Tech Lineage</span>
          </div>
          <span class="nav-pill">65</span>
        </button>
        <button class="nav-tab" data-view="view-vault">
          <div class="nav-tab-left">
            <span class="nav-tab-icon">📜</span>
            <span>ADR &amp; BDR Decision Vault</span>
          </div>
          <span class="nav-pill">262</span>
        </button>
        <button class="nav-tab" data-view="view-architecture">
          <div class="nav-tab-left">
            <span class="nav-tab-icon">🏗️</span>
            <span>Architecture &amp; Diagrams</span>
          </div>
          <span class="nav-pill">4</span>
        </button>
        <button class="nav-tab" data-view="view-runbook">
          <div class="nav-tab-left">
            <span class="nav-tab-icon">⏱️</span>
            <span>20-Min Exam Runbook</span>
          </div>
        </button>

        <div class="nav-label" style="margin-top: 1.5rem;">REQUIRED ANCHOR SECTIONS</div>
        <a href="#overview" class="drawer-anchor-link">📍 Section: Overview (#overview)</a>
        <a href="#details" class="drawer-anchor-link">📍 Section: Details (#details)</a>
        <a href="#next-steps" class="drawer-anchor-link">📍 Section: Next Steps (#next-steps)</a>
      </nav>

      <div class="sidebar-footer">
        <div><strong>Sprint 5 Close:</strong> 60 Done · 1 Partial · 4 Defects</div>
        <div>391 functional story cases + 3 cross-cutting DoD/performance cases = 394 workbook cases</div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="app-main">
      <!-- Fixed App Topbar -->
      <header class="app-topbar">
        <div class="topbar-left">
          <button id="drawer-toggle" class="drawer-toggle-btn" aria-label="Toggle navigation drawer" aria-expanded="false">
            ☰
          </button>
          <div class="view-indicator">
            <span class="view-indicator-sub">Current View</span>
            <span id="current-view-title" class="view-indicator-title">📋 How to Answer &amp; Protocol</span>
          </div>
        </div>
        <div class="topbar-right">
          <span class="topbar-badge badge-sprint">Sprint 5 HEAD</span>
          <span class="topbar-badge">19 ADRs</span>
          <span class="topbar-badge">100% Verified Run Records</span>
        </div>
      </header>

      <!-- Viewport containing required top-level sections -->
      <main class="content-viewport">
        <!-- REQUIRED SECTION 1: #overview -->
        <section id="overview" class="doc-section">
          <!-- View 1: How to Answer & Protocol -->
          <div id="view-how-to-answer" class="view-panel active">
            <div class="section-header-box">
              <div class="section-eyebrow">EXAMINER PRESENTATION DEFENSE FRAMEWORK</div>
              <h2 class="section-heading">How to Answer &amp; Rehearsal Protocol</h2>
              <p class="section-lead">The 4-step answer sequence, rehearsable 5-sentence templates, wording traps to avoid, and quick-jump navigation chips for likely examiner attacks.</p>
            </div>

            <!-- Mandatory How to Answer Banner -->
            <aside class="how-to-answer-banner">
              <div class="banner-title">
                <span>🎯</span>
                <h3>Mandatory Answer Sequence: What it does → Why we chose it → Proof → Boundary</h3>
              </div>
              <p>Whenever an examiner asks about any story, feature, or defect, follow this sequence strictly. <strong>Say This First</strong> before diving into code or edge cases:</p>

              <div class="sequence-steps">
                <div class="sequence-step">
                  <div class="step-num">Step 1</div>
                  <div class="step-name">What It Does</div>
                  <p style="font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem;">Business outcome and primary role benefit.</p>
                </div>
                <div class="sequence-step">
                  <div class="step-num">Step 2</div>
                  <div class="step-name">Why We Chose It</div>
                  <p style="font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem;">BDR customer clarification or ADR architectural rationale.</p>
                </div>
                <div class="sequence-step">
                  <div class="step-num">Step 3</div>
                  <div class="step-name">Technical Proof</div>
                  <p style="font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem;">Exact PR number, migration filename, or automated test case.</p>
                </div>
                <div class="sequence-step">
                  <div class="step-num">Step 4</div>
                  <div class="step-name">System Boundary</div>
                  <p style="font-size: 0.8rem; color: var(--muted); margin-top: 0.25rem;">Where the responsibility ends or intentional limits.</p>
                </div>
              </div>

              <div class="template-box">
                "This feature lets [role] do [business outcome]. We chose this design because [BDR/ADR reason]. We proved it in [PR/test case], and the boundary is [limit]."
              </div>

              <div class="legend-row">
                <strong>Status Legend:</strong>
                <span class="badge badge-status">Done</span>
                <span class="badge badge-partial">Partial</span>
                <span class="badge badge-defect">Open defect</span>
                <span class="badge" style="background: var(--raised); border: 1px solid var(--border); color: var(--muted);">Historical decision</span>
                <span style="margin-left: auto;">Precision: A venue block can be created over confirmed bookings without being blocked.</span>
              </div>
            </aside>

            <!-- Top Likely Answers Panel -->
            <div class="top-answers-panel">
              <div class="top-answers-header">
                <span class="top-answers-title">⚡ Top Likely Examiner Questions (Click to Jump &amp; Filter)</span>
                <span style="font-size: 0.75rem; color: var(--muted);">instant local search for this static guide</span>
              </div>
              <div class="top-chips-grid">
                <button type="button" class="top-chip" data-query="Safety Review">Safety Review (Aaron · E06)</button>
                <button type="button" class="top-chip" data-query="Venue Loss">Venue Loss (Dylan · E10-S02)</button>
                <button type="button" class="top-chip" data-query="Booking Race">Booking Race (Amareet · E06-S06)</button>
                <button type="button" class="top-chip" data-query="Holds">Holds (E05-S03 · 48h Expiry)</button>
                <button type="button" class="top-chip" data-query="Attendee Capacity">Attendee Capacity (Xiang Ying · E09)</button>
                <button type="button" class="top-chip" data-query="Outbox">Outbox (Bryan · E11-S01 · ADR-006)</button>
                <button type="button" class="top-chip" data-query="Scrum Velocity">Scrum Velocity (Burn-Up &amp; PR Flow)</button>
                <button type="button" class="top-chip" data-query="AI Governance">AI Governance (Dossier 12 · T-108)</button>
                <button type="button" class="top-chip" data-query="Four Defects">Four Defects (Audit vs SCRUM-261 HEAD)</button>
              </div>
            </div>

            <!-- Examiner Wording Traps & Rules -->
            <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem;">
              <h3 style="font-size: 1.1rem; color: var(--text-bright); margin-bottom: 0.75rem;">Examiner Wording Traps &amp; Exact System Realities</h3>
              <ul style="padding-left: 1.25rem; font-size: 0.9rem; color: var(--text); display: flex; flex-direction: column; gap: 0.5rem;">
                <li><strong>Obsolete Change Requests:</strong> When an event completes or is cancelled, the lifecycle service atomically marks its pending change requests Obsolete in the same transaction. (Never claim it is triggered asynchronously by a background scheduler).</li>
                <li><strong>Workbook Case Count:</strong> Exactly 391 functional story cases + 3 cross-cutting DoD/performance cases = 394 workbook cases across 65 user stories.</li>
                <li><strong>Defect Integrity Rule:</strong> <span class="badge badge-status">Admit honestly · do not count as Done</span>. Never claim open defects pass DoD.</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- REQUIRED SECTION 2: #details -->
        <section id="details" class="doc-section">
          <!-- View 2: Defects Radar & Shortcomings -->
          <div id="view-defects-radar" class="view-panel">
            <div class="section-header-box">
              <div class="section-eyebrow">TRANSPARENCY &amp; GIT HEAD RECONCILIATION</div>
              <h2 class="section-heading">Defects Radar &amp; Branch Reality</h2>
              <p class="section-lead">Reconciliation of the 6 Nov morning audit in defects.md against the subsequent merge of SCRUM-261 on main.</p>
            </div>

            <!-- Git Reconciliation Banner -->
            <div id="defect-branch-scrum-153" class="defect-recon-banner">
              <div class="banner-badge-row">
                <span class="badge badge-defect">🚨 Git Investigation &amp; Reconciliation</span>
                <span class="badge badge-status">Admit honestly · do not count as Done</span>
              </div>
              <h3>Post-Sprint 5 Git Reality &amp; Audit Reconciliation</h3>
              <p>During the morning audit on 6 Nov 2026, defects D-01, D-02, and D-03 were documented in <code>docs/testing/defects.md</code> against unmerged feature branches (SCRUM-153, SCRUM-154, SCRUM-155). Later on 6 Nov, <strong>SCRUM-261 was merged to main</strong> (PR #450 commit <code>a8f2d879</code>, PR #454 commit <code>b5370843</code>, PR #453 commit <code>ced06372</code>), successfully shipping Lead assignment and direct reassignment with migration <code>0027_event_assignment_actor.sql</code> and 31 passing unit/db tests.</p>
              <p>In contrast, <strong>D-04 (SCRUM-259 / E02-S05) remains our single genuine open defect at HEAD</strong>: branch <code>feature/SCRUM-30-reuse-event-details</code> (commit <code>5d1e9ab0</code>) was deliberately withheld from main to prevent shallow copy corruption of child session envelopes per ADR-018.</p>
            </div>

            <div class="defects-grid">
              {''.join(defects_html)}
            </div>
          </div>

          <!-- View 3: 12 High-Risk Topic Dossiers -->
          <div id="view-dossiers" class="view-panel">
            <div class="section-header-box">
              <div class="section-eyebrow">DEEP ARCHITECTURAL TOPICS</div>
              <h2 class="section-heading">12 High-Risk Battle Dossiers</h2>
              <p class="section-lead">Complete defense briefs on concurrency locks, safety reviews, outbox pattern, and session restorations with production code proofs.</p>
            </div>

            <!-- Contextual Quick-Jump Category Chips for Dossiers -->
            <div class="section-search-container" style="margin-bottom: 2rem;">
              <div class="filter-chips-row">
                <span class="chips-label">Topic Filter:</span>
                <button type="button" class="dossier-filter-chip active" data-dossier-filter="all">All 12 Dossiers</button>
                <button type="button" class="dossier-filter-chip" data-dossier-filter="concurrency">Concurrency &amp; Locks (4)</button>
                <button type="button" class="dossier-filter-chip" data-dossier-filter="architecture">Architecture &amp; FSM (3)</button>
                <button type="button" class="dossier-filter-chip" data-dossier-filter="reliability">Reliability &amp; Outbox (1)</button>
                <button type="button" class="dossier-filter-chip" data-dossier-filter="security">Security &amp; Tenancy (1)</button>
                <button type="button" class="dossier-filter-chip" data-dossier-filter="defects">Defects &amp; Limits (1)</button>
                <button type="button" class="dossier-filter-chip" data-dossier-filter="specs">Spec &amp; AI (2)</button>
              </div>
              <div class="filter-chips-row" style="margin-top: 0.5rem;">
                <span class="chips-label">Quick Jump:</span>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-1">#1 Monolith</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-2">#2 Lock Hierarchy</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-3">#3 Status Flow</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-4">#4 Lifecycle FSM</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-5">#5 Tech Lock Fix</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-6">#6 48h Tentative Hold</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-7">#7 Outbox Pattern</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-8">#8 Interrupted Review</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-9">#9 Revision Fingerprint</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-10">#10 SCRUM-30 Withhold</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-11">#11 Session Invalidation</button>
                <button type="button" class="dossier-jump-chip" data-jump="dossier-12">#12 AI Governance</button>
              </div>
              <div id="dossier-meta" class="search-results-meta">Showing 12 of 12 topic dossiers</div>
            </div>

            <div class="dossiers-grid">
              {''.join(dossiers_html)}
            </div>
          </div>

          <!-- View 4: 65 User Stories & Code Lineage -->
          <div id="view-stories" class="view-panel">
            <div class="section-header-box">
              <div class="section-eyebrow">FULL SPECIFICATION &amp; TRACEABILITY</div>
              <h2 class="section-heading">65 User Stories &amp; Code Lineage</h2>
              <p class="section-lead">Search and inspect all 65 user stories across 15 epics with direct architectural decision links, acceptance scenarios, and test case coverage.</p>
            </div>

            <!-- Dedicated Story Search Bar (NO <form>) -->
            <div class="section-search-container">
              <div class="search-input-wrap">
                <span class="search-icon">🔍</span>
                <input type="text" id="story-search-input" class="section-search-input" placeholder="Search 65 stories by ID (e.g. e5s4, e3s1), title, route, role, PR, or defect..." aria-label="Search User Stories">
                <button type="button" id="story-search-clear" class="search-clear-btn" aria-label="Clear search">✕</button>
              </div>
              <div class="filter-chips-row">
                <span class="chips-label">Filters:</span>
                <button type="button" class="filter-chip active" data-story-filter="all">All 65</button>
                <button type="button" class="filter-chip" data-story-filter="done">Done (60)</button>
                <button type="button" class="filter-chip" data-story-filter="defects">Defects / Partial (5)</button>
                <button type="button" class="filter-chip" data-story-filter="lead">Lead</button>
                <button type="button" class="filter-chip" data-story-filter="coordinator">Coordinator</button>
                <button type="button" class="filter-chip" data-story-filter="admin">Admin</button>
                <button type="button" class="filter-chip" data-story-filter="student">Student</button>
                <button type="button" class="filter-chip" data-story-filter="technician">Technician</button>
                <button type="button" id="toggle-all-drawers" class="btn-toggle-drawers">Expand All Details</button>
              </div>
              <div id="story-search-meta" class="search-results-meta">Showing 65 of 65 stories</div>
            </div>

            <div class="stories-list" id="stories-list-container">
              {''.join(story_cards_html)}
            </div>
          </div>

          <!-- View 5: ADR & BDR Decision Vault -->
          <div id="view-vault" class="view-panel">
            <div class="section-header-box">
              <div class="section-eyebrow">FULL DECISION REPOSITORY</div>
              <h2 class="section-heading">ADR &amp; BDR Decision Vault</h2>
              <p class="section-lead">The authoritative repository of all 19 Architecture Decision Records, 107 Team Decisions, and 136 Customer Clarifications.</p>
            </div>

            <!-- Dedicated Vault Search Bar (NO <form>) -->
            <div class="section-search-container">
              <div class="search-input-wrap">
                <span class="search-icon">🔍</span>
                <input type="text" id="vault-search-input" class="section-search-input" placeholder="Search ADRs (ADR-001..ADR-019), Decisions (T-01..T-108), or Clarifications (C-01..C-136)..." aria-label="Search Vault">
                <button type="button" id="vault-search-clear" class="search-clear-btn" aria-label="Clear search">✕</button>
              </div>
              <div class="filter-chips-row">
                <span class="chips-label">Vault Type:</span>
                <button type="button" class="vault-filter-chip active" data-vault-filter="all">All Vault (262)</button>
                <button type="button" class="vault-filter-chip" data-vault-filter="adr">ADRs (19)</button>
                <button type="button" class="vault-filter-chip" data-vault-filter="decision">Decisions (107)</button>
                <button type="button" class="vault-filter-chip" data-vault-filter="clarification">Clarifications (136)</button>
              </div>
              <div id="vault-search-meta" class="search-results-meta">Showing 262 entries</div>
            </div>

            <!-- ADRs Section -->
            <div id="vault-adrs-block" style="margin-bottom: 3rem;">
              <h3 style="font-size: 1.3rem; color: var(--purple); margin-bottom: 1rem;">19 Architecture Decision Records (ADR-001 to ADR-019)</h3>
              <div class="vault-grid">
                {''.join(adr_cards_html)}
              </div>
            </div>

            <!-- Team Decisions Section -->
            <div id="vault-decisions-block" style="margin-bottom: 3rem;">
              <h3 style="font-size: 1.3rem; color: var(--accent); margin-bottom: 1rem;">107 Team Decisions (T-01 to T-108)</h3>
              <div class="vault-grid">
                {''.join(decisions_cards_html)}
              </div>
            </div>

            <!-- Customer Clarifications Section -->
            <div id="vault-clarifications-block" style="margin-bottom: 3rem;">
              <h3 style="font-size: 1.3rem; color: var(--success); margin-bottom: 1rem;">136 Customer Clarifications (C-01 to C-136)</h3>
              <div class="vault-grid">
                {''.join(clarifications_cards_html)}
              </div>
            </div>
          </div>

          <!-- View 6: Architecture, Diagrams & SVGs -->
          <div id="view-architecture" class="view-panel">
            <div class="section-header-box">
              <div class="section-eyebrow">VISUAL PROOFS &amp; SPECIFICATIONS</div>
              <h2 class="section-heading">Architecture, State Machines &amp; Diagrams</h2>
              <p class="section-lead">The four authoritative visual specifications: C4 container diagram, event state machine, technician lock hierarchy, and velocity burn-up.</p>
            </div>

            {fig_c4}
            {fig_fsm}
            {fig_lock}
            {fig_vel}
          </div>
        </section>

        <!-- REQUIRED SECTION 3: #next-steps -->
        <section id="next-steps" class="doc-section">
          <!-- View 7: 20-Min Exam Runbook & Delivery Sign-Off -->
          <div id="view-runbook" class="view-panel">
            <div class="section-header-box">
              <div class="section-eyebrow">FINAL PRESENTATION PACING &amp; CHECKLIST</div>
              <h2 class="section-heading">20-Minute Exam Runbook &amp; Live Demo Script</h2>
              <p class="section-lead">Pacing schedule, role speaking slots, proof handoffs, and examiners question management.</p>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2rem;">
              <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem;">
                <h4 style="color: var(--accent); margin-bottom: 0.5rem;">00:00 - 04:00 (Bryan)</h4>
                <p><strong>Architecture &amp; Database Foundation:</strong> Monolith rationale (ADR-001), PostgreSQL migrations 0001–0027, session cookies (ADR-015), Transactional Outbox (ADR-006).</p>
              </div>
              <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem;">
                <h4 style="color: var(--accent); margin-bottom: 0.5rem;">04:00 - 08:00 (Aaron &amp; Bryan)</h4>
                <p><strong>Safety Review &amp; Lead Assignment:</strong> Event submission (E02), Safety Review FSM (ADR-013), and Lead queue restoration via SCRUM-261.</p>
              </div>
              <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem;">
                <h4 style="color: var(--accent); margin-bottom: 0.5rem;">08:00 - 12:00 (Amareet)</h4>
                <p><strong>Concurrency &amp; Technical Services:</strong> Two-phase lock hierarchy eliminating 40P01 deadlocks (PR #239), equipment reservation vs request (ADR-010).</p>
              </div>
              <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem;">
                <h4 style="color: var(--accent); margin-bottom: 0.5rem;">12:00 - 16:00 (Xiang Ying &amp; Dylan)</h4>
                <p><strong>Attendee Registration &amp; Changes:</strong> Multi-session registration (ADR-018), revision fingerprinting (PR #380), lost venue recovery (ADR-015).</p>
              </div>
              <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 10px; padding: 1.25rem;">
                <h4 style="color: var(--accent); margin-bottom: 0.5rem;">16:00 - 20:00 (All Hands)</h4>
                <p><strong>Defects Defense &amp; Q&amp;A:</strong> Defect D-04 honest admission (withheld to protect ADR-018), sprint velocity metrics, examiner Q&amp;A defense.</p>
              </div>
            </div>

            <!-- Team Accountability & Final Assessment Sign-Off -->
            <div class="section-header-box" style="margin-top: 3rem;">
              <div class="section-eyebrow">DELIVERY &amp; ACCOUNTABILITY</div>
              <h2 class="section-heading">Team Accountability &amp; Final Assessment Sign-Off</h2>
              <p class="section-lead">Roles, ownership boundaries, and 60 Done stories verified across Sprints 1 to 5.</p>
            </div>

            <div class="team-grid">
              {''.join(team_cards_html)}
            </div>
          </div>
        </section>
      </main>
    </div>
  </div>

  <script>
    (function() {{
      // DOM Elements
      const sidebar = document.getElementById('app-sidebar');
      const drawerToggle = document.getElementById('drawer-toggle');
      const drawerClose = document.getElementById('drawer-close');
      const drawerBackdrop = document.getElementById('drawer-backdrop');
      const viewTitle = document.getElementById('current-view-title');
      const navTabs = document.querySelectorAll('.nav-tab');
      const viewPanels = document.querySelectorAll('.view-panel');

      // Drawer Open / Close
      function openDrawer() {{
        if (sidebar) sidebar.classList.add('open');
        if (drawerBackdrop) drawerBackdrop.classList.add('active');
        if (drawerToggle) drawerToggle.setAttribute('aria-expanded', 'true');
      }}
      function closeDrawer() {{
        if (sidebar) sidebar.classList.remove('open');
        if (drawerBackdrop) drawerBackdrop.classList.remove('active');
        if (drawerToggle) drawerToggle.setAttribute('aria-expanded', 'false');
      }}
      if (drawerToggle) drawerToggle.addEventListener('click', openDrawer);
      if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
      if (drawerBackdrop) drawerBackdrop.addEventListener('click', closeDrawer);

      // View Switching
      function switchView(viewId) {{
        const targetPanel = document.getElementById(viewId);
        if (!targetPanel) return;

        // Update tabs
        navTabs.forEach(tab => {{
          if (tab.getAttribute('data-view') === viewId) {{
            tab.classList.add('active');
            const spanText = tab.querySelector('span:last-child');
            const iconText = tab.querySelector('.nav-tab-icon');
            if (viewTitle && spanText) {{
              viewTitle.textContent = (iconText ? iconText.textContent + ' ' : '') + spanText.textContent;
            }}
          }} else {{
            tab.classList.remove('active');
          }}
        }});

        // Update panels
        viewPanels.forEach(panel => {{
          if (panel.id === viewId) {{
            panel.style.display = 'block';
            panel.classList.add('active');
          }} else {{
            panel.style.display = 'none';
            panel.classList.remove('active');
          }}
        }});

        closeDrawer();
        window.scrollTo({{ top: 0, behavior: 'smooth' }});
      }}

      navTabs.forEach(tab => {{
        tab.addEventListener('click', () => {{
          const vid = tab.getAttribute('data-view');
          if (vid) switchView(vid);
        }});
      }});

      // --- Vault Filter Helper ---
      function setVaultFilter(filterName) {{
        currentVaultFilter = filterName;
        const vChips = document.querySelectorAll('.vault-filter-chip');
        vChips.forEach(c => {{
          if (c.getAttribute('data-vault-filter') === filterName) {{
            c.classList.add('active');
          }} else {{
            c.classList.remove('active');
          }}
        }});
      }}

      // Anchor Links & Deep Linking
      function handleTargetId(rawId) {{
        if (!rawId) return;
        const targetId = rawId.trim();
        if (targetId === 'overview') {{
          switchView('view-how-to-answer');
          return;
        }}
        if (targetId === 'details') {{
          switchView('view-defects-radar');
          return;
        }}
        if (targetId === 'next-steps') {{
          switchView('view-runbook');
          return;
        }}

        const lowerId = targetId.toLowerCase();
        let targetEl = document.getElementById(targetId) || document.getElementById(lowerId);

        // Fallback for ADR variations e.g. #ADR-018 or #adr-018 -> #adr-ADR-018
        if (!targetEl && lowerId.startsWith('adr-')) {{
          const num = targetId.split('-').pop();
          if (num) {{
            const padded = num.padStart(3, '0');
            targetEl = document.getElementById('adr-ADR-' + padded) || document.getElementById('adr-' + padded);
          }}
        }}

        if (!targetEl) return;

        // Check which panel contains targetEl
        const panel = targetEl.closest('.view-panel');
        if (panel) {{
          switchView(panel.id);

          if (panel.id === 'view-vault') {{
            if (lowerId.startsWith('clarification-')) {{
              setVaultFilter('clarification');
            }} else if (lowerId.startsWith('decision-')) {{
              setVaultFilter('decision');
            }} else if (lowerId.startsWith('adr-')) {{
              setVaultFilter('adr');
            }} else {{
              setVaultFilter('all');
            }}
            const vInp = document.getElementById('vault-search-input');
            if (vInp) vInp.value = '';
            filterVault();
          }} else if (panel.id === 'view-stories') {{
            targetEl.style.display = 'block';
            const drawer = targetEl.querySelector('.story-lineage-drawer');
            if (drawer) drawer.open = true;
          }} else if (panel.id === 'view-dossiers') {{
            targetEl.style.display = 'block';
          }}

          setTimeout(() => {{
            targetEl.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
            targetEl.classList.remove('target-highlight');
            void targetEl.offsetWidth; // trigger reflow
            targetEl.classList.add('target-highlight');
          }}, 80);
        }}
      }}

      window.addEventListener('hashchange', () => {{
        const hash = window.location.hash.replace('#', '');
        handleTargetId(hash);
      }});

      document.addEventListener('click', (e) => {{
        const link = e.target.closest('a');
        if (link) {{
          const href = link.getAttribute('href');
          if (href && href.startsWith('#')) {{
            const tid = href.slice(1);
            handleTargetId(tid);
          }}
        }}
      }});

      // Initial view check on load
      if (window.location.hash) {{
        handleTargetId(window.location.hash.replace('#', ''));
      }}

      // --- Dossier Category Filtering & Quick Jump ---
      const dossierChips = document.querySelectorAll('.dossier-filter-chip');
      const dossierJumps = document.querySelectorAll('.dossier-jump-chip');
      const dossierCards = document.querySelectorAll('.dossier-card');
      const dossierMeta = document.getElementById('dossier-meta');
      let currentDossierFilter = 'all';

      function filterDossiers() {{
        let visibleCount = 0;
        dossierCards.forEach(card => {{
          const cat = card.getAttribute('data-category') || '';
          if (currentDossierFilter === 'all' || cat === currentDossierFilter) {{
            card.style.display = 'block';
            visibleCount++;
          }} else {{
            card.style.display = 'none';
          }}
        }});
        if (dossierMeta) {{
          dossierMeta.textContent = `Showing ${{visibleCount}} of ${{dossierCards.length}} topic dossiers`;
        }}
      }}

      dossierChips.forEach(chip => {{
        chip.addEventListener('click', () => {{
          dossierChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          currentDossierFilter = chip.getAttribute('data-dossier-filter') || 'all';
          filterDossiers();
        }});
      }});

      dossierJumps.forEach(btn => {{
        btn.addEventListener('click', () => {{
          const targetId = btn.getAttribute('data-jump');
          if (!targetId) return;
          currentDossierFilter = 'all';
          dossierChips.forEach(c => {{
            if (c.getAttribute('data-dossier-filter') === 'all') c.classList.add('active');
            else c.classList.remove('active');
          }});
          filterDossiers();

          const targetEl = document.getElementById(targetId);
          if (targetEl) {{
            targetEl.scrollIntoView({{ behavior: 'smooth', block: 'start' }});
            targetEl.classList.remove('target-highlight');
            void targetEl.offsetWidth;
            targetEl.classList.add('target-highlight');
          }}
        }});
      }});

      // --- Story Search & Filtering ---
      const storyInput = document.getElementById('story-search-input');
      const storyClear = document.getElementById('story-search-clear');
      const storyMeta = document.getElementById('story-search-meta');
      const storyChips = document.querySelectorAll('.filter-chip');
      const toggleDrawersBtn = document.getElementById('toggle-all-drawers');
      const storyCards = document.querySelectorAll('.story-card');
      let currentStoryFilter = 'all';

      function filterStories() {{
        const q = (storyInput ? storyInput.value.trim().toLowerCase() : '');
        let visibleCount = 0;

        storyCards.forEach(card => {{
          const searchBlob = card.getAttribute('data-search') || '';
          const alias = card.getAttribute('data-alias') || '';
          const sid = card.getAttribute('data-sid') || '';
          const statusType = card.getAttribute('data-status') || '';
          const text = card.textContent.toLowerCase();

          const matchesQuery = !q || searchBlob.includes(q) || alias.includes(q) || sid.toLowerCase().includes(q) || text.includes(q);

          let matchesFilter = true;
          if (currentStoryFilter === 'done') {{
            matchesFilter = (statusType === 'done');
          }} else if (currentStoryFilter === 'defects') {{
            matchesFilter = (statusType === 'defect' || statusType === 'partial');
          }} else if (currentStoryFilter === 'lead') {{
            matchesFilter = searchBlob.includes('lead');
          }} else if (currentStoryFilter === 'coordinator') {{
            matchesFilter = searchBlob.includes('coordinator');
          }} else if (currentStoryFilter === 'admin') {{
            matchesFilter = searchBlob.includes('admin');
          }} else if (currentStoryFilter === 'student') {{
            matchesFilter = searchBlob.includes('student');
          }} else if (currentStoryFilter === 'technician') {{
            matchesFilter = searchBlob.includes('technician');
          }}

          if (matchesQuery && matchesFilter) {{
            card.style.display = 'block';
            visibleCount++;
            // Auto expand if search active
            if (q.length > 2) {{
              const drawer = card.querySelector('.story-lineage-drawer');
              if (drawer) drawer.open = true;
            }}
          }} else {{
            card.style.display = 'none';
          }}
        }});

        if (storyMeta) {{
          storyMeta.textContent = `Showing ${{visibleCount}} of ${{storyCards.length}} stories`;
        }}
      }}

      if (storyInput) storyInput.addEventListener('input', filterStories);
      if (storyClear) {{
        storyClear.addEventListener('click', () => {{
          storyInput.value = '';
          filterStories();
          storyInput.focus();
        }});
      }}
      storyChips.forEach(chip => {{
        chip.addEventListener('click', () => {{
          storyChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          currentStoryFilter = chip.getAttribute('data-story-filter') || 'all';
          filterStories();
        }});
      }});

      let drawersExpanded = false;
      if (toggleDrawersBtn) {{
        toggleDrawersBtn.addEventListener('click', () => {{
          drawersExpanded = !drawersExpanded;
          storyCards.forEach(card => {{
            if (card.style.display !== 'none') {{
              const drawer = card.querySelector('.story-lineage-drawer');
              if (drawer) drawer.open = drawersExpanded;
            }}
          }});
          toggleDrawersBtn.textContent = drawersExpanded ? 'Collapse All Details' : 'Expand All Details';
        }});
      }}

      // --- Vault Search & Filtering ---
      const vaultInput = document.getElementById('vault-search-input');
      const vaultClear = document.getElementById('vault-search-clear');
      const vaultMeta = document.getElementById('vault-search-meta');
      const vaultChips = document.querySelectorAll('.vault-filter-chip');
      const adrCards = document.querySelectorAll('.adr-card');
      const decisionCards = document.querySelectorAll('.decision-card');
      const clarificationCards = document.querySelectorAll('.clarification-card');
      const adrsBlock = document.getElementById('vault-adrs-block');
      const decisionsBlock = document.getElementById('vault-decisions-block');
      const clarificationsBlock = document.getElementById('vault-clarifications-block');
      let currentVaultFilter = 'all';

      function filterVault() {{
        const q = (vaultInput ? vaultInput.value.trim().toLowerCase() : '');
        let visibleCount = 0;

        // ADRs
        let adrVisible = 0;
        const showAdrs = (currentVaultFilter === 'all' || currentVaultFilter === 'adr');
        adrCards.forEach(card => {{
          const blob = card.getAttribute('data-search') || '';
          if (showAdrs && (!q || blob.includes(q))) {{
            card.style.display = 'block';
            adrVisible++;
          }} else {{
            card.style.display = 'none';
          }}
        }});
        if (adrsBlock) adrsBlock.style.display = (showAdrs && adrVisible > 0) ? 'block' : 'none';

        // Decisions
        let decVisible = 0;
        const showDecs = (currentVaultFilter === 'all' || currentVaultFilter === 'decision');
        decisionCards.forEach(card => {{
          const blob = card.getAttribute('data-search') || '';
          if (showDecs && (!q || blob.includes(q))) {{
            card.style.display = 'block';
            decVisible++;
          }} else {{
            card.style.display = 'none';
          }}
        }});
        if (decisionsBlock) decisionsBlock.style.display = (showDecs && decVisible > 0) ? 'block' : 'none';

        // Clarifications
        let clarVisible = 0;
        const showClars = (currentVaultFilter === 'all' || currentVaultFilter === 'clarification');
        clarificationCards.forEach(card => {{
          const blob = card.getAttribute('data-search') || '';
          if (showClars && (!q || blob.includes(q))) {{
            card.style.display = 'block';
            clarVisible++;
          }} else {{
            card.style.display = 'none';
          }}
        }});
        if (clarificationsBlock) clarificationsBlock.style.display = (showClars && clarVisible > 0) ? 'block' : 'none';

        visibleCount = adrVisible + decVisible + clarVisible;
        if (vaultMeta) {{
          vaultMeta.textContent = `Showing ${{visibleCount}} of 262 vault entries`;
        }}
      }}

      if (vaultInput) vaultInput.addEventListener('input', filterVault);
      if (vaultClear) {{
        vaultClear.addEventListener('click', () => {{
          vaultInput.value = '';
          filterVault();
          vaultInput.focus();
        }});
      }}
      vaultChips.forEach(chip => {{
        chip.addEventListener('click', () => {{
          vaultChips.forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          currentVaultFilter = chip.getAttribute('data-vault-filter') || 'all';
          filterVault();
        }});
      }});

      // --- Top Likely Answers Chips ---
      const topChips = document.querySelectorAll('.top-chip');
      topChips.forEach(chip => {{
        chip.addEventListener('click', () => {{
          const q = chip.getAttribute('data-query');
          if (!q) return;

          if (q === 'Four Defects') {{
            switchView('view-defects-radar');
          }} else if (q === 'Scrum Velocity') {{
            switchView('view-architecture');
            const fig = document.getElementById('vel-title');
            if (fig) setTimeout(() => fig.scrollIntoView({{ behavior: 'smooth' }}), 50);
          }} else {{
            switchView('view-stories');
            if (storyInput) {{
              storyInput.value = q;
              filterStories();
              storyInput.focus();
            }}
          }}
        }});
      }});

      // Keyboard navigation
      window.addEventListener('keydown', (e) => {{
        if ((e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) && document.activeElement !== storyInput && document.activeElement !== vaultInput) {{
          e.preventDefault();
          const activePanel = document.querySelector('.view-panel.active');
          if (activePanel && activePanel.id === 'view-vault' && vaultInput) {{
            vaultInput.focus();
            vaultInput.select();
          }} else if (storyInput) {{
            switchView('view-stories');
            storyInput.focus();
            storyInput.select();
          }}
        }} else if (e.key === 'Escape') {{
          closeDrawer();
        }}
      }});
    }})();
  </script>
</body>
</html>
"""
    return html_output


def main():
    print("Building modernized final Q&A prep guide...")
    html_content = build_html()
    OUTPUT_HTML_PATH.write_text(html_content, encoding="utf-8")
    print(f"Generated {OUTPUT_HTML_PATH} ({len(html_content)} characters) successfully!")


if __name__ == "__main__":
    main()
