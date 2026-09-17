import { AttendeeEvents } from './features/attendee/AttendeeEvents';
import { EventDiscovery, EventDetail, RegisterForEvent, WithdrawFromEvent, EventFeedback } from './features/attendee/AttendeeRegistration';
import { useMemo, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { LandingPage } from './features/landing/LandingPage';
import { LoginPage } from './features/accessControl/LoginPage';
import { VerifyPage } from './features/accessControl/VerifyPage';
import { PermissionDenied } from './features/access/PermissionDenied';
import { RegisterForm } from './features/accessControl/RegisterForm';
import { ProfileForm } from './features/accessControl/ProfileForm';
import {
  OrganiserDashboard, RequestList as OrganiserRequestList, SubmittedDetail, ClarificationResponse,
} from './features/organiser/Organiser';
import {
  CoordinatorHome, ReviewQueue as CoordinatorReviewQueue, RequestDetail as CoordinatorRequestDetail,
  DecisionPanel, PlanningWorkspace, ReadinessChecklist, FinalConfirmation,
} from './features/coordinator/Coordinator';
import {
  VenueDashboard, VenueInventory, AvailabilityCalendar, PendingBookingDetail,
} from './features/venue/Venue';
import {
  EquipmentDashboard, EquipmentCatalogue, RequestQueue, ReservationDetail,
  TechnicianAssignment, ConflictState,
} from './features/support/Support';
import {
  AdminHome, UserManagement, RoleAssignment, AuditLogViewer,
} from './features/admin/Admin';
import {
  AlertTriangle,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Cog,
  DoorOpen,
  History,
  Inbox,
  KeyRound,
  LayoutDashboard,
  ListChecks,
  MapPinned,
  MessageSquareText,
  MonitorSmartphone,
  Search,
  Send,
  Settings2,
  SlidersHorizontal,
  TicketCheck,
  UserCog,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ClientEvents } from './features/organiser/ClientEvents';
import { OrganiserRequestFlow } from './features/organiser/OrganiserRequestFlow';
import { OrganiserDrafts, OrganiserDraftEdit } from './features/organiser/OrganiserDrafts';

type Tone = 'success' | 'warning' | 'info' | 'danger' | 'future' | 'neutral';

type Screen = {
  id: string;
  title: string;
  story: string;
  tone: Tone;
  state: string;
  mobile: string;
  tasks: string[];
  metrics: [string, string][];
  activity: string[];
  future?: boolean;
};

type RoleArea = {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  accent: string;
  summary: string;
  screens: Screen[];
};

const roleAreas: RoleArea[] = [
  {
    id: 'access',
    label: 'Access and Account',
    shortLabel: 'Access',
    icon: KeyRound,
    accent: 'mint',
    summary: 'Entry, permissions, profiles, and role-aware home states.',
    screens: [
      {
        id: 'login',
        title: 'Login',
        story: 'E01-S01',
        tone: 'info',
        state: 'Default',
        mobile: 'Compact sign-in with school email and password recovery link.',
        tasks: ['Email and password fields', 'Remembered role hint', 'Forgot password action'],
        metrics: [['Last sync', '2 min'], ['Roles found', '5'], ['Open notices', '3']],
        activity: ['Attendee account sign-up remains public only.', 'Coordinator roles require admin assignment.'],
      },
      {
        id: 'create-account',
        title: 'Create Account',
        story: 'E01-S08',
        tone: 'success',
        state: 'Attendee sign-up',
        mobile: 'Single-column form with account confirmation message.',
        tasks: ['Public attendee registration', 'Consent checkbox', 'Email verification state'],
        metrics: [['Fields', '6'], ['Role', 'Attendee'], ['Risk', 'Low']],
        activity: ['Public sign-up does not grant staff roles.', 'Email confirmation is queued after submit.'],
      },
      {
        id: 'role-home',
        title: 'Role-aware Home',
        story: 'E01-S01',
        tone: 'info',
        state: 'Signed in',
        mobile: 'Action stack ordered by role priority.',
        tasks: ['Role switcher', 'Priority queue', 'Recent notifications'],
        metrics: [['Queues', '4'], ['Due today', '7'], ['Unread', '9']],
        activity: ['Dashboard cards change by active role.', 'Permissioned links hide unavailable modules.'],
      },
      {
        id: 'permission-denied',
        title: 'Permission Denied',
        story: 'E14-S02',
        tone: 'danger',
        state: 'Blocked',
        mobile: 'Plain denial with return action and support contact.',
        tasks: ['Explain missing role', 'Return to home', 'Request access path'],
        metrics: [['Role needed', 'Staff'], ['Data exposed', '0'], ['Action', 'Return']],
        activity: ['Denied screens avoid leaking event details.', 'Audit entry records the denied route.'],
      },
      {
        id: 'profile-settings',
        title: 'Profile and Settings',
        story: 'E01-S04',
        tone: 'future',
        state: 'Later',
        mobile: 'Notification preferences and contact details.',
        future: true,
        tasks: ['Profile details', 'Digest preferences', 'Device sessions'],
        metrics: [['Scope', 'Later'], ['Owner', 'Admin'], ['Risk', 'Medium']],
        activity: ['Marked future so Release 1 does not promise preference automation.'],
      },
    ],
  },
  {
    id: 'organiser',
    label: 'Event Organiser',
    shortLabel: 'Organiser',
    icon: ClipboardList,
    accent: 'teal',
    summary: 'Create, submit, track, clarify, change, and cancel event requests.',
    screens: [
      {
        id: 'organiser-dashboard',
        title: 'Dashboard',
        story: 'E02-S01',
        tone: 'info',
        state: 'Active requests',
        mobile: 'Status-first request list for checking progress quickly.',
        tasks: ['Request counters', 'Next action list', 'Draft resume card'],
        metrics: [['Drafts', '2'], ['Under review', '4'], ['Confirmed', '8']],
        activity: ['Sustainability Forum needs clarification today.', 'Career Mixer moved to planning.'],
      },
      {
        id: 'request-list',
        title: 'Request List',
        story: 'E02-S02',
        tone: 'neutral',
        state: 'Filterable',
        mobile: 'Search and status chips collapse above the list.',
        tasks: ['Status filter', 'Date range', 'Saved drafts'],
        metrics: [['Rows', '18'], ['Filters', '5'], ['Late replies', '1']],
        activity: ['List keeps draft and submitted requests in one place.'],
      },
      {
        id: 'create-request',
        title: 'Create Request Wizard',
        story: 'E02-S03',
        tone: 'warning',
        state: 'Validation',
        mobile: 'Step-by-step mandatory fields with error summary.',
        tasks: ['Ten mandatory fields', 'Venue needs', 'Equipment needs'],
        metrics: [['Steps', '5'], ['Missing', '3'], ['Autosaved', 'Now']],
        activity: ['Preferred date cannot be in the past.', 'Missing capacity blocks submission.'],
      },
      {
        id: 'submitted-detail',
        title: 'Submitted Detail',
        story: 'E03-S05',
        tone: 'success',
        state: 'Timeline',
        mobile: 'Decision timeline with comments drawer.',
        tasks: ['Status banner', 'Audit trail', 'Coordinator comments'],
        metrics: [['Status', 'Review'], ['Comments', '6'], ['SLA', '1 day']],
        activity: ['Coordinator opened review at 09:40.', 'Venue planning not started yet.'],
      },
      {
        id: 'clarification-response',
        title: 'Clarification Response',
        story: 'E03-S02',
        tone: 'warning',
        state: 'Action required',
        mobile: 'Focused reply form with original question pinned.',
        tasks: ['Question thread', 'Answer field', 'Resubmit action'],
        metrics: [['Questions', '2'], ['Due', 'Today'], ['Files', '1']],
        activity: ['Coordinator asked for target audience and catering layout.'],
      },
      {
        id: 'change-request',
        title: 'Change Request',
        story: 'E10-S01',
        tone: 'future',
        state: 'Later',
        mobile: 'Change reason, changed fields, and coordinator review status.',
        future: true,
        tasks: ['Change summary', 'Affected bookings', 'Submit for review'],
        metrics: [['Scope', 'Later'], ['Risk', 'High'], ['Impacts', 'Venue']],
        activity: ['Future flow reserves room for post-approval edits.'],
      },
      {
        id: 'cancellation',
        title: 'Cancellation',
        story: 'E10-S04',
        tone: 'future',
        state: 'Later',
        mobile: 'Confirm cancellation with affected attendee count.',
        future: true,
        tasks: ['Reason capture', 'Impact preview', 'Notification warning'],
        metrics: [['Scope', 'Later'], ['Attendees', '126'], ['Deliveries', 'Queued']],
        activity: ['Cancellation is visible but marked outside Release 1.'],
      },
    ],
  },
  {
    id: 'coordinator',
    label: 'Event Coordinator',
    shortLabel: 'Coordinator',
    icon: ClipboardCheck,
    accent: 'blue',
    summary: 'Review, decide, clarify, plan, and confirm event readiness.',
    screens: [
      {
        id: 'workload-dashboard',
        title: 'Workload Dashboard',
        story: 'E03-S01',
        tone: 'info',
        state: 'Triage',
        mobile: 'Priority cards for assigned requests.',
        tasks: ['Review load', 'Blocked events', 'Ready to confirm'],
        metrics: [['Assigned', '21'], ['Blocked', '5'], ['Ready', '3']],
        activity: ['Three events have both venue and equipment ready.'],
      },
      {
        id: 'review-queue',
        title: 'Review Queue',
        story: 'E03-S01',
        tone: 'warning',
        state: 'Needs decision',
        mobile: 'Compact list with status and due date.',
        tasks: ['Sort by SLA', 'Filter by status', 'Open request detail'],
        metrics: [['New', '7'], ['Clarify', '4'], ['Overdue', '1']],
        activity: ['Annual Sustainability Forum is oldest in queue.'],
      },
      {
        id: 'request-detail',
        title: 'Request Detail',
        story: 'E03-S03',
        tone: 'neutral',
        state: 'Read-only review',
        mobile: 'Summary, requirements, and comment thread.',
        tasks: ['Requirements table', 'Attachments', 'Audit drawer'],
        metrics: [['Capacity', '180'], ['Fields', '10/10'], ['Risks', '2']],
        activity: ['Accessibility need flagged for venue planning.'],
      },
      {
        id: 'decision-panel',
        title: 'Decision Panel',
        story: 'E03-S03',
        tone: 'danger',
        state: 'Approve or reject',
        mobile: 'Decision confirmation with reason required on rejection.',
        tasks: ['Approve', 'Reject with reason', 'Request clarification'],
        metrics: [['Actions', '3'], ['Reason', 'Required'], ['Notify', 'Yes']],
        activity: ['Reject and clarification both create organiser deliveries.'],
      },
      {
        id: 'planning-workspace',
        title: 'Planning Workspace',
        story: 'E06-S03',
        tone: 'info',
        state: 'Venue and equipment',
        mobile: 'Checklist view of outstanding dependencies.',
        tasks: ['Venue booking status', 'Equipment status', 'Support assignment'],
        metrics: [['Venue', 'Pending'], ['Equipment', 'Partial'], ['Staff', 'Missing']],
        activity: ['Partial equipment reservation blocks final confirmation.'],
      },
      {
        id: 'readiness-checklist',
        title: 'Readiness Checklist',
        story: 'E08-S03',
        tone: 'warning',
        state: 'Blocked',
        mobile: 'Reasons listed before Confirm is enabled.',
        tasks: ['Venue confirmed', 'Equipment reserved', 'Support staffed'],
        metrics: [['Complete', '2/5'], ['Blockers', '3'], ['Confirm', 'Off']],
        activity: ['No confirmed venue, partial reservation, unstaffed support request.'],
      },
      {
        id: 'final-confirmation',
        title: 'Final Confirmation',
        story: 'E08-S03',
        tone: 'success',
        state: 'Ready',
        mobile: 'Publish confirmation with attendee notification preview.',
        tasks: ['Confirm event', 'Publish attendee view', 'Queue notifications'],
        metrics: [['Ready', 'Yes'], ['Audience', '324'], ['Emails', 'Queued']],
        activity: ['Confirmed events become visible to attendees.'],
      },
    ],
  },
  {
    id: 'venue',
    label: 'Venue Staff',
    shortLabel: 'Venue',
    icon: MapPinned,
    accent: 'clay',
    summary: 'Maintain venue inventory, review availability, and resolve conflicts.',
    screens: [
      {
        id: 'venue-dashboard',
        title: 'Venue Dashboard',
        story: 'E05-S01',
        tone: 'info',
        state: 'Bookings',
        mobile: 'Today, pending, and conflict cards.',
        tasks: ['Pending requests', 'Confirmed bookings', 'Maintenance blocks'],
        metrics: [['Pending', '9'], ['Confirmed', '24'], ['Blocks', '2']],
        activity: ['Seminar Room 3 has an overlapping block warning.'],
      },
      {
        id: 'venue-inventory',
        title: 'Venue Inventory',
        story: 'E05-S02',
        tone: 'neutral',
        state: 'Catalogue',
        mobile: 'Venue cards with capacity and accessibility.',
        tasks: ['Capacity', 'Layouts', 'Facilities'],
        metrics: [['Venues', '12'], ['Features', '38'], ['Offline', '1']],
        activity: ['Suitability is advisory; the decision remains with Venue Staff.'],
      },
      {
        id: 'availability-calendar',
        title: 'Availability Calendar',
        story: 'E05-S03',
        tone: 'warning',
        state: 'Conflict scan',
        mobile: 'Date strips and conflict labels.',
        tasks: ['Existing bookings', 'Blockouts', 'Open slots'],
        metrics: [['Conflicts', '3'], ['Free rooms', '5'], ['Window', '7 days']],
        activity: ['Confirmed booking constraints prevent double approval.'],
      },
      {
        id: 'booking-detail',
        title: 'Pending Booking Detail',
        story: 'E06-S03',
        tone: 'info',
        state: 'Review',
        mobile: 'Requirement summary and suitability score.',
        tasks: ['Event needs', 'Room fit', 'Alternative suggestion'],
        metrics: [['Capacity fit', 'Yes'], ['Layout', 'Theatre'], ['Accessibility', 'Met']],
        activity: ['Alternative venue can be suggested on rejection.'],
      },
      {
        id: 'booking-decision',
        title: 'Booking Approval or Rejection',
        story: 'E06-S04',
        tone: 'danger',
        state: 'Decision',
        mobile: 'Approve or reject with reason.',
        tasks: ['Approve booking', 'Reject with reason', 'Flag competing requests'],
        metrics: [['Decision', 'Required'], ['Reason', 'On reject'], ['Notify', 'Coordinator']],
        activity: ['Approval flags competing pending requests as conflicting.'],
      },
      {
        id: 'venue-blockout',
        title: 'Venue Blockout',
        story: 'Future',
        tone: 'future',
        state: 'Later',
        mobile: 'Maintenance period form and conflict preview.',
        future: true,
        tasks: ['Reason', 'Period', 'Affected bookings'],
        metrics: [['Scope', 'Later'], ['Overlap', 'Warn'], ['Notify', 'Yes']],
        activity: ['Future screen keeps maintenance workflow visible.'],
      },
    ],
  },
  {
    id: 'technical',
    label: 'Technical Support Staff',
    shortLabel: 'Technical',
    icon: Wrench,
    accent: 'amber',
    summary: 'Manage equipment, reservations, partial fulfilment, and staff assignment.',
    screens: [
      {
        id: 'equipment-dashboard',
        title: 'Equipment Dashboard',
        story: 'E07-S01',
        tone: 'info',
        state: 'Inventory health',
        mobile: 'Shortfall and maintenance cards.',
        tasks: ['Inventory counts', 'Open requests', 'Maintenance alerts'],
        metrics: [['Requests', '11'], ['Shortfalls', '2'], ['Offline', '4']],
        activity: ['Wireless microphones have a partial-reservation warning.'],
      },
      {
        id: 'equipment-catalogue',
        title: 'Equipment Catalogue',
        story: 'E07-S02',
        tone: 'neutral',
        state: 'Maintain',
        mobile: 'Item cards by type and operational status.',
        tasks: ['Type', 'Quantity', 'Operational status'],
        metrics: [['Types', '18'], ['Items', '142'], ['Locations', '6']],
        activity: ['Location does not affect availability calculations.'],
      },
      {
        id: 'request-queue',
        title: 'Request Queue',
        story: 'E07-S03',
        tone: 'warning',
        state: 'Needs reservation',
        mobile: 'Requests grouped by event date.',
        tasks: ['Event date', 'Item quantities', 'Support need'],
        metrics: [['Due today', '4'], ['Partial', '2'], ['Staffing', '3']],
        activity: ['Queue separates equipment and technician work.'],
      },
      {
        id: 'reservation-detail',
        title: 'Reservation Detail',
        story: 'E07-S04',
        tone: 'info',
        state: 'Availability check',
        mobile: 'Requested versus available quantities.',
        tasks: ['Overlap scan', 'Reserve quantity', 'Record shortfall'],
        metrics: [['Requested', '8'], ['Available', '5'], ['Shortfall', '3']],
        activity: ['Partial reservation writes coordinator delivery rows.'],
      },
      {
        id: 'technician-assignment',
        title: 'Technician Assignment',
        story: 'E07-S07',
        tone: 'success',
        state: 'Assign',
        mobile: 'Available colleagues and assignment conflicts.',
        tasks: ['Staff calendar', 'Assign colleague', 'Conflict warning'],
        metrics: [['Needed', '2'], ['Available', '6'], ['Conflicts', '1']],
        activity: ['Overlapping assignment constraint protects staff calendars.'],
      },
      {
        id: 'equipment-conflict',
        title: 'Conflict State',
        story: 'E07-S04',
        tone: 'danger',
        state: 'Blocked',
        mobile: 'Shortfall reason and suggested next step.',
        tasks: ['Damaged item warning', 'Partial fulfilment', 'Coordinator notice'],
        metrics: [['Damaged', '1'], ['Affected', '3'], ['Released', 'No']],
        activity: ['Existing reservations are flagged, never silently released.'],
      },
    ],
  },
  {
    id: 'attendee',
    label: 'Attendee',
    shortLabel: 'Attendee',
    icon: TicketCheck,
    accent: 'green',
    summary: 'Discover confirmed events, register, waitlist, withdraw, and give feedback.',
    screens: [
      {
        id: 'event-discovery',
        title: 'Event Discovery',
        story: 'E09-S01',
        tone: 'info',
        state: 'Browse',
        mobile: 'Card feed with date, venue, and capacity hints.',
        tasks: ['Confirmed events only', 'Search', 'Category filters'],
        metrics: [['Published', '16'], ['This week', '5'], ['Full', '2']],
        activity: ['Internal planning notes stay hidden from attendees.'],
      },
      {
        id: 'event-detail',
        title: 'Event Detail',
        story: 'E09-S01',
        tone: 'neutral',
        state: 'Public details',
        mobile: 'Event facts, venue, accessibility, and register action.',
        tasks: ['Date and venue', 'Accessibility details', 'Registration CTA'],
        metrics: [['Capacity', '180'], ['Registered', '142'], ['Seats', '38']],
        activity: ['Only confirmed events expose venue details.'],
      },
      {
        id: 'registration',
        title: 'Registration',
        story: 'E09-S01',
        tone: 'success',
        state: 'Seats available',
        mobile: 'One-screen confirm with attendee details.',
        tasks: ['Confirm attendee', 'Register', 'Email confirmation'],
        metrics: [['Seats', '38'], ['Status', 'Registered'], ['Email', 'Queued']],
        activity: ['Registration writes a confirmation delivery.'],
      },
      {
        id: 'waitlist',
        title: 'Waitlist',
        story: 'E09-S04',
        tone: 'warning',
        state: 'Full event',
        mobile: 'Waitlist position and promotion explanation.',
        tasks: ['Join waitlist', 'Position', 'Promotion notice'],
        metrics: [['Seats', '0'], ['Position', '4'], ['Notify', 'Yes']],
        activity: ['Full events create waitlisted registration rows.'],
      },
      {
        id: 'withdrawal',
        title: 'Withdrawal',
        story: 'E09-S05',
        tone: 'danger',
        state: 'Confirm',
        mobile: 'Withdrawal confirmation and waitlist promotion warning.',
        tasks: ['Withdraw action', 'Confirmation', 'Promote waitlist'],
        metrics: [['Status', 'Withdrawn'], ['Promote', 'Next'], ['Notify', '2']],
        activity: ['Withdrawal can promote the next waitlisted attendee.'],
      },
      {
        id: 'post-event-feedback',
        title: 'Post-event Feedback',
        story: 'Future',
        tone: 'future',
        state: 'Later',
        mobile: 'Rating and short comment after event completion.',
        future: true,
        tasks: ['Rating', 'Comment', 'Attendance-linked feedback'],
        metrics: [['Scope', 'Later'], ['Trigger', 'Completed'], ['Owner', 'Attendee']],
        activity: ['Future feedback appears after attendance is recorded.'],
      },
    ],
  },
  {
    id: 'operations',
    label: 'Shared Operations',
    shortLabel: 'Ops',
    icon: Bell,
    accent: 'violet',
    summary: 'Notifications, audit trails, comments, search, and system states.',
    screens: [
      {
        id: 'notification-center',
        title: 'Notification Center',
        story: 'E11-S01',
        tone: 'info',
        state: 'Inbox',
        mobile: 'Unread stack with role and event filters.',
        tasks: ['Unread notifications', 'Delivery status', 'Open related item'],
        metrics: [['Unread', '9'], ['Queued', '12'], ['Failed', '1']],
        activity: ['Redis-backed jobs are drained by cron.'],
      },
      {
        id: 'audit-history',
        title: 'Audit and History Drawer',
        story: 'E14-S02',
        tone: 'neutral',
        state: 'Traceability',
        mobile: 'Timeline opens as a full-screen sheet.',
        tasks: ['Status changes', 'Actor', 'Timestamp'],
        metrics: [['Entries', '18'], ['Actors', '5'], ['Export', 'Later']],
        activity: ['Every lifecycle action appends audit context.'],
      },
      {
        id: 'comments-activity',
        title: 'Comments and Activity',
        story: 'E03-S06',
        tone: 'warning',
        state: 'Clarification thread',
        mobile: 'Threaded comments with reply composer.',
        tasks: ['Comment thread', 'Question marker', 'Reply field'],
        metrics: [['Comments', '7'], ['Questions', '2'], ['Open', '1']],
        activity: ['Clarification questions stay attached to the event.'],
      },
      {
        id: 'search-filter',
        title: 'Search and Filter Patterns',
        story: 'E06-S01',
        tone: 'info',
        state: 'Reusable',
        mobile: 'Search bar, filter chips, and saved views.',
        tasks: ['Search', 'Filter chips', 'Saved view'],
        metrics: [['Patterns', '4'], ['Used by', '6 roles'], ['Reset', 'Visible']],
        activity: ['Same filter language reduces role-to-role confusion.'],
      },
      {
        id: 'empty-error-loading',
        title: 'Empty, Loading, and Error States',
        story: 'E13-S02',
        tone: 'danger',
        state: 'Fallbacks',
        mobile: 'Single-column state panels with recovery action.',
        tasks: ['Empty copy', 'Loading skeleton', 'Specific error'],
        metrics: [['States', '3'], ['Recovery', 'Required'], ['Data loss', 'No']],
        activity: ['Errors name the failed action and next step.'],
      },
    ],
  },
  {
    id: 'admin',
    label: 'Admin and Future Backlog',
    shortLabel: 'Admin',
    icon: UserCog,
    accent: 'slate',
    summary: 'Admin-only and future backlog surfaces kept separate from Release 1.',
    screens: [
      {
        id: 'user-management',
        title: 'User Management',
        story: 'Future',
        tone: 'future',
        state: 'Later',
        mobile: 'Search users and view role assignments.',
        future: true,
        tasks: ['Find users', 'Deactivate account', 'Audit role changes'],
        metrics: [['Scope', 'Later'], ['Risk', 'High'], ['Audit', 'Required']],
        activity: ['Future admin workflow is not part of public sign-up.'],
      },
      {
        id: 'role-assignment',
        title: 'Role Assignment',
        story: 'Future',
        tone: 'future',
        state: 'Later',
        mobile: 'Assign staff roles with approval trace.',
        future: true,
        tasks: ['Role picker', 'Approval reason', 'Effective date'],
        metrics: [['Scope', 'Later'], ['Roles', '5'], ['Review', 'Required']],
        activity: ['Staff roles need controlled assignment.'],
      },
      {
        id: 'reporting-dashboard',
        title: 'Reporting Dashboard',
        story: 'Future',
        tone: 'future',
        state: 'Later',
        mobile: 'Summary metrics only.',
        future: true,
        tasks: ['Event throughput', 'Venue utilisation', 'Registration trends'],
        metrics: [['Scope', 'Later'], ['Charts', '3'], ['Export', 'Future']],
        activity: ['Reports are marked as future backlog.'],
      },
      {
        id: 'digest-preferences',
        title: 'Digest Preferences',
        story: 'Future',
        tone: 'future',
        state: 'Later',
        mobile: 'Daily or weekly digest choices.',
        future: true,
        tasks: ['Digest cadence', 'Notification channels', 'Quiet hours'],
        metrics: [['Scope', 'Later'], ['Channels', '2'], ['Default', 'Daily']],
        activity: ['Digest settings can follow after core notifications.'],
      },
      {
        id: 'recommendations',
        title: 'Recommendations Placeholder',
        story: 'Future',
        tone: 'future',
        state: 'Later',
        mobile: 'Personalised attendee suggestions placeholder.',
        future: true,
        tasks: ['Recommended events', 'Reason labels', 'Opt out'],
        metrics: [['Scope', 'Later'], ['Privacy', 'Review'], ['Model', 'None']],
        activity: ['Clearly labelled to avoid implying an AI feature in Release 1.'],
      },
    ],
  },
];

const totals = roleAreas.reduce(
  (acc, role) => {
    acc.screens += role.screens.length;
    acc.future += role.screens.filter((screen) => screen.future).length;
    return acc;
  },
  { screens: 0, future: 0 },
);

function toneLabel(tone: Tone) {
  const labels: Record<Tone, string> = {
    success: 'Ready',
    warning: 'Attention',
    info: 'Active',
    danger: 'Blocked',
    future: 'Future',
    neutral: 'Reference',
  };
  return labels[tone];
}

function StatusPill({ tone, children }: { tone: Tone; children: string }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>;
}

function IconButton({ icon: Icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <button className="icon-button" type="button" aria-label={label} title={label}>
      <Icon size={18} aria-hidden="true" />
    </button>
  );
}

function PrototypeApp() {
  const [viewMode, setViewMode] = useState<'inventory' | 'organiser-flow'>('organiser-flow');
  const [roleId, setRoleId] = useState(roleAreas[0].id);
  const activeRole = useMemo(
    () => roleAreas.find((role) => role.id === roleId) ?? roleAreas[0],
    [roleId],
  );
  const [screenId, setScreenId] = useState(activeRole.screens[0].id);
  const activeScreen =
    activeRole.screens.find((screen) => screen.id === screenId) ?? activeRole.screens[0];

  function selectRole(nextRole: RoleArea) {
    setRoleId(nextRole.id);
    setScreenId(nextRole.screens[0].id);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="ConnectSphere role navigation">
        <a href="/events">My organisation's events</a>
        <a href="/attendee/events">My registered events</a>
        <div className="brand-lockup">
          <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
          <div>
            <strong>SG ConnectSphere</strong>
            <span>Release 1 workspace</span>
          </div>
        </div>

        <nav className="role-nav">
          {roleAreas.map((role) => (
            <button
              className={`role-nav-item ${role.id === activeRole.id ? 'role-nav-item-active' : ''}`}
              type="button"
              key={role.id}
              onClick={() => selectRole(role)}
            >
              <role.icon size={18} aria-hidden="true" />
              <span>{role.shortLabel}</span>
            </button>
          ))}
        </nav>

        <section className="sidebar-summary" aria-label="Screen inventory summary">
          <MonitorSmartphone size={18} aria-hidden="true" />
          <div>
            <strong>{totals.screens} screens</strong>
            <span>{totals.future} future backlog</span>
          </div>
        </section>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Release 1 application shell</p>
            <h1>Event planning operations workspace</h1>
          </div>
          <div className="topbar-actions" aria-label="Application actions">
            <div className="view-switcher" aria-label="Frontend view mode">
              <button
                className={viewMode === 'inventory' ? 'view-switcher-active' : ''}
                type="button"
                onClick={() => setViewMode('inventory')}
              >
                Screen map
              </button>
              <button
                className={viewMode === 'organiser-flow' ? 'view-switcher-active' : ''}
                type="button"
                onClick={() => {
                  setViewMode('organiser-flow');
                  setRoleId('organiser');
                  setScreenId('create-request');
                }}
              >
                Request flow
              </button>
            </div>
            <a href="/profile">My Profile</a>
            <a href="/register">Create Account</a>
            <IconButton icon={Search} label="Search screens" />
            <IconButton icon={SlidersHorizontal} label="Filter screens" />
            <IconButton icon={Bell} label="Open notifications" />
          </div>
        </header>

        {viewMode === 'organiser-flow' ? (
          <OrganiserRequestFlow getAccessToken={async () => null} />
        ) : null}

        <section className={`role-hero accent-${activeRole.accent}`}>
          <div className="role-hero-copy">
            <activeRole.icon size={26} aria-hidden="true" />
            <div>
              <p className="eyebrow">{activeRole.label}</p>
              <h2>{activeRole.summary}</h2>
            </div>
          </div>
          <div className="role-hero-metrics" aria-label="Current role metrics">
            <span>
              <strong>{activeRole.screens.length}</strong>
              screens
            </span>
            <span>
              <strong>{activeRole.screens.filter((screen) => screen.future).length}</strong>
              future
            </span>
            <span>
              <strong>2</strong>
              viewports
            </span>
          </div>
        </section>

        <section className={`prototype-grid ${viewMode === 'organiser-flow' ? 'prototype-grid-secondary' : ''}`}>
          <aside className="screen-rail" aria-label={`${activeRole.label} screens`}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Screen strip</p>
                <h2>{activeRole.shortLabel}</h2>
              </div>
              <StatusPill tone={activeScreen.tone}>{toneLabel(activeScreen.tone)}</StatusPill>
            </div>
            <div className="screen-list">
              {activeRole.screens.map((screen) => (
                <button
                  className={`screen-card ${screen.id === activeScreen.id ? 'screen-card-active' : ''}`}
                  type="button"
                  key={screen.id}
                  onClick={() => setScreenId(screen.id)}
                >
                  <span>
                    <strong>{screen.title}</strong>
                    <small>{screen.story}</small>
                  </span>
                  <StatusPill tone={screen.tone}>{screen.state}</StatusPill>
                </button>
              ))}
            </div>
          </aside>

          <section className="design-stage" aria-label={`${activeScreen.title} desktop and mobile wireframes`}>
            <DesktopFrame role={activeRole} screen={activeScreen} />
            <MobileFrame role={activeRole} screen={activeScreen} />
          </section>
        </section>
      </section>
    </main>
  );
}

function DesktopFrame({ role, screen }: { role: RoleArea; screen: Screen }) {
  return (
    <article className="desktop-frame">
      <div className="frame-toolbar">
        <div className="window-controls" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span>{role.label}</span>
        <StatusPill tone={screen.tone}>{screen.story}</StatusPill>
      </div>

      <div className="desktop-layout">
        <nav className="app-nav" aria-label="Prototype module navigation">
          <a className="app-nav-active" href="#workspace">
            <LayoutDashboard size={16} aria-hidden="true" />
            Workspace
          </a>
          <a href="#queue">
            <Inbox size={16} aria-hidden="true" />
            Queue
          </a>
          <a href="#timeline">
            <History size={16} aria-hidden="true" />
            History
          </a>
          <a href="#settings">
            <Settings2 size={16} aria-hidden="true" />
            Settings
          </a>
        </nav>

        <section className="screen-main" id="workspace">
          <div className="screen-title-row">
            <div>
              <p className="eyebrow">{screen.state}</p>
              <h3>{screen.title}</h3>
            </div>
            <button className="primary-action" type="button">
              <Send size={16} aria-hidden="true" />
              Save view
            </button>
          </div>

          <div className="metric-row">
            {screen.metrics.map(([label, value]) => (
              <div className="mini-metric" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="work-surface">
            <section className="task-panel" aria-label="Screen tasks">
              <div className="panel-title">
                <ListChecks size={18} aria-hidden="true" />
                <h4>Primary tasks</h4>
              </div>
              {screen.tasks.map((task, index) => (
                <div className="task-row" key={task}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{task}</strong>
                  <ChevronRight size={16} aria-hidden="true" />
                </div>
              ))}
            </section>

            <section className="activity-panel" aria-label="Activity and notes">
              <div className="panel-title">
                <MessageSquareText size={18} aria-hidden="true" />
                <h4>Activity</h4>
              </div>
              {screen.activity.map((item) => (
                <div className="activity-row" key={item}>
                  {screen.tone === 'danger' ? (
                    <AlertTriangle size={16} aria-hidden="true" />
                  ) : screen.tone === 'success' ? (
                    <CheckCircle2 size={16} aria-hidden="true" />
                  ) : (
                    <Clock3 size={16} aria-hidden="true" />
                  )}
                  <span>{item}</span>
                </div>
              ))}
            </section>
          </div>
        </section>
      </div>
    </article>
  );
}

function MobileFrame({ role, screen }: { role: RoleArea; screen: Screen }) {
  return (
    <article className="mobile-device" aria-label={`${screen.title} mobile companion`}>
      <div className="phone-speaker" aria-hidden="true" />
      <div className="phone-screen">
        <header className={`phone-header accent-${role.accent}`}>
          <role.icon size={18} aria-hidden="true" />
          <div>
            <span>{role.shortLabel}</span>
            <strong>{screen.title}</strong>
          </div>
        </header>

        <section className="phone-status">
          <StatusPill tone={screen.tone}>{screen.state}</StatusPill>
          <p>{screen.mobile}</p>
        </section>

        <section className="phone-card-stack" aria-label="Mobile task preview">
          {screen.tasks.slice(0, 3).map((task) => (
            <button className="phone-card" type="button" key={task}>
              <span>{task}</span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          ))}
        </section>

        <footer className="phone-tabs" aria-label="Mobile navigation">
          <DoorOpen size={17} aria-hidden="true" />
          <CalendarDays size={17} aria-hidden="true" />
          <Bell size={17} aria-hidden="true" />
          <Cog size={17} aria-hidden="true" />
        </footer>
      </div>
    </article>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterForm />} />
      <Route path="/profile" element={<ProfileForm />} />
      <Route path="/events" element={<ClientEvents />} />
      <Route path="/events/*" element={<ClientEvents />} />
      <Route path="/attendee/events" element={<AttendeeEvents />} />
      {/* Without this route, event detail links and denied deep links fall through to the landing page. */}
      <Route path="/attendee/events/*" element={<AttendeeEvents />} />
      <Route path="/attendee/discover" element={<EventDiscovery />} />
      <Route path="/attendee/discover/:eventCode" element={<EventDetail />} />
      <Route path="/attendee/register/:eventCode" element={<RegisterForEvent />} />
      <Route path="/attendee/withdraw/:eventCode" element={<WithdrawFromEvent />} />
      <Route path="/attendee/feedback/:eventCode" element={<EventFeedback />} />
      <Route path="/internal/*" element={<AttendeeEvents />} />
      <Route path="/organiser" element={<OrganiserDashboard />} />
      <Route path="/organiser/requests" element={<OrganiserRequestList />} />
      <Route path="/organiser/requests/:eventCode" element={<SubmittedDetail />} />
      <Route path="/organiser/requests/:eventCode/clarify" element={<ClarificationResponse />} />
      <Route path="/organiser/new-request" element={<OrganiserRequestFlow getAccessToken={async () => 'mock-token'} />} />
      <Route path="/organiser/drafts" element={<OrganiserDrafts getAccessToken={async () => 'mock-token'} />} />
      <Route path="/organiser/drafts/:id" element={<OrganiserDraftEdit getAccessToken={async () => 'mock-token'} />} />
      <Route path="/verify" element={<VerifyPage />} />
      <Route path="/permission-denied" element={<PermissionDenied />} />
      <Route path="/coordinator" element={<CoordinatorHome />} />
      <Route path="/coordinator/queue" element={<CoordinatorReviewQueue />} />
      <Route path="/coordinator/events/:eventCode" element={<CoordinatorRequestDetail />} />
      <Route path="/coordinator/events/:eventCode/decide" element={<DecisionPanel />} />
      <Route path="/coordinator/events/:eventCode/plan" element={<PlanningWorkspace />} />
      <Route path="/coordinator/events/:eventCode/readiness" element={<ReadinessChecklist />} />
      <Route path="/coordinator/events/:eventCode/confirm" element={<FinalConfirmation />} />
      <Route path="/venue" element={<VenueDashboard />} />
      <Route path="/venue/inventory" element={<VenueInventory />} />
      <Route path="/venue/availability" element={<AvailabilityCalendar />} />
      <Route path="/venue/bookings/:bookingId" element={<PendingBookingDetail />} />
      <Route path="/support" element={<EquipmentDashboard />} />
      <Route path="/support/catalogue" element={<EquipmentCatalogue />} />
      <Route path="/support/queue" element={<RequestQueue />} />
      <Route path="/support/requests/:requestId" element={<ReservationDetail />} />
      <Route path="/support/technicians" element={<TechnicianAssignment />} />
      <Route path="/support/conflicts" element={<ConflictState />} />
      <Route path="/admin" element={<AdminHome />} />
      <Route path="/admin/users" element={<UserManagement />} />
      <Route path="/admin/users/:userId/role" element={<RoleAssignment />} />
      <Route path="/admin/audit" element={<AuditLogViewer />} />
      <Route path="/prototype" element={<PrototypeApp />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

export { App };
