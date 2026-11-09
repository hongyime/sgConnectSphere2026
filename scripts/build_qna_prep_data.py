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
        "route": "POST /api/events?copy=1 (KNOWN DEFECT D-04)",
        "controller": "backend/src/modules/eventLifecycle/service.ts",
        "migration": "0001_connectsphere_schema.sql",
        "component": "frontend/src/features/organiser/CompletedEvents.tsx",
        "spoken": "Intended to duplicate completed event requirements into a fresh draft with cleared dates per T-90/T-99; tracked as open defect D-04.",
        "limit": "Open defect D-04: Organiser UI lacks the copy button and API copy endpoint is not present on main; covered by expected-failure tests.",
        "evidence_pr": "Tracked in docs/testing/defects.md (SCRUM-259)",
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
        "route": "GET /api/internal/lead/queue (KNOWN DEFECT D-01)",
        "controller": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
        "migration": "0008_coordinator_assignment.sql",
        "component": "frontend/src/features/roleQueues/RoleQueues.tsx",
        "spoken": "Unassigned request queue for Event Coordinator Lead to assign submissions per C-69/T-83; tracked as open defect D-01.",
        "limit": "Open defect D-01: Main branch still auto-assigns via least-busy algorithm; Lead assignment queue code sits on unmerged feature/SCRUM-153 branch.",
        "evidence_pr": "Tracked in docs/testing/defects.md (SCRUM-256)",
        "code_link": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
    },
    "E03-S09": {
        "route": "POST /api/events?reassign=1&by_lead=1 (KNOWN DEFECT D-02)",
        "controller": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
        "migration": "0008_coordinator_assignment.sql",
        "component": "frontend/src/features/roleQueues/RoleQueues.tsx",
        "spoken": "Lead reassignment of active events without requiring incoming coordinator acceptance per T-83; tracked as open defect D-02.",
        "limit": "Open defect D-02: Endpoint returns 403 on main because Lead reassignment route was not merged from feature/SCRUM-153.",
        "evidence_pr": "Tracked in docs/testing/defects.md (SCRUM-257)",
        "code_link": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
    },
    "E03-S10": {
        "route": "GET /api/internal/lead/oversight (KNOWN DEFECT D-03)",
        "controller": "backend/src/modules/eventLifecycle/coordinatorAssignment.ts",
        "migration": "0008_coordinator_assignment.sql",
        "component": "frontend/src/features/roleQueues/RoleQueues.tsx",
        "spoken": "Lead global dashboard overseeing all active coordinators and workload distributions; tracked as open defect D-03.",
        "limit": "Open defect D-03: Endpoint returns 403 and Lead navigation omits oversight link on main; verified via test.fail test.",
        "evidence_pr": "Tracked in docs/testing/defects.md (SCRUM-258)",
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


def build_html() -> str:
    stories = parse_markdown_stories()
    all_cases, story_cases_map = parse_tc_coverage()
    defects = parse_defects()
    c_items = parse_clarifications()
    t_items = parse_decisions()

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
            "status": "Open Gaps (D-01–D-03)",
            "lineage": "C-69/C-104/C-128 → T-70/T-83 Lead queue & reassignment → Defects D-01, D-02, D-03",
            "hook": "We openly declare defects D-01 through D-03: Lead queue and reassignment were developed on feature/SCRUM-153 but not merged into main before code freeze, so main still executes the fallback auto-assignment path; we keep passing expected-failure tests rather than faking compliance.",
            "reality": "Lead workload queue and oversight view return 403 on main. Tracked honestly in docs/testing/defects.md with node:test todo / Playwright test.fail blocks.",
            "code": "backend/src/modules/eventLifecycle/repository.ts:assignCoordinatorOnSubmit",
            "test": "backend/tests/leadOversight.test.ts",
            "migration": "backend/database/migrations/0008_coordinator_assignment.sql",
            "tc": "TC_E03S08_01, TC_E03S09_01, TC_E03S10_01",
            "jira": "SCRUM-256 / SCRUM-257 / SCRUM-258",
            "pr": "feature/SCRUM-153 (unmerged)",
        },
        {
            "id": 11,
            "title": "Multi-Role Tenancy & Deactivation Cascades",
            "tag": "Security & Audit",
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

    # Pre-render Story Cards HTML
    story_cards_html = []
    for s in stories:
        sid = s["story_id"]
        safe_sid = sid.lower().replace("-", "")
        cases = s["test_cases"]
        active_cases = [c for c in cases if "active" in c["status"] or "✅" in c["status"]]
        defect_cases = [c for c in cases if "defect" in c["status"] or "⚠️" in c["status"]]
        scaffold_cases = [c for c in cases if "scaffold" in c["status"] or "⏳" in c["status"]]

        # Status badge (✅ Done, ⚠️ Partial, 🚨 Open defect)
        if sid in ["E03-S08", "E03-S09", "E03-S10"]:
            defect_map = {"E03-S08": "D-01", "E03-S09": "D-02", "E03-S10": "D-03"}
            status_badge_html = f'<span class="badge badge-defect">🚨 Open Defect ({defect_map[sid]})</span>'
        elif sid == "E02-S05":
            status_badge_html = '<span class="badge badge-defect">🚨 Open Defect (D-04)</span>'
        elif sid == "E06-S07":
            status_badge_html = '<span class="badge badge-partial">⚠️ Partial (Gate Incomplete)</span>'
        else:
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
        search_blob = f"{sid} {s['jira_key']} {s['title']} {s['owner']} {s['bdr']} {s['route']} {s['controller']} {s['migration']} {s['component']} {tc_ids_str} {s['spoken']} {s['limit']} {s['evidence_pr']}"

        tc_tags = "".join(
            f'<span class="badge badge-tc">{c["tc_id"]}</span> '
            for c in cases[:6]
        )
        if len(cases) > 6:
            tc_tags += f'<span class="badge badge-muted">+{len(cases)-6} more</span>'

        scenarios_html = "".join(
            f'<div class="scenario-box"><strong>{html.escape(sc["title"])}</strong><p>{html.escape(sc["text"])}</p></div>'
            for sc in s["scenarios"]
        )

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

        story_cards_html.append(f"""
        <article class="story-card" id="story-{sid}" data-sid="{sid}" data-alias="{alias_str}" data-search="{html.escape(search_blob)}">
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

    # Render Dossiers HTML
    dossiers_html = []
    for d in dossiers:
        d_search = f"{d['title']} {d['tag']} {d['status']} {d['jira']} {d['lineage']} {d['hook']} {d['reality']} {d['code']} {d['test']} {d['migration']} {d['tc']} {d['pr']} topic{d['id']} topic{d['id']:02d}"
        pr_numbers = re.findall(r"\d+", d["pr"])
        pr_aliases = " ".join([f"pr{n} pr-{n}" for n in pr_numbers])
        jira_keys = re.findall(r"SCRUM-\d+", d["jira"], re.I)
        jira_aliases = " ".join([f"{k.lower()} {k.lower().replace('-', '')}" for k in jira_keys])
        d_alias = f"topic{d['id']} topic{d['id']:02d} {d['tag'].lower()} {jira_aliases} {pr_aliases} {d['status'].lower()}"
        dossiers_html.append(f"""
        <article class="dossier-card" id="dossier-{d['id']}" data-alias="{d_alias}" data-search="{html.escape(d_search)}">
          <div class="dossier-header">
            <span class="dossier-number">TOPIC {d['id']:02d}</span>
            <span class="badge badge-tag">{d['tag']}</span>
            <span class="badge badge-status">{d['status']}</span>
            <span class="badge badge-jira">{d['jira']}</span>
          </div>
          <h3 class="dossier-title">{d['title']}</h3>
          <div class="dossier-lineage"><code>{d['lineage']}</code></div>

          <div class="spoken-hook-box">
            <span class="hook-label">SAY THIS FIRST (ELEVATOR DEFENSE)</span>
            <p class="hook-text">"{d['hook']}"</p>
          </div>

          <div class="dossier-body">
            <p><strong>Code Reality:</strong> {d['reality']}</p>
            <div class="dossier-grid">
              <div><strong>Primary Code:</strong> <code>{d['code']}</code></div>
              <div><strong>Real DB Test:</strong> <code>{d['test']}</code></div>
              <div><strong>DB Migration:</strong> <code>{d['migration']}</code></div>
              <div><strong>Key Test Cases:</strong> <code>{d['tc']}</code></div>
            </div>
          </div>
        </article>
        """)

    DEFECT_SPOKEN_HOOKS = {
        "D-01": "Lead Coordinator unassigned review queue was engineered on branch feature/SCRUM-153 but withheld from main at code freeze to protect core pipeline stability; on main, submissions safely execute the verified round-robin auto-assignment path.",
        "D-02": "Lead reassignment of coordinator requests is tracked under defect D-02 as part of the unmerged feature/SCRUM-153 branch; main preserves existing coordinator assignment integrity and strictly rejects unauthenticated coordinator reassignment.",
        "D-03": "Defect D-03 documents Lead unassigned request oversight; requests remain tracked in PostgreSQL under under_review status, and we maintain automated failing end-to-end tests rather than masking incomplete UI filters.",
        "D-04": "Defect D-04 documents event request cloning (SCRUM-259); creation of new events from scratch is 100% verified, and we rejected a last-minute clone patch that risked corrupting child session envelope relationships.",
    }

    # Render Defects Radar HTML
    defects_html = []
    # Add unmerged branch callout first
    defects_html.append(f"""
    <div class="branch-callout-card" id="defect-branch-scrum-153" data-search="feature/SCRUM-153 unmerged branch lead coordinator queue reassignment oversight scrum-153 scrum-154 scrum-155">
      <div class="branch-callout-header">
        <span class="badge badge-defect">Unmerged Branch</span>
        <span class="branch-callout-title">feature/SCRUM-153 (Lead Oversight Workflows)</span>
      </div>
      <p class="branch-callout-desc">Contains full implementation for Lead Coordinator queue, reassignment, and oversight (SCRUM-153, 154, 155). Preserved unmerged on remote branch to avoid regression risk to Sprint 4 release candidate; tracked honestly as open defects D-01 through D-03 with automated failing end-to-end assertions.</p>
      <div class="spoken-hook-box">
        <span class="hook-label">SAY THIS FIRST (BRANCH REALITY)</span>
        <p class="hook-text">"Feature branch feature/SCRUM-153 holds working code for Lead triage and reassignment, but we deliberately withheld the PR merge at code freeze to prevent regression of verified coordinator flows."</p>
      </div>
    </div>
    """)

    for df in defects:
        hook_text = DEFECT_SPOKEN_HOOKS.get(df["id"], "Open gap tracked with failing automated tests in accordance with DoD.")
        defects_html.append(f"""
        <div class="defect-card" id="defect-{df['id'].lower()}" data-search="{df['id']} {df['jira']} {df['story']} {df['summary']} {df['tc_ids']} {df['found_in']} {hook_text} open defect defect">
          <div class="defect-header">
            <span class="defect-id">{df['id']}</span>
            <a href="{JIRA_BASE_URL}/{df['jira']}" target="_blank" rel="noopener" class="jira-pill">{df['jira']}</a>
            <span class="badge badge-defect">{df['status']}</span>
          </div>
          <h4 class="defect-title">{html.escape(df['story'])}</h4>
          <p class="defect-summary">{html.escape(df['summary'])}</p>
          <div class="spoken-hook-box" style="margin: 8px 0;">
            <span class="hook-label">SAY THIS FIRST (DEFENSE HOOK)</span>
            <p class="hook-text">"{hook_text}"</p>
          </div>
          <div class="defect-meta">
            <div><strong>Cases:</strong> <code>{df['tc_ids']}</code></div>
            <div><strong>Discovery:</strong> {df['found_in']}</div>
          </div>
        </div>
        """)

    # Render Team Decisions HTML
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
        <article class="decision-card bdr-card" id="decision-{tid.lower()}" data-tid="{tid.lower()}" data-alias="{t_alias}" data-search="{html.escape(t_search)}">
          <div class="decision-header">
            <span class="decision-id">{tid}</span>
            <span class="decision-affects">{html.escape(t['affects'])}</span>
          </div>
          <h4 class="decision-title">{html.escape(t['decision'])}</h4>
          <p class="decision-rationale"><strong>Rationale:</strong> {html.escape(t['rationale'])}</p>
          <div class="decision-meta">
            {follows_html}
          </div>
        </article>
        """)

    # Render Customer Clarifications HTML
    clarifications_cards_html = []
    for c in c_items:
        cid = c["id"]
        safe_cid = cid.lower().replace("-", "")
        c_alias = f"{cid.lower()} {safe_cid}"
        c_search = f"{cid} {c['who']} {c['sec']} {c['question']} {c['answer']} {c['settled']} {c['status']}"
        clarifications_cards_html.append(f"""
        <article class="clarification-card bdr-card" id="clarification-{cid.lower()}" data-cid="{cid.lower()}" data-alias="{c_alias}" data-search="{html.escape(c_search)}">
          <div class="clarification-header">
            <span class="clarification-id">{cid}</span>
            <span class="clarification-who">{html.escape(c['who'])} ({html.escape(c['sec'])})</span>
            <span class="badge badge-tag">{html.escape(c['status'])}</span>
          </div>
          <p class="clarification-question"><strong>Q:</strong> {html.escape(c['question'])}</p>
          <p class="clarification-answer"><strong>A:</strong> {html.escape(c['answer'])}</p>
          <div class="clarification-settled"><strong>Settled:</strong> {html.escape(c['settled'])}</div>
        </article>
        """)

    # Build the full page
    html_content = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="dark">
  <meta name="description" content="ConnectSphere Final Assessment Q&amp;A Preparation Guide and Exam Cockpit">
  <title>ConnectSphere · Exam Cockpit &amp; Proof Router</title>
  <style>
    :root {{
      --bg: #0f1821;
      --panel: #172733;
      --raised: #1f3445;
      --border: #2c4559;
      --text: #e8edf2;
      --muted: #9db2c4;
      --cyan: #75d6c2;
      --yellow: #ffd166;
      --pink: #ff9f9f;
      --blue: #78a7ff;
      --green: #48bb78;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color-scheme: dark;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    html {{ scroll-behavior: smooth; scroll-padding-top: 100px; }}
    body {{
      background: var(--bg);
      color: var(--text);
      font-size: 15px;
      line-height: 1.6;
    }}
    a {{ color: var(--cyan); text-decoration: none; text-underline-offset: 3px; }}
    a:hover {{ text-decoration: underline; color: #a2f2e1; }}
    code {{
      font-family: ui-monospace, SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.9em;
      background: rgba(117, 214, 194, 0.1);
      color: var(--cyan);
      padding: 2px 6px;
      border-radius: 4px;
    }}

    /* Layout */
    .app-container {{
      max-width: 1280px;
      margin: 0 auto;
      padding: 0 20px 60px;
    }}

    /* Sticky Search Header */
    .sticky-header {{
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(15, 24, 33, 0.95);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--border);
      padding: 16px 0;
      margin-bottom: 24px;
    }}
    .header-content {{
      max-width: 1280px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 20px;
    }}
    .brand-title {{
      font-size: 18px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .brand-pill {{
      background: var(--cyan);
      color: #0f1821;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .search-box {{
      flex: 1;
      min-width: 280px;
      max-width: 540px;
      position: relative;
    }}
    .search-input {{
      width: 100%;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      color: #fff;
      padding: 10px 14px 10px 38px;
      font-size: 14px;
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }}
    .search-input:focus {{
      border-color: var(--cyan);
      box-shadow: 0 0 0 3px rgba(117, 214, 194, 0.2);
    }}
    .search-icon {{
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--muted);
      pointer-events: none;
    }}
    .top-nav {{
      display: flex;
      gap: 12px;
    }}
    .nav-btn {{
      padding: 6px 12px;
      border-radius: 6px;
      background: var(--raised);
      color: var(--text);
      font-size: 13px;
      font-weight: 600;
      border: 1px solid var(--border);
    }}
    .nav-btn:hover {{
      background: var(--panel);
      color: var(--cyan);
      text-decoration: none;
    }}

    /* How To Answer Strip */
    .how-to-answer-banner {{
      background: linear-gradient(135deg, rgba(17, 34, 51, 0.95), rgba(13, 27, 42, 0.95));
      border: 2px solid var(--blue);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
    }}
    .hta-header {{
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
      flex-wrap: wrap;
    }}
    .hta-badge {{
      background: #0052cc;
      color: #fff;
      font-weight: 800;
      font-size: 11px;
      letter-spacing: 0.5px;
      padding: 4px 10px;
      border-radius: 4px;
    }}
    .hta-header h2 {{
      font-size: 20px;
      font-weight: 800;
      color: #fff;
      margin: 0;
    }}
    .hta-flow-box {{
      background: rgba(120, 167, 255, 0.08);
      border-left: 4px solid var(--blue);
      padding: 14px 18px;
      border-radius: 0 8px 8px 0;
      margin-bottom: 16px;
    }}
    .hta-flow-sequence {{
      font-size: 16px;
      font-weight: 700;
      color: var(--blue);
      margin-bottom: 6px;
    }}
    .hta-flow-instruction {{
      font-size: 14px;
      color: var(--text);
      line-height: 1.5;
      margin: 0;
    }}
    .hta-template-box {{
      background: rgba(15, 24, 33, 0.7);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
    }}
    .hta-template-title {{
      font-size: 13px;
      font-weight: 700;
      color: var(--yellow);
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .hta-template-quote {{
      margin: 0 0 10px 0;
      padding-left: 12px;
      border-left: 3px solid var(--yellow);
      font-size: 14px;
      color: #e2e8f0;
      line-height: 1.6;
    }}
    .hta-template-quote p {{
      margin: 3px 0;
    }}
    .hta-example-note {{
      font-size: 12px;
      color: var(--muted);
      border-top: 1px dashed var(--border);
      padding-top: 8px;
      margin-top: 8px;
      line-height: 1.45;
    }}
    .hta-legend-row {{
      display: flex;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 13px;
      padding-top: 12px;
      border-top: 1px solid var(--raised);
    }}
    .legend-title {{
      font-weight: 700;
      color: var(--muted);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }}
    .legend-item {{
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: var(--text);
    }}

    /* Top Likely Answers Bar */
    .top-answers-panel {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 18px;
      margin-bottom: 24px;
    }}
    .top-answers-label {{
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.6px;
      color: var(--cyan);
      margin-bottom: 10px;
    }}
    .top-answers-chips {{
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }}
    .top-chip {{
      background: var(--raised);
      border: 1px solid var(--border);
      color: var(--text);
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 20px;
      cursor: pointer;
      transition: all 0.15s ease;
      font-family: inherit;
    }}
    .top-chip:hover {{
      background: rgba(117, 214, 194, 0.15);
      border-color: var(--cyan);
      color: #fff;
    }}
    .top-chip-defect:hover {{
      background: rgba(255, 159, 159, 0.15);
      border-color: var(--pink);
      color: #fff;
    }}

    /* Banner & Radar */
    .cockpit-banner {{
      background: linear-gradient(135deg, #172733 0%, #1a2f3f 100%);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
    }}
    .banner-header {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
      flex-wrap: wrap;
      gap: 12px;
    }}
    .banner-title h1 {{
      font-size: 26px;
      font-weight: 750;
      color: #fff;
      margin-bottom: 4px;
    }}
    .banner-sub {{
      color: var(--muted);
      font-size: 14px;
    }}
    .kpi-row {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }}
    .kpi-card {{
      background: rgba(15, 24, 33, 0.7);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
    }}
    .kpi-val {{
      font-size: 24px;
      font-weight: 750;
      color: var(--cyan);
      display: block;
      margin-bottom: 2px;
    }}
    .kpi-label {{
      font-size: 12px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}

    /* Section Headings */
    .section-title-wrap {{
      margin: 40px 0 20px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px;
    }}
    .section-title {{
      font-size: 22px;
      font-weight: 700;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 10px;
    }}
    .section-desc {{
      color: var(--muted);
      font-size: 14px;
      margin-bottom: 20px;
    }}

    /* Badges & Pills */
    .badge {{
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      vertical-align: middle;
    }}
    .badge-sprint {{ background: rgba(120, 167, 255, 0.15); color: var(--blue); border: 1px solid rgba(120, 167, 255, 0.3); }}
    .badge-points {{ background: rgba(255, 209, 102, 0.15); color: var(--yellow); border: 1px solid rgba(255, 209, 102, 0.3); }}
    .badge-owner {{ background: rgba(157, 178, 196, 0.15); color: var(--muted); }}
    .badge-tc {{ background: rgba(117, 214, 194, 0.15); color: var(--cyan); }}
    .badge-tag {{ background: rgba(120, 167, 255, 0.2); color: var(--blue); }}
    .badge-status {{ background: rgba(72, 187, 120, 0.2); color: var(--green); }}
    .badge-partial {{ background: rgba(255, 209, 102, 0.2); color: var(--yellow); border: 1px solid rgba(255, 209, 102, 0.4); }}
    .badge-decision {{ background: rgba(120, 167, 255, 0.2); color: var(--blue); border: 1px solid rgba(120, 167, 255, 0.4); }}
    .badge-jira {{ background: rgba(255, 209, 102, 0.2); color: var(--yellow); }}
    .badge-defect {{ background: rgba(255, 159, 159, 0.2); color: var(--pink); border: 1px solid var(--pink); }}
    .badge-muted {{ background: var(--raised); color: var(--muted); }}

    .jira-pill {{
      background: #0052cc;
      color: #fff;
      font-weight: 700;
      font-size: 11px;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
    }}
    .jira-pill:hover {{ text-decoration: none; opacity: 0.9; }}

    /* Grid Layouts */
    .dossier-grid-layout {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 16px;
      margin-bottom: 36px;
    }}
    .dossier-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }}
    .dossier-header {{
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }}
    .dossier-number {{
      font-size: 11px;
      font-weight: 800;
      color: var(--cyan);
      font-family: ui-monospace, Consolas, monospace;
    }}
    .dossier-title {{
      font-size: 17px;
      font-weight: 700;
      color: #fff;
      line-height: 1.3;
    }}
    .dossier-lineage {{
      font-size: 12px;
      color: var(--muted);
    }}

    .spoken-hook-box {{
      background: rgba(117, 214, 194, 0.08);
      border-left: 3px solid var(--cyan);
      padding: 10px 12px;
      border-radius: 0 6px 6px 0;
    }}
    .hook-label {{
      display: block;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: var(--cyan);
      margin-bottom: 4px;
    }}
    .hook-text {{
      font-size: 13.5px;
      color: #fff;
      font-style: italic;
      line-height: 1.45;
    }}

    .dossier-body p {{
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 8px;
    }}
    .dossier-grid {{
      font-size: 12px;
      background: rgba(15, 24, 33, 0.6);
      padding: 8px 10px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }}

    /* Defects Radar */
    .radar-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
      margin-bottom: 36px;
    }}
    .defect-card {{
      background: rgba(255, 159, 159, 0.05);
      border: 1px solid rgba(255, 159, 159, 0.3);
      border-radius: 8px;
      padding: 16px;
    }}
    .defect-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }}
    .defect-id {{
      font-weight: 800;
      color: var(--pink);
      font-family: ui-monospace, Consolas, monospace;
    }}
    .defect-title {{
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 6px;
    }}
    .defect-summary {{
      font-size: 13px;
      color: var(--muted);
      margin-bottom: 10px;
      line-height: 1.45;
    }}
    .defect-meta {{
      font-size: 12px;
      color: var(--muted);
    }}

    /* Diagram Panels */
    .diagram-panel {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 32px;
      overflow-x: auto;
    }}
    .diagram-panel svg {{
      display: block;
      width: 100%;
      min-width: 720px;
      height: auto;
    }}
    .diagram-caption {{
      font-size: 13px;
      color: var(--muted);
      margin-top: 12px;
      text-align: center;
    }}

    /* Story Cards */
    .story-list {{
      display: flex;
      flex-direction: column;
      gap: 16px;
    }}
    .story-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px;
      transition: border-color 0.2s;
    }}
    .story-card:hover {{
      border-color: rgba(117, 214, 194, 0.4);
    }}
    .story-header {{
      margin-bottom: 12px;
    }}
    .story-title-row {{
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 6px;
    }}
    .story-id {{
      font-size: 13px;
      font-weight: 800;
      color: var(--cyan);
      font-family: ui-monospace, Consolas, monospace;
    }}
    .story-title {{
      font-size: 18px;
      font-weight: 700;
      color: #fff;
    }}
    .story-meta-grid {{
      font-size: 13px;
      color: var(--muted);
      margin: 10px 0;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 6px;
    }}
    .story-evidence-links {{
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      margin: 12px 0 8px;
      padding-top: 10px;
      border-top: 1px solid var(--raised);
    }}
    .ev-link {{
      font-size: 12px;
      font-weight: 600;
      background: var(--raised);
      padding: 4px 10px;
      border-radius: 5px;
      border: 1px solid var(--border);
    }}
    .ev-link-run {{ background: rgba(72, 187, 120, 0.1); border-color: rgba(72, 187, 120, 0.3); color: var(--green); }}
    .ev-link-partial {{ background: rgba(255, 209, 102, 0.1); border-color: rgba(255, 209, 102, 0.3); color: var(--yellow); }}
    .ev-link-defect {{ background: rgba(255, 159, 159, 0.1); border-color: rgba(255, 159, 159, 0.3); color: var(--pink); }}
    .ev-badge {{
      font-size: 12px;
      color: var(--muted);
      margin-left: auto;
    }}
    .tc-summary-row {{
      margin: 8px 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }}

    /* Lineage Drawer */
    .story-lineage-drawer {{
      margin-top: 12px;
      border-top: 1px dashed var(--border);
      padding-top: 10px;
    }}
    .drawer-toggle {{
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: var(--cyan);
      user-select: none;
    }}
    .drawer-toggle:hover {{
      color: #a2f2e1;
    }}
    .drawer-content {{
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }}
    .lineage-section h4 {{
      font-size: 14px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .scenario-box {{
      background: rgba(15, 24, 33, 0.7);
      border-left: 2px solid var(--blue);
      padding: 8px 12px;
      border-radius: 0 4px 4px 0;
      margin-bottom: 8px;
      font-size: 13px;
    }}
    .scenario-box strong {{
      display: block;
      color: var(--blue);
      margin-bottom: 2px;
    }}
    .tech-table {{
      font-size: 12.5px;
      background: rgba(15, 24, 33, 0.7);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 10px 14px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}
    .tc-detail-list {{
      list-style: none;
      font-size: 12.5px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }}
    .tc-detail-list li {{
      background: rgba(15, 24, 33, 0.7);
      padding: 8px 12px;
      border-radius: 6px;
    }}
    .tc-status {{
      float: right;
      font-size: 11px;
    }}

    /* Definition of Done Checklist */
    .dod-checklist {{
      list-style: none;
      font-size: 12.5px;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}
    .dod-checklist li {{
      background: rgba(15, 24, 33, 0.7);
      padding: 8px 12px;
      border-radius: 6px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
      line-height: 1.4;
    }}
    .chk-icon {{
      color: var(--cyan);
      font-weight: bold;
    }}

    /* Branch Callout Card */
    .branch-callout-card {{
      background: rgba(255, 159, 159, 0.08);
      border: 1px solid rgba(255, 159, 159, 0.3);
      border-radius: 8px;
      padding: 16px;
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }}
    .branch-callout-header {{
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .branch-callout-title {{
      font-size: 15px;
      font-weight: 700;
      color: var(--pink);
    }}
    .branch-callout-desc {{
      font-size: 13px;
      color: var(--text);
      line-height: 1.45;
    }}

    /* BDR Registers */
    .bdr-container-drawer {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
    }}
    .bdr-drawer-toggle {{
      cursor: pointer;
      font-size: 15px;
      font-weight: 700;
      color: var(--cyan);
      user-select: none;
    }}
    .bdr-drawer-toggle:hover {{
      color: #a2f2e1;
    }}
    .bdr-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 14px;
      margin-top: 16px;
    }}
    .bdr-card {{
      background: rgba(15, 24, 33, 0.85);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transition: border-color 0.2s;
    }}
    .bdr-card:hover {{
      border-color: rgba(117, 214, 194, 0.4);
    }}
    .decision-header, .clarification-header {{
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }}
    .decision-id, .clarification-id {{
      font-family: ui-monospace, Consolas, monospace;
      font-size: 13px;
      font-weight: 800;
      color: var(--cyan);
      background: rgba(117, 214, 194, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
      border: 1px solid rgba(117, 214, 194, 0.3);
    }}
    .decision-affects, .clarification-who {{
      font-size: 12px;
      color: var(--yellow);
      font-weight: 600;
    }}
    .decision-title {{
      font-size: 14px;
      font-weight: 700;
      color: #fff;
    }}
    .decision-rationale, .clarification-question, .clarification-answer {{
      font-size: 12.5px;
      color: var(--muted);
      line-height: 1.45;
    }}
    .clarification-question strong {{
      color: var(--blue);
    }}
    .clarification-answer strong {{
      color: var(--cyan);
    }}
    .clarification-settled {{
      font-size: 12px;
      background: rgba(23, 39, 51, 0.8);
      border-left: 2px solid var(--yellow);
      padding: 6px 10px;
      border-radius: 0 4px 4px 0;
      color: var(--text);
    }}
    .decision-meta {{
      font-size: 11.5px;
      color: var(--muted);
      border-top: 1px solid var(--raised);
      padding-top: 6px;
    }}
    .search-count-badge {{
      font-size: 12px;
      font-weight: 600;
      color: var(--cyan);
      background: rgba(117, 214, 194, 0.1);
      border: 1px solid rgba(117, 214, 194, 0.3);
      padding: 4px 10px;
      border-radius: 20px;
      white-space: nowrap;
    }}
    .search-clear-btn {{
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: var(--muted);
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
    }}
    .search-clear-btn:hover {{
      color: #fff;
    }}

    /* Accountability Grid */
    .team-grid {{
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      margin-bottom: 32px;
    }}
    .team-card {{
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }}
    .team-name {{
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 2px;
    }}
    .team-role {{
      font-size: 12px;
      color: var(--cyan);
      font-weight: 600;
      margin-bottom: 8px;
    }}
    .team-pitch {{
      font-size: 13px;
      color: var(--muted);
      line-height: 1.45;
    }}

    /* Rehearsal Protocols */
    .protocol-card {{
      background: var(--panel);
      border-left: 4px solid var(--yellow);
      border-radius: 0 8px 8px 0;
      padding: 18px;
      margin-bottom: 16px;
    }}
    .protocol-title {{
      font-size: 16px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 8px;
    }}
    .protocol-card ol, .protocol-card ul {{
      padding-left: 20px;
      font-size: 13.5px;
      color: var(--muted);
    }}
    .protocol-card li {{
      margin-bottom: 6px;
    }}

    /* Footer */
    .page-footer {{
      margin-top: 60px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      display: flex;
      justify-content: space-between;
      color: var(--muted);
      font-size: 12px;
      flex-wrap: wrap;
      gap: 12px;
    }}

    /* Responsive */
    @media (max-width: 768px) {{
      .header-content {{ padding: 0 16px; }}
      .app-container {{ padding: 0 16px 40px; }}
      .banner-title h1 {{ font-size: 20px; }}
      .kpi-row {{ grid-template-columns: 1fr 1fr; }}
      .dossier-grid-layout {{ grid-template-columns: 1fr; }}
    }}
  </style>
</head>
<body>

  <!-- Sticky Top Search Header -->
  <header class="sticky-header">
    <div class="header-content">
      <div class="brand-title">
        <span>ConnectSphere</span>
        <span class="brand-pill">Exam Cockpit</span>
      </div>
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input type="search" id="global-search" class="search-input" placeholder="Proof Router: search exact ID (e.g. TC_E07S07_03, PR-239, T-79, D-01) or topic..." aria-label="Search across all evidence, stories, and test cases">
        <button id="search-clear-btn" class="search-clear-btn" type="button" title="Clear search (Esc)" aria-label="Clear search">✕</button>
      </div>
      <div id="search-count" class="search-count-badge" aria-live="polite">All 65 Stories · 391 functional + 3 cross-cutting = 394 cases · {len(t_items)} Decisions · {len(c_items)} Clarifications</div>
      <nav class="top-nav" aria-label="Main Navigation">
        <a href="#overview" class="nav-btn">01 Overview</a>
        <a href="#details" class="nav-btn">02 Dossiers &amp; Archive</a>
        <a href="#next-steps" class="nav-btn">03 Exam Drill</a>
      </nav>
    </div>
  </header>

  <div class="app-container">

    <!-- SECTION 1: OVERVIEW -->
    <section id="overview" aria-labelledby="overview-heading">

      <!-- How to Answer Banner -->
      <aside class="how-to-answer-banner" aria-label="How to Answer Guide">
        <div class="hta-header">
          <span class="hta-badge">🎯 EXAM ORAL DEFENSE PROTOCOL</span>
          <h2>How to Answer Any Examiner Question</h2>
        </div>
        <div class="hta-flow-box">
          <p class="hta-flow-sequence"><strong>Answer in this order:</strong> What it does → Why we chose it → Proof → Boundary.</p>
          <p class="hta-flow-instruction">Search the story ID or topic. Say the blue &ldquo;Say This First&rdquo; sentence. Open lineage only when asked for proof. If incomplete, say the limitation&mdash;never improvise.</p>
        </div>

        <div class="hta-template-box">
          <div class="hta-template-title">🗣️ 5-Sentence Rehearsable Answer Pattern</div>
          <blockquote class="hta-template-quote">
            <p>&ldquo;This feature lets <strong>[role]</strong> do <strong>[business outcome]</strong>.</p>
            <p>We chose it because <strong>[requirement/risk]</strong>.</p>
            <p>The key trade-off was <strong>[alternative rejected]</strong>.</p>
            <p>We prove it with <strong>[PR/run/code path]</strong>.</p>
            <p>Its current boundary is <strong>[honest limitation]</strong>.&rdquo;</p>
          </blockquote>
          <div class="hta-example-note">
            <em>Example (Venue Block precision):</em> Do <strong>not</strong> say it &ldquo;prevents blocks over confirmed bookings.&rdquo; State precisely:
            <em>&ldquo;A venue block can be created over confirmed bookings without being blocked: the block saves, overlapping bookings become Conflicting, and the confirmed event returns to Planning for resolution.&rdquo;</em>
          </div>
        </div>

        <div class="hta-legend-row">
          <span class="legend-title">Legend:</span>
          <span class="legend-item"><span class="badge badge-status">✅ Done</span> Code, tests, and evidence linked</span>
          <span class="legend-item"><span class="badge badge-partial">⚠️ Partial</span> Implemented but evidence/gate incomplete</span>
          <span class="legend-item"><span class="badge badge-defect">🚨 Open defect</span> Not counted as Done</span>
          <span class="legend-item"><span class="badge badge-decision">📌 Historical decision</span> Context, not proof of delivery</span>
        </div>
      </aside>

      <!-- Top Likely Answers Bar -->
      <div class="top-answers-panel" aria-label="Top Likely Assessment Answers">
        <div class="top-answers-label">⚡ TOP LIKELY EXAM ANSWERS (ONE-CLICK FILTER):</div>
        <div class="top-answers-chips">
          <button type="button" class="top-chip" data-query="safety review">🛡️ Safety Review</button>
          <button type="button" class="top-chip" data-query="venue loss">🏢 Venue Loss</button>
          <button type="button" class="top-chip" data-query="booking race">⚡ Booking Race</button>
          <button type="button" class="top-chip" data-query="tentative holds">⏳ Holds</button>
          <button type="button" class="top-chip" data-query="attendee capacity">👥 Attendee Capacity</button>
          <button type="button" class="top-chip" data-query="outbox">📬 Outbox</button>
          <button type="button" class="top-chip" data-query="scrum velocity">📈 Scrum Velocity</button>
          <button type="button" class="top-chip" data-query="ai governance">🤖 AI Governance</button>
          <button type="button" class="top-chip top-chip-defect" data-query="open defect">🚨 Four Defects</button>
        </div>
      </div>

      <div class="cockpit-banner">
        <div class="banner-header">
          <div class="banner-title">
            <h1 id="overview-heading">Final Assessment Defense Cockpit</h1>
            <p class="banner-sub">20-Minute Live Oral Interrogation &amp; Code-Tracing Master Guide · 391 functional story cases + 3 cross-cutting DoD/performance cases = 394 workbook cases · IS212 Software Project Management</p>
          </div>
          <div class="banner-badge">
            <span class="badge badge-status">Release 1 · Evidence Gated</span>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <span class="kpi-val">65</span>
            <span class="kpi-label">Release 1 User Stories</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">394</span>
            <span class="kpi-label">Workbook Cases (391 Functional + 3 DoD/Perf)</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">249</span>
            <span class="kpi-label">Human Manual Executions</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">{len(t_items)}</span>
            <span class="kpi-label">Team Decisions (T-01..T-108)</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">{len(c_items)}</span>
            <span class="kpi-label">Customer Clarifications (C-01..C-136)</span>
          </div>
          <div class="kpi-card">
            <span class="kpi-val">4</span>
            <span class="kpi-label">Declared Open Defects</span>
          </div>
        </div>
      </div>

      <!-- Known Defects Radar -->
      <div class="section-title-wrap">
        <h2 class="section-title">🚨 Declared Open Defects Radar (D-01 to D-04)</h2>
        <span class="badge badge-defect">Admit honestly · do not count as Done</span>
      </div>
      <p class="section-desc">Four known defects are formally tracked in <code>docs/testing/defects.md</code> and committed with expected-failure test declarations. In the oral exam, declare these immediately when asked about coordinator assignment or event copy.</p>
      <div class="radar-grid">
        {''.join(defects_html)}
      </div>

      <!-- C4 Architecture Diagram -->
      <div class="section-title-wrap">
        <h2 class="section-title">📐 C4 Architecture: Container Diagram</h2>
        <span class="badge badge-tag">System Topology</span>
      </div>
      <figure class="diagram-panel">
        <svg viewBox="0 0 960 420" role="img" aria-labelledby="c4-title c4-desc">
          <title id="c4-title">C4 Container Architecture of ConnectSphere</title>
          <desc id="c4-desc">ConnectSphere C4 container diagram illustrating the React Single Page Application, Node.js API layer with cookie sessions, Supabase PostgreSQL database with dual public and test schemas, background transactional outbox worker, and external Brevo transactional email API.</desc>
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="#75d6c2"/>
            </marker>
          </defs>

          <!-- SPA Container -->
          <rect x="40" y="60" width="240" height="150" rx="10" fill="#172733" stroke="#2c4559" stroke-width="2"/>
          <text x="160" y="95" fill="#75d6c2" font-size="16" font-weight="bold" text-anchor="middle">Single-Page App</text>
          <text x="160" y="120" fill="#9db2c4" font-size="12" text-anchor="middle">React 18 · TypeScript · Vite</text>
          <text x="160" y="145" fill="#e8edf2" font-size="11" text-anchor="middle">Organiser · Coordinator · Venue Staff</text>
          <text x="160" y="165" fill="#e8edf2" font-size="11" text-anchor="middle">Tech Staff · Safety Officer · Lead</text>
          <text x="160" y="190" fill="#ffd166" font-size="11" text-anchor="middle">Same-origin HTTP-only cookies</text>

          <!-- API Gateway Container -->
          <rect x="360" y="60" width="240" height="150" rx="10" fill="#172733" stroke="#75d6c2" stroke-width="2"/>
          <text x="480" y="95" fill="#75d6c2" font-size="16" font-weight="bold" text-anchor="middle">API Server / Serverless</text>
          <text x="480" y="120" fill="#9db2c4" font-size="12" text-anchor="middle">Node.js 20 · TypeScript</text>
          <text x="480" y="145" fill="#e8edf2" font-size="11" text-anchor="middle">Role-based Access Middleware</text>
          <text x="480" y="165" fill="#e8edf2" font-size="11" text-anchor="middle">Optimistic Revision Checks</text>
          <text x="480" y="190" fill="#78a7ff" font-size="11" text-anchor="middle">Atomic Savepoints &amp; Rollbacks</text>

          <!-- Database Container -->
          <rect x="680" y="60" width="240" height="150" rx="10" fill="#172733" stroke="#2c4559" stroke-width="2"/>
          <text x="800" y="95" fill="#75d6c2" font-size="16" font-weight="bold" text-anchor="middle">Database</text>
          <text x="800" y="120" fill="#9db2c4" font-size="12" text-anchor="middle">PostgreSQL 17 (Supabase)</text>
          <text x="800" y="145" fill="#e8edf2" font-size="11" text-anchor="middle">Dual 'public' and 'test' schemas</text>
          <text x="800" y="165" fill="#e8edf2" font-size="11" text-anchor="middle">Exclusion Constraints (0016)</text>
          <text x="800" y="190" fill="#ffd166" font-size="11" text-anchor="middle">Row-Level Security (RLS)</text>

          <!-- Outbox Relay Worker -->
          <rect x="360" y="270" width="240" height="100" rx="10" fill="#1f3445" stroke="#2c4559" stroke-width="2"/>
          <text x="480" y="300" fill="#75d6c2" font-size="14" font-weight="bold" text-anchor="middle">Outbox Relay Worker</text>
          <text x="480" y="325" fill="#9db2c4" font-size="11" text-anchor="middle">Background Dispatch Daemon</text>
          <text x="480" y="345" fill="#e8edf2" font-size="11" text-anchor="middle">Polls notification_outbox table</text>

          <!-- External Brevo Service -->
          <rect x="680" y="270" width="240" height="100" rx="10" fill="#172733" stroke="#2c4559" stroke-width="2"/>
          <text x="800" y="300" fill="#78a7ff" font-size="14" font-weight="bold" text-anchor="middle">External Brevo API</text>
          <text x="800" y="325" fill="#9db2c4" font-size="11" text-anchor="middle">Transactional Email Provider</text>
          <text x="800" y="345" fill="#e8edf2" font-size="11" text-anchor="middle">Offline intercepted in CI</text>

          <!-- Connecting Arrows -->
          <line x1="280" y1="135" x2="360" y2="135" stroke="#75d6c2" stroke-width="2" marker-end="url(#arrow)"/>
          <text x="320" y="125" fill="#9db2c4" font-size="10" text-anchor="middle">HTTPS</text>

          <line x1="600" y1="135" x2="680" y2="135" stroke="#75d6c2" stroke-width="2" marker-end="url(#arrow)"/>
          <text x="640" y="125" fill="#9db2c4" font-size="10" text-anchor="middle">TCP/SSL</text>

          <line x1="480" y1="210" x2="480" y2="270" stroke="#75d6c2" stroke-width="2" marker-end="url(#arrow)"/>
          <text x="515" y="245" fill="#9db2c4" font-size="10" text-anchor="middle">Persists</text>

          <line x1="600" y1="320" x2="680" y2="320" stroke="#75d6c2" stroke-width="2" marker-end="url(#arrow)"/>
          <text x="640" y="310" fill="#9db2c4" font-size="10" text-anchor="middle">REST</text>
        </svg>
        <figcaption class="diagram-caption">Figure 1.1: ConnectSphere C4 Container Architecture showing isolation of transactional state from external Brevo delivery.</figcaption>
      </figure>

      <!-- Role Accountability Matrix -->
      <div class="section-title-wrap">
        <h2 class="section-title">👥 Team Role Accountability Matrix</h2>
        <span class="badge badge-tag">Who Owns What</span>
      </div>
      <p class="section-desc">Individual accountability mapped to canonical git commits, PR reviews, and live oral defense areas.</p>
      <div class="team-grid">
        {''.join(f"""
        <div class="team-card">
          <div class="team-name">{m['name']}</div>
          <div class="team-role">{m['role']}</div>
          <p class="team-pitch">"{m['pitch']}"</p>
          <div style="margin-top: 8px; font-size: 11px; color: var(--cyan);"><strong>Owned Stories:</strong> {m['stories']}</div>
        </div>
        """ for m in team_members)}
      </div>
    </section>


    <!-- SECTION 2: DETAILS -->
    <section id="details" aria-labelledby="details-heading">
      <div class="section-title-wrap">
        <h2 class="section-title" id="details-heading">⚔️ 12 High-Risk Topic Dossiers</h2>
        <span class="badge badge-status">High-Frequency Exam Targets</span>
      </div>
      <p class="section-desc">The top 12 technical battlegrounds examiners probe during code tracing. Memorize the <strong>Say This First</strong> hook for immediate oral control.</p>

      <div class="dossier-grid-layout">
        {''.join(dossiers_html)}
      </div>

      <!-- Event State Machine Diagram -->
      <div class="section-title-wrap">
        <h2 class="section-title">🔄 Event Lifecycle State Machine</h2>
        <span class="badge badge-tag">Lifecycle Protocol</span>
      </div>
      <figure class="diagram-panel">
        <svg viewBox="0 0 960 420" role="img" aria-labelledby="fsm-title fsm-desc">
          <title id="fsm-title">Event Lifecycle State Machine</title>
          <desc id="fsm-desc">Comprehensive event lifecycle state machine showing transitions through Draft, Submitted, Under Review, Approved, Planning, Safety Review, Confirmed, Completed, and Cancelled, along with reversion and replacement loops for venue loss.</desc>
          <defs>
            <marker id="fsm-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="#75d6c2"/>
            </marker>
          </defs>

          <!-- States -->
          <rect x="30" y="60" width="110" height="50" rx="8" fill="#172733" stroke="#2c4559" stroke-width="2"/>
          <text x="85" y="90" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">Draft</text>

          <rect x="180" y="60" width="120" height="50" rx="8" fill="#172733" stroke="#2c4559" stroke-width="2"/>
          <text x="240" y="90" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">Submitted</text>

          <rect x="340" y="60" width="130" height="50" rx="8" fill="#172733" stroke="#2c4559" stroke-width="2"/>
          <text x="405" y="90" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">Under Review</text>

          <rect x="510" y="60" width="110" height="50" rx="8" fill="#172733" stroke="#2c4559" stroke-width="2"/>
          <text x="565" y="90" fill="#fff" font-size="14" font-weight="bold" text-anchor="middle">Approved</text>

          <rect x="660" y="60" width="110" height="50" rx="8" fill="#1f3445" stroke="#75d6c2" stroke-width="2"/>
          <text x="715" y="90" fill="#75d6c2" font-size="14" font-weight="bold" text-anchor="middle">Planning</text>

          <rect x="810" y="60" width="120" height="50" rx="8" fill="#1f3445" stroke="#ffd166" stroke-width="2"/>
          <text x="870" y="90" fill="#ffd166" font-size="14" font-weight="bold" text-anchor="middle">Safety Review</text>

          <rect x="810" y="240" width="120" height="50" rx="8" fill="#1f3445" stroke="#48bb78" stroke-width="2"/>
          <text x="870" y="270" fill="#48bb78" font-size="14" font-weight="bold" text-anchor="middle">Confirmed</text>

          <rect x="550" y="240" width="120" height="50" rx="8" fill="#172733" stroke="#78a7ff" stroke-width="2"/>
          <text x="610" y="270" fill="#78a7ff" font-size="14" font-weight="bold" text-anchor="middle">Completed</text>

          <rect x="340" y="240" width="120" height="50" rx="8" fill="#172733" stroke="#ff9f9f" stroke-width="2"/>
          <text x="400" y="270" fill="#ff9f9f" font-size="14" font-weight="bold" text-anchor="middle">Cancelled</text>

          <!-- State Transitions -->
          <line x1="140" y1="85" x2="180" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>
          <line x1="300" y1="85" x2="340" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>
          <line x1="470" y1="85" x2="510" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>
          <line x1="620" y1="85" x2="660" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>
          <text x="640" y="75" fill="#9db2c4" font-size="9" text-anchor="middle">1st booking</text>

          <line x1="770" y1="85" x2="810" y2="85" stroke="#75d6c2" stroke-width="2" marker-end="url(#fsm-arrow)"/>
          <text x="790" y="75" fill="#9db2c4" font-size="9" text-anchor="middle">All Ready</text>

          <line x1="870" y1="110" x2="870" y2="240" stroke="#48bb78" stroke-width="2" marker-end="url(#fsm-arrow)"/>
          <text x="915" y="175" fill="#48bb78" font-size="10" text-anchor="middle">Approved (T-107)</text>

          <!-- Reversion & Venue Loss Loop -->
          <path d="M810 270 Q715 340 715 115" fill="none" stroke="#ffd166" stroke-width="2" stroke-dasharray="4" marker-end="url(#fsm-arrow)"/>
          <text x="745" y="325" fill="#ffd166" font-size="10" text-anchor="middle">Venue Loss / Revert (T-81/T-28)</text>

          <!-- Safety Rejection Loop -->
          <path d="M840 60 Q790 20 740 60" fill="none" stroke="#ff9f9f" stroke-width="2" marker-end="url(#fsm-arrow)"/>
          <text x="790" y="32" fill="#ff9f9f" font-size="9" text-anchor="middle">Safety Rejection (Changes Requested)</text>

          <!-- Terminal Transitions -->
          <line x1="810" y1="265" x2="670" y2="265" stroke="#78a7ff" stroke-width="2" marker-end="url(#fsm-arrow)"/>
          <text x="740" y="255" fill="#9db2c4" font-size="9" text-anchor="middle">End of last session</text>

          <path d="M715 110 L430 240" fill="none" stroke="#ff9f9f" stroke-width="2" stroke-dasharray="4" marker-end="url(#fsm-arrow)"/>
          <text x="560" y="195" fill="#ff9f9f" font-size="10" text-anchor="middle">Coordinator / Organiser Cancel (E10-S04)</text>
        </svg>
        <figcaption class="diagram-caption">Figure 2.1: Lifecycle state machine including Safety Review and automatic Confirmed → Planning reversion on venue loss.</figcaption>
      </figure>

      <!-- Concurrency Lock Hierarchy Diagram -->
      <div class="section-title-wrap">
        <h2 class="section-title">🔒 Concurrency Lock Hierarchy (PR #239 Deadlock Solution)</h2>
        <span class="badge badge-tag">Database Lock Order</span>
      </div>
      <figure class="diagram-panel">
        <svg viewBox="0 0 960 380" role="img" aria-labelledby="lock-title lock-desc">
          <title id="lock-title">PostgreSQL Concurrency Lock Order and Hierarchy</title>
          <desc id="lock-desc">Database concurrency lock hierarchy diagram displaying top-down lock ordering from Events FOR UPDATE, Event Sessions FOR UPDATE, Venues FOR NO KEY UPDATE, Venue Bookings FOR UPDATE, Support Requests FOR UPDATE, down to Users FOR NO KEY UPDATE from PR #239 preventing 40P01 deadlocks.</desc>
          <defs>
            <marker id="lock-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M0 0L10 5L0 10z" fill="#ffd166"/>
            </marker>
          </defs>

          <!-- Level 1 -->
          <rect x="340" y="20" width="280" height="45" rx="6" fill="#172733" stroke="#75d6c2" stroke-width="2"/>
          <text x="480" y="47" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">1. events (FOR UPDATE)</text>

          <!-- Level 2 -->
          <rect x="340" y="90" width="280" height="45" rx="6" fill="#172733" stroke="#75d6c2" stroke-width="2"/>
          <text x="480" y="117" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">2. event_sessions (FOR UPDATE)</text>

          <!-- Level 3 -->
          <rect x="180" y="170" width="280" height="45" rx="6" fill="#1f3445" stroke="#78a7ff" stroke-width="2"/>
          <text x="320" y="197" fill="#78a7ff" font-size="13" font-weight="bold" text-anchor="middle">3A. venues (FOR NO KEY UPDATE)</text>

          <rect x="500" y="170" width="280" height="45" rx="6" fill="#172733" stroke="#75d6c2" stroke-width="2"/>
          <text x="640" y="197" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">3B. support_requests (FOR UPDATE)</text>

          <!-- Level 4 -->
          <rect x="180" y="250" width="280" height="45" rx="6" fill="#172733" stroke="#75d6c2" stroke-width="2"/>
          <text x="320" y="277" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">4A. venue_bookings (FOR UPDATE)</text>

          <rect x="500" y="250" width="280" height="45" rx="6" fill="#1f3445" stroke="#ffd166" stroke-width="2"/>
          <text x="640" y="277" fill="#ffd166" font-size="13" font-weight="bold" text-anchor="middle">4B. users (FOR NO KEY UPDATE) [PR #239]</text>

          <!-- Level 5 -->
          <rect x="340" y="325" width="280" height="40" rx="6" fill="#172733" stroke="#2c4559" stroke-width="2"/>
          <text x="480" y="350" fill="#9db2c4" font-size="12" text-anchor="middle">5. notification_outbox (Atomic Insert)</text>

          <!-- Arrows -->
          <line x1="480" y1="65" x2="480" y2="90" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>
          <line x1="420" y1="135" x2="350" y2="170" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>
          <line x1="540" y1="135" x2="610" y2="170" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>
          <line x1="320" y1="215" x2="320" y2="250" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>
          <line x1="640" y1="215" x2="640" y2="250" stroke="#ffd166" stroke-width="2" marker-end="url(#lock-arrow)"/>
        </svg>
        <figcaption class="diagram-caption">Figure 2.2: Strict top-down lock hierarchy. Step 4B locks technician user rows FOR NO KEY UPDATE, eliminating 40P01 exclusion deadlocks.</figcaption>
      </figure>

      <!-- Agile Velocity Grouped Bar Chart -->
      <div class="section-title-wrap">
        <h2 class="section-title">📊 Agile Velocity Reconciliation (Sprints 1 to 4)</h2>
        <span class="badge badge-tag">Metric Integrity</span>
      </div>
      <p class="section-desc">Comparing Jira reported chart points (43.7 avg) vs Fair Product Story Title Audit (32.7 avg) vs Strict DoD verified delivery (21.3 avg) per <code>docs/plans/sprint-audit-reconciliation-20261103.md</code>.</p>
      <figure class="diagram-panel">
        <svg viewBox="0 0 960 300" role="img" aria-labelledby="vel-title vel-desc">
          <title id="vel-title">Reconciled Agile Velocity Comparison Across Sprints 1 to 4</title>
          <desc id="vel-desc">Grouped bar chart comparing reported Jira chart velocity, fair product-story title audit velocity, and strict Definition of Done verified velocity across Sprint 1, Sprint 2, Sprint 3, and Sprint 4.</desc>

          <!-- Axis lines -->
          <line x1="80" y1="230" x2="900" y2="230" stroke="#2c4559" stroke-width="1"/>
          <line x1="80" y1="160" x2="900" y2="160" stroke="#2c4559" stroke-width="1" stroke-dasharray="4"/>
          <line x1="80" y1="90" x2="900" y2="90" stroke="#2c4559" stroke-width="1" stroke-dasharray="4"/>
          <line x1="80" y1="20" x2="900" y2="20" stroke="#2c4559" stroke-width="1" stroke-dasharray="4"/>

          <text x="65" y="235" fill="#9db2c4" font-size="12" text-anchor="end">0</text>
          <text x="65" y="165" fill="#9db2c4" font-size="12" text-anchor="end">25</text>
          <text x="65" y="95" fill="#9db2c4" font-size="12" text-anchor="end">50</text>
          <text x="65" y="25" fill="#9db2c4" font-size="12" text-anchor="end">75</text>

          <!-- Sprint 1 Group (Base X: 120) -->
          <rect x="120" y="143" width="30" height="87" fill="#ffd166" rx="3"/>
          <text x="135" y="137" fill="#ffd166" font-size="11" font-weight="bold" text-anchor="middle">31</text>
          <rect x="155" y="163" width="30" height="67" fill="#78a7ff" rx="3"/>
          <text x="170" y="157" fill="#78a7ff" font-size="11" font-weight="bold" text-anchor="middle">24</text>
          <rect x="190" y="163" width="30" height="67" fill="#75d6c2" rx="3"/>
          <text x="205" y="157" fill="#75d6c2" font-size="11" font-weight="bold" text-anchor="middle">24</text>
          <text x="170" y="252" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Sprint 1</text>

          <!-- Sprint 2 Group (Base X: 320) -->
          <rect x="320" y="45" width="30" height="185" fill="#ffd166" rx="3"/>
          <text x="335" y="39" fill="#ffd166" font-size="11" font-weight="bold" text-anchor="middle">66</text>
          <rect x="355" y="118" width="30" height="112" fill="#78a7ff" rx="3"/>
          <text x="370" y="112" fill="#78a7ff" font-size="11" font-weight="bold" text-anchor="middle">40</text>
          <rect x="390" y="199" width="30" height="31" fill="#75d6c2" rx="3"/>
          <text x="405" y="193" fill="#75d6c2" font-size="11" font-weight="bold" text-anchor="middle">11</text>
          <text x="370" y="252" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Sprint 2</text>

          <!-- Sprint 3 Group (Base X: 520) -->
          <rect x="520" y="135" width="30" height="95" fill="#ffd166" rx="3"/>
          <text x="535" y="129" fill="#ffd166" font-size="11" font-weight="bold" text-anchor="middle">34</text>
          <rect x="555" y="135" width="30" height="95" fill="#78a7ff" rx="3"/>
          <text x="570" y="129" fill="#78a7ff" font-size="11" font-weight="bold" text-anchor="middle">34</text>
          <rect x="590" y="149" width="30" height="81" fill="#75d6c2" rx="3"/>
          <text x="605" y="143" fill="#75d6c2" font-size="11" font-weight="bold" text-anchor="middle">29</text>
          <text x="570" y="252" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Sprint 3</text>

          <!-- Sprint 4 Group (Base X: 720) -->
          <rect x="720" y="82" width="30" height="148" fill="#ffd166" rx="3"/>
          <text x="735" y="76" fill="#ffd166" font-size="11" font-weight="bold" text-anchor="middle">53</text>
          <rect x="745" y="118" width="30" height="112" fill="#78a7ff" rx="3"/>
          <text x="760" y="112" fill="#78a7ff" font-size="11" font-weight="bold" text-anchor="middle">40</text>
          <rect x="770" y="143" width="30" height="87" fill="#75d6c2" rx="3"/>
          <text x="785" y="137" fill="#75d6c2" font-size="11" font-weight="bold" text-anchor="middle">31</text>
          <text x="760" y="252" fill="#fff" font-size="13" font-weight="bold" text-anchor="middle">Sprint 4</text>

          <!-- Legend -->
          <rect x="260" y="278" width="12" height="12" fill="#ffd166" rx="2"/>
          <text x="280" y="289" fill="#9db2c4" font-size="11">Jira Chart (43.7 avg)</text>
          <rect x="440" y="278" width="12" height="12" fill="#78a7ff" rx="2"/>
          <text x="460" y="289" fill="#9db2c4" font-size="11">Product Title Audit (32.7 avg)</text>
          <rect x="650" y="278" width="12" height="12" fill="#75d6c2" rx="2"/>
          <text x="670" y="289" fill="#9db2c4" font-size="11">Strict DoD Evidence (21.3 avg)</text>
        </svg>
        <figcaption class="diagram-caption">Figure 2.3: Reconciled Agile velocity comparison proving we never inflated numbers or rewrote sprint history.</figcaption>
      </figure>

      <!-- All 65 Release 1 Stories Deep Archive -->
      <div class="section-title-wrap">
        <h2 class="section-title">📚 Deep Archive: All 65 Release 1 Stories</h2>
        <span class="badge badge-tag">Searchable Lineage</span>
      </div>
      <p class="section-desc">Searchable database of every user story in Release 1. Click <strong>[Expand Full Lineage]</strong> on any card to trace its Given-When-Then AC, database table, routes, controller, and associated test cases.</p>

      <div class="story-list" id="story-archive-list">
        {''.join(story_cards_html)}
      </div>

      <!-- Team Decisions Register -->
      <div class="section-title-wrap" style="margin-top: 40px;">
        <h2 class="section-title">⚖️ Team Decisions Register (T-01 to T-108)</h2>
        <span class="badge badge-tag">{len(t_items)} Canonical Decisions</span>
      </div>
      <p class="section-desc">Full register of engineering architecture and workflow decisions from <code>docs/bdr/B-team-decisions.md</code>. Searchable via ID (e.g. <code>T-79</code>, <code>T-92</code>, <code>T-84</code>) or keyword.</p>
      <details class="bdr-container-drawer" id="team-decisions-details">
        <summary class="bdr-drawer-toggle">📋 View All {len(t_items)} Team Decisions (Click to Expand / Instant Search)</summary>
        <div class="bdr-grid">
          {''.join(decisions_cards_html)}
        </div>
      </details>

      <!-- Customer Clarifications Register -->
      <div class="section-title-wrap" style="margin-top: 32px;">
        <h2 class="section-title">💬 Customer Clarifications Register (C-01 to C-136)</h2>
        <span class="badge badge-tag">{len(c_items)} Clarifications</span>
      </div>
      <p class="section-desc">Authoritative stakeholder requirements clarifications from <code>docs/bdr/A-customer-clarifications.md</code>. Searchable via ID (e.g. <code>C-107</code>, <code>C-62</code>, <code>C-01</code>) or keyword.</p>
      <details class="bdr-container-drawer" id="clarifications-details">
        <summary class="bdr-drawer-toggle">💬 View All {len(c_items)} Customer Clarifications (Click to Expand / Instant Search)</summary>
        <div class="bdr-grid">
          {''.join(clarifications_cards_html)}
        </div>
      </details>
    </section>


    <!-- SECTION 3: NEXT STEPS -->
    <section id="next-steps" aria-labelledby="next-heading">
      <div class="section-title-wrap">
        <h2 class="section-title" id="next-heading">🎯 20-Minute Exam Drill &amp; Defense Runbook</h2>
        <span class="badge badge-status">Oral Protocol</span>
      </div>

      <div class="protocol-card">
        <div class="protocol-title">Protocol 1: 45-Second Random Story Lookup Drill</div>
        <p style="margin-bottom: 8px;">When the examiner names an arbitrary story (e.g. "Walk me through SCRUM-47 or E06-S03"):</p>
        <ol>
          <li>Type <code>e6s3</code> or <code>SCRUM-47</code> into the sticky Proof Router search header.</li>
          <li>Recite the <strong>SAY THIS FIRST</strong> elevator hook word-for-word in 10 seconds.</li>
          <li>Click <strong>[Expand Full Lineage]</strong> to display the exact database migration (<code>0019_venue_bookings_contract.sql</code>) and controller (<code>bookingRequests.ts</code>).</li>
          <li>Cite the live test case: "We verify this in <code>backend/tests/venueBookingRequests.test.ts</code> under <code>TC_E06S03_01</code>."</li>
        </ol>
      </div>

      <div class="protocol-card">
        <div class="protocol-title">Protocol 2: Handling Concurrency &amp; Race Condition Questions</div>
        <p style="margin-bottom: 8px;">When the examiner asks "How do you prevent race conditions when two people book the same slot at the exact same millisecond?":</p>
        <ul>
          <li>State the isolation mechanism: "We use PostgreSQL 17 exclusion constraints with GiST indexes in migration <code>0016_venue_buffer_write_guard.sql</code>."</li>
          <li>Quote the lock hierarchy: "For technician staffing, PR #239 prevents 40P01 deadlocks by locking the request <code>FOR UPDATE</code> and the technician user row <code>FOR NO KEY UPDATE</code>."</li>
          <li>Offer proof: "We prove this with a 25-round real PostgreSQL concurrent race test in <code>backend/tests/staffAssignments.integration.test.ts</code>."</li>
        </ul>
      </div>

      <div class="protocol-card">
        <div class="protocol-title">Protocol 3: Gracefully Admitting Known Defects (D-01 to D-04)</div>
        <p style="margin-bottom: 8px;">If asked about Coordinator Lead queue or copying an event:</p>
        <ul>
          <li>Never bluff or claim it works: "That is tracked as formal open defect D-01 (SCRUM-256) in <code>docs/testing/defects.md</code>."</li>
          <li>Explain the root cause cleanly: "The Lead queue and reassignment routes were developed on <code>feature/SCRUM-153</code> but were unmerged before sprint freeze to protect stability."</li>
          <li>Demonstrate professional maturity: "Rather than claiming false Done, we committed expected-failure tests (<code>test.fail</code>) so the suite stays green while the defect remains transparently visible."</li>
        </ul>
      </div>

      <div class="protocol-card">
        <div class="protocol-title">Protocol 4: Offline Readiness &amp; Emergency Fallback</div>
        <p style="margin-bottom: 8px;">In the event of room Wi-Fi failure during the assessment:</p>
        <ul>
          <li>This Postplan Web App is 100% self-contained with zero external CSS, fonts, CDNs, or network scripts.</li>
          <li>Simply open <code>artifacts/final-qna-prep-guide.html</code> directly in Chrome or Edge locally; instant local search for this static guide functions completely offline.</li>
          <li>All test cases, scenarios, and architecture proofs remain fully accessible offline. Note that outbound GitHub and Jira links require internet connectivity and appropriate SSO authentication.</li>
        </ul>
      </div>

      <div class="protocol-card" id="protocol-scrum-velocity" data-search="scrum velocity story points velocity reconciliation agile delivery burndown t-34 t-73 t-96">
        <div class="protocol-title">Protocol 5: Defending Scrum Velocity &amp; Delivery Accountability</div>
        <p style="margin-bottom: 8px;">When asked "Why does your velocity vary across sprints, and why does Jira differ from your audit?":</p>
        <ul>
          <li>State the honest metric: "Raw Jira charts were distorted by unestimated subtasks and technical enablers. We conducted an independent product-story title audit (T-96) to establish true velocity across Sprints 1 to 4."</li>
          <li>Emphasize DoD governance: "Per team decision T-73, in-flight sprint commitments are not retroactively inflated. We only count user stories verified against the strict Definition of Done."</li>
          <li>Cite the proof: "Figure 2.3 in Section 01 reconciles Jira chart velocity, fair story audit velocity, and strict DoD verified velocity."</li>
        </ul>
      </div>

      <div class="protocol-card" id="protocol-ai-governance" data-search="ai governance ai-governance human review test integrity llm accountability t-65 t-93">
        <div class="protocol-title">Protocol 6: Defending AI Governance &amp; Test Accountability</div>
        <p style="margin-bottom: 8px;">When asked "How do you ensure AI-generated code and tests are trustworthy and not fabricated?":</p>
        <ul>
          <li>Quote the golden rule: "Per instructor guidance and team decision T-65, every test run is captured in immutable execution records under <code>docs/testing/runs/</code> with git commit and runner attribution."</li>
          <li>Human manual evidence only: "Per decision T-93, all screenshots must be hand-taken by human testers in step order; AI-fabricated screenshots are strictly prohibited."</li>
          <li>Zero rubber-stamping: "All AI-generated code and unit tests must achieve 100% code coverage on modified lines and undergo manual peer review before pull request approval."</li>
        </ul>
      </div>
    </section>

    <!-- Page Footer -->
    <footer class="page-footer">
      <span>ConnectSphere · IS212 Software Project Management</span>
      <span>Autonomous Postplan Manifest · 0 External Dependencies</span>
    </footer>

  </div>

  <!-- Real-time Proof Router JavaScript -->
  <script>
    (function() {{
      const searchInput = document.getElementById('global-search');
      const searchCount = document.getElementById('search-count');
      const clearBtn = document.getElementById('search-clear-btn');
      const storyCards = document.querySelectorAll('.story-card');
      const dossierCards = document.querySelectorAll('.dossier-card');
      const defectCards = document.querySelectorAll('.defect-card');
      const decisionCards = document.querySelectorAll('.decision-card');
      const clarificationCards = document.querySelectorAll('.clarification-card');
      const protocolCards = document.querySelectorAll('.protocol-card[data-search]');
      const decisionsDrawer = document.getElementById('team-decisions-details');
      const clarificationsDrawer = document.getElementById('clarifications-details');

      function filterAll() {{
        const rawQuery = searchInput.value.trim().toLowerCase();
        const cleanQuery = rawQuery.replace(/[^a-z0-9]/g, '');

        if (!rawQuery) {{
          storyCards.forEach(c => {{
            c.style.display = '';
            const d = c.querySelector('.story-lineage-drawer');
            if (d) d.open = false;
          }});
          dossierCards.forEach(c => c.style.display = '');
          defectCards.forEach(c => c.style.display = '');
          decisionCards.forEach(c => c.style.display = '');
          clarificationCards.forEach(c => c.style.display = '');
          protocolCards.forEach(c => c.style.display = '');
          if (decisionsDrawer) decisionsDrawer.open = false;
          if (clarificationsDrawer) clarificationsDrawer.open = false;
          if (searchCount) searchCount.textContent = 'All 65 Stories · 391 functional + 3 cross-cutting = 394 cases · ' + decisionCards.length + ' Decisions · ' + clarificationCards.length + ' Clarifications';
          return;
        }}

        let matchCount = 0;
        let matchedStories = [];

        // Exact identifier match check (e.g., e5s4, e05-s04, scrum-43, tc_e07s07_03, pr-239, pr239, d-01)
        const isExactIdentifierQuery = /^(e\\d{{1,2}}-?s\\d{{1,2}}|scrum-?\\d+|tc_e\\d+s\\d+_\\d+|pr-?\\d+|d-0[1-4]|t-\\d+|c-\\d+)$/i.test(rawQuery);

        // Filter Story Cards
        storyCards.forEach(card => {{
          const sid = (card.getAttribute('data-sid') || '').toLowerCase();
          const alias = (card.getAttribute('data-alias') || '').toLowerCase();
          const searchData = (card.getAttribute('data-search') || '').toLowerCase();

          const aliasList = alias.split(/\\s+/);
          const matchExact = sid === rawQuery || sid.replace('-', '') === cleanQuery || aliasList.includes(rawQuery) || (cleanQuery && aliasList.includes(cleanQuery));
          const matchSubstring = sid.includes(rawQuery) || alias.includes(rawQuery) || searchData.includes(rawQuery) || (cleanQuery && searchData.replace(/[^a-z0-9]/g, '').includes(cleanQuery));
          const match = matchExact || matchSubstring;

          card.style.display = match ? '' : 'none';
          const d = card.querySelector('.story-lineage-drawer');
          if (d) d.open = false; // default to compact!

          if (match) {{
            matchCount++;
            matchedStories.push({{ card, drawer: d, isExact: matchExact }});
          }}
        }});

        // Baby-proof auto-expand rule:
        // - One exact story/PR/TC match: auto-expand it.
        // - Multiple matches: show compact result cards only.
        if (matchedStories.length === 1) {{
          if (matchedStories[0].drawer) {{
            matchedStories[0].drawer.open = true;
          }}
        }} else if (isExactIdentifierQuery) {{
          const exacts = matchedStories.filter(m => m.isExact);
          if (exacts.length === 1 && exacts[0].drawer) {{
            exacts[0].drawer.open = true;
          }}
        }}

        // Filter Dossier Cards
        dossierCards.forEach(card => {{
          const alias = (card.getAttribute('data-alias') || '').toLowerCase();
          const searchData = (card.getAttribute('data-search') || '').toLowerCase();
          const match = alias.includes(rawQuery) || searchData.includes(rawQuery) || (cleanQuery && alias.includes(cleanQuery)) || (cleanQuery && searchData.replace(/[^a-z0-9]/g, '').includes(cleanQuery));
          card.style.display = match ? '' : 'none';
          if (match) matchCount++;
        }});

        // Filter Defect Cards
        defectCards.forEach(card => {{
          const text = (card.getAttribute('data-search') || card.textContent).toLowerCase();
          const match = text.includes(rawQuery) || (cleanQuery && text.replace(/[^a-z0-9]/g, '').includes(cleanQuery));
          card.style.display = match ? '' : 'none';
          if (match) matchCount++;
        }});

        // Filter Decision Cards
        decisionCards.forEach(card => {{
          const tid = (card.getAttribute('data-tid') || '').toLowerCase();
          const alias = (card.getAttribute('data-alias') || '').toLowerCase();
          const searchData = (card.getAttribute('data-search') || '').toLowerCase();
          const match = tid.includes(rawQuery) || alias.includes(rawQuery) || searchData.includes(rawQuery) || (cleanQuery && alias.includes(cleanQuery)) || (cleanQuery && searchData.replace(/[^a-z0-9]/g, '').includes(cleanQuery));
          card.style.display = match ? '' : 'none';
          if (match) matchCount++;
        }});

        // Filter Clarification Cards
        clarificationCards.forEach(card => {{
          const cid = (card.getAttribute('data-cid') || '').toLowerCase();
          const alias = (card.getAttribute('data-alias') || '').toLowerCase();
          const searchData = (card.getAttribute('data-search') || '').toLowerCase();
          const match = cid.includes(rawQuery) || alias.includes(rawQuery) || searchData.includes(rawQuery) || (cleanQuery && alias.includes(cleanQuery)) || (cleanQuery && searchData.replace(/[^a-z0-9]/g, '').includes(cleanQuery));
          card.style.display = match ? '' : 'none';
          if (match) matchCount++;
        }});

        // Filter Defense Protocol Cards
        protocolCards.forEach(card => {{
          const text = (card.getAttribute('data-search') || card.textContent).toLowerCase();
          const match = text.includes(rawQuery) || (cleanQuery && text.replace(/[^a-z0-9]/g, '').includes(cleanQuery));
          card.style.display = match ? '' : 'none';
          if (match) matchCount++;
        }});

        // Never auto-open the full decisions or clarifications archive!
        if (decisionsDrawer) decisionsDrawer.open = false;
        if (clarificationsDrawer) clarificationsDrawer.open = false;

        if (searchCount) {{
          searchCount.textContent = matchCount + (matchCount === 1 ? ' match' : ' matches') + ' for "' + rawQuery + '"';
        }}
      }}

      // Top likely answers quick jump chips
      document.querySelectorAll('.top-chip').forEach(btn => {{
        btn.addEventListener('click', () => {{
          const q = btn.getAttribute('data-query');
          searchInput.value = q;
          filterAll();
          searchInput.focus();
        }});
      }});

      searchInput.addEventListener('input', filterAll);
      if (clearBtn) {{
        clearBtn.addEventListener('click', () => {{
          searchInput.value = '';
          filterAll();
          searchInput.focus();
        }});
      }}

      window.addEventListener('keydown', function(e) {{
        if ((e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) && document.activeElement !== searchInput) {{
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }} else if (e.key === 'Escape' && document.activeElement === searchInput) {{
          searchInput.value = '';
          filterAll();
          searchInput.blur();
        }}
      }});
    }})();
  </script>
</body>
</html>
"""
    return html_content


def main() -> int:
    print("Building ConnectSphere Q&A Prep Data & Master Postplan Web App...")
    html_output = build_html()

    OUTPUT_HTML_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_HTML_PATH.write_text(html_output, encoding="utf-8")
    print(f"Successfully generated {OUTPUT_HTML_PATH} ({len(html_output)} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
