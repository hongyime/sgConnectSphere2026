import { MySchedule, StaffingQueue, StaffingRequestPage } from '../features/support/TechnicianStaffing';
import { EquipmentAvailability } from '../features/support/EquipmentAvailability';
import { EquipmentRequests, EquipmentRequestFormPage, EquipmentRequestEvents } from '../features/support/EquipmentRequests';
import { EquipmentCatalogue, EquipmentFormPage, EquipmentDetail } from '../features/support/EquipmentCatalogue';
// The single route table for the app (ADR-017 skeleton, SCRUM-116).
//
// To add a page: add one entry here. `access: 'signed-in'` pages render inside
// the shared AppShell (header and navigation); `public` pages render alone.
// `status` records what the page is today, so anyone can see at a glance which
// screens are real:
//   live      - reads or writes the real API
//   mock      - built-in sample data; saves nothing
//   coming-soon - no screen yet; shows the standard ComingSoon page
//   redirect  - sends the user somewhere else
// `story` is the Release 1 story the page belongs to (see the screen
// inventory), or undefined for pages that belong to no story.
//
// Role home pages and header links live in roles.ts; routes.test.tsx checks
// they all point at routes registered here.
import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { LandingPage } from '../features/landing/LandingPage';
import { LoginPage } from '../features/accessControl/LoginPage';
import { PasswordRecovery } from '../features/accessControl/PasswordRecovery';
import { VerifyPage } from '../features/accessControl/VerifyPage';
import { RegisterForm } from '../features/accessControl/RegisterForm';
import { ProfileForm } from '../features/accessControl/ProfileForm';
import { PermissionDenied } from '../features/access/PermissionDenied';
import { ClientEvents } from '../features/organiser/ClientEvents';
import { OrganiserRequestFlow } from '../features/organiser/OrganiserRequestFlow';
import { OrganiserDrafts, OrganiserDraftEdit } from '../features/organiser/OrganiserDrafts';
import {
  OrganiserDashboard, RequestList as OrganiserRequestList, SubmittedDetail,
  ChangeRequest, CancellationForm,
} from '../features/organiser/Organiser';
import { AttendeeEvents } from '../features/attendee/AttendeeEvents';
import {
  EventDiscovery, EventDetail, RegisterForEvent, WithdrawFromEvent, EventFeedback,
} from '../features/attendee/AttendeeRegistration';
import { NotificationInbox } from '../features/notifications/NotificationInbox';
import { AnswerQuestions } from '../features/organiser/AnswerQuestions';
import { RequestClarification } from '../features/coordinator/RequestClarification';
import {
  CoordinatorHome, ReviewQueue as CoordinatorReviewQueue, RequestDetail as CoordinatorRequestDetail,
  Reassignments as CoordinatorReassignments,
} from '../features/coordinator/CoordinatorWorkspace';
import { SupportRequestForm } from '../features/coordinator/TechnicalSupport';
import { PlanningWorkspace, ReadinessChecklist, FinalConfirmation } from '../features/coordinator/Coordinator';
import { DecisionPanel } from '../features/coordinator/DecisionPanel';
import { VenueSearch } from '../features/venue/VenueSearch';
import { VenueCalendar } from '../features/venue/VenueCalendar';
import { VenueForm } from '../features/venue/VenueForm';
import { VenueDashboard, VenueInventory, AvailabilityCalendar } from '../features/venue/Venue';
import { BookingDecision, BookingDetail, BookingRequests } from '../features/venue/BookingRequests';
import { VenueBlockout } from '../features/venue/VenueBlockout';
import { EquipmentDashboard } from '../features/support/Support';
import { EquipmentReservationFormPage } from '../features/support/EquipmentReservations';
import {
  AdminHome, UserManagement, RoleAssignment, AuditLogViewer, ReportingDashboard, DigestPreferences, Recommendations,
} from '../features/admin/Admin';
import { AuditHistory, CommentsActivity, SearchFilter, EmptyErrorLoading } from '../features/operations/Operations';
import { ComingSoon } from './ComingSoon';
import { HomeRedirect } from './HomeRedirect';
import { UiKit } from './UiKit';
import { ListTemplate } from '../templates/ListTemplate';
import { DetailTemplate } from '../templates/DetailTemplate';
import { FormTemplate } from '../templates/FormTemplate';
import { DecisionTemplate } from '../templates/DecisionTemplate';

export type RouteAccess = 'public' | 'signed-in';
export type RouteStatus = 'live' | 'mock' | 'coming-soon' | 'redirect';

export type AppRoute = {
  path: string;
  element: ReactElement;
  access: RouteAccess;
  status: RouteStatus;
  story?: string;
};

const pub = (path: string, element: ReactElement, story?: string): AppRoute =>
  ({ path, element, access: 'public', status: 'live', story });
const sample = (path: string, element: ReactElement): AppRoute =>
  ({ path, element, access: 'signed-in', status: 'mock' });
const page = (path: string, element: ReactElement, status: RouteStatus, story?: string): AppRoute =>
  ({ path, element, access: 'signed-in', status, story });

export const routes: AppRoute[] = [
  // Public pages: no shared header.
  pub('/', <LandingPage />),
  pub('/login', <LoginPage />, 'E01-S01'),
  pub('/forgot-password', <PasswordRecovery key="request" />, 'E01-S01'),
  pub('/reset-password', <PasswordRecovery key="reset" reset />, 'E01-S01'),
  pub('/register', <RegisterForm />, 'E01-S08'),
  pub('/verify', <VerifyPage />, 'E01-S08'),

  page('/coordinator/equipment-requests', <EquipmentRequestEvents />, 'live', 'E07-S02'),
  page('/support/equipment-requests', <EquipmentRequestEvents />, 'live', 'E07-S02'),
  page('/coordinator/events/:eventCode/equipment', <EquipmentRequests />, 'live', 'E07-S02'),
  page('/support/events/:eventCode/equipment', <EquipmentRequests />, 'live', 'E07-S02'),
  page('/coordinator/events/:eventCode/equipment/new', <EquipmentRequestFormPage />, 'live', 'E07-S02'),
  page('/coordinator/events/:eventCode/equipment/:requestId/edit', <EquipmentRequestFormPage />, 'live', 'E07-S02'),

  // Every role
  page('/home', <HomeRedirect />, 'redirect', 'E01-S01'),
  page('/profile', <ProfileForm />, 'live', 'E01-S04'),
  page('/notifications', <NotificationInbox />, 'live', 'E11-S01'),
  page('/permission-denied', <PermissionDenied />, 'live'),
  // Reference page for the shared building blocks (sample data, no API calls).
  page('/ui-kit', <UiKit />, 'live'),
  // Copyable page templates running on in-memory sample data (frontend/src/templates).
  sample('/ui-kit/templates/list', <ListTemplate />),
  sample('/ui-kit/templates/new', <FormTemplate />),
  sample('/ui-kit/templates/items/:id', <DetailTemplate />),
  sample('/ui-kit/templates/items/:id/edit', <FormTemplate />),
  sample('/ui-kit/templates/items/:id/decide', <DecisionTemplate />),

  // Event Organiser
  page('/events', <ClientEvents />, 'live', 'E01-S02'),
  page('/events/*', <ClientEvents />, 'live', 'E03-S05'),
  page('/organiser', <OrganiserDashboard />, 'live', 'E03-S05'),
  page('/organiser/requests', <OrganiserRequestList />, 'live', 'E03-S05'),
  page('/organiser/requests/:eventCode', <SubmittedDetail />, 'live', 'E03-S05'),
  page('/organiser/requests/:eventCode/clarify', <AnswerQuestions />, 'live', 'E03-S02'),
  page('/organiser/requests/:eventCode/change', <ChangeRequest />, 'mock', 'E10-S01'),
  page('/organiser/requests/:eventCode/cancel', <CancellationForm />, 'mock', 'E10-S04'),
  // Where restricted post-approval edits (E03-S07) and the edit API's 409
  // changeRequestUrl send the Organiser, until E10-S01 builds the form.
  page('/change-requests/new', (
    <ComingSoon story="E10-S01" title="Request a change"
      summary="After approval, changes to restricted event details such as the date, attendance or requirements go through a change request that the assigned Coordinator reviews." />
  ), 'coming-soon', 'E10-S01'),
  page('/organiser/new-request', <OrganiserRequestFlow />, 'live', 'E02-S01'),
  page('/organiser/drafts', <OrganiserDrafts />, 'live', 'E02-S02'),
  page('/organiser/drafts/:id', <OrganiserDraftEdit />, 'live', 'E02-S02'),

  // Attendee
  page('/attendee/events', <AttendeeEvents />, 'live', 'E01-S03'),
  // Without this route, event detail links and denied deep links fall through to the landing page.
  page('/attendee/events/*', <AttendeeEvents />, 'live', 'E01-S03'),
  page('/internal/*', <AttendeeEvents />, 'live', 'E01-S03'),
  page('/attendee/discover', <EventDiscovery />, 'mock', 'E09-S01'),
  page('/attendee/discover/:eventCode', <EventDetail />, 'mock', 'E09-S01'),
  page('/attendee/register/:eventCode', <RegisterForEvent />, 'mock', 'E09-S01'),
  page('/attendee/withdraw/:eventCode', <WithdrawFromEvent />, 'mock', 'E09-S05'),
  page('/attendee/feedback/:eventCode', <EventFeedback />, 'mock'),
  page('/attendee/waitlist/:eventCode', (
    <ComingSoon story="E09-S04" title="Waiting list"
      summary="Shown when an event is full: the attendee's place on the waiting list, and how seats are offered automatically when a registered attendee withdraws." />
  ), 'coming-soon', 'E09-S04'),

  // Event Coordinator
  page('/coordinator', <CoordinatorHome />, 'live', 'E03-S01'),
  page('/coordinator/queue', <CoordinatorReviewQueue />, 'live', 'E03-S01'),
  page('/coordinator/reassignments', <CoordinatorReassignments />, 'live', 'E03-S01'),
  page('/coordinator/events/:eventCode', <CoordinatorRequestDetail />, 'live', 'E03-S01'),
  page('/coordinator/events/:eventCode/clarify', <RequestClarification />, 'live', 'E03-S02'),
  page('/coordinator/events/:eventCode/decide', <DecisionPanel />, 'live', 'E03-S03'),
  page('/coordinator/events/:eventCode/support', <SupportRequestForm />, 'live', 'E07-S06'),
  page('/coordinator/events/:eventCode/plan', <PlanningWorkspace />, 'mock', 'E07-S02'),
  page('/coordinator/events/:eventCode/readiness', <ReadinessChecklist />, 'mock', 'E08-S03'),
  page('/coordinator/events/:eventCode/confirm', <FinalConfirmation />, 'mock', 'E08-S03'),
  page('/coordinator/calendar', <VenueCalendar audience="coordinator" />, 'live', 'E05-S03'),
  page('/coordinator/venues/:venueId/calendar', <VenueCalendar audience="coordinator" />, 'live', 'E05-S03'),
  page('/coordinator/venues', <VenueSearch />, 'live', 'E06-S01'),
  page('/coordinator/events/:eventCode/venues', <VenueSearch />, 'live', 'E06-S01'),

  // Venue Staff
  page('/venue', <VenueDashboard />, 'mock'),
  page('/venue/inventory', <VenueInventory />, 'live', 'E05-S01'),
  page('/venue/inventory/new', <VenueForm mode="create" />, 'live', 'E05-S01'),
  page('/venue/inventory/:venueId/edit', <VenueForm mode="edit" />, 'live', 'E05-S01'),
  page('/venue/availability', <AvailabilityCalendar />, 'live', 'E05-S03'),
  page('/venue/bookings', <BookingRequests />, 'live', 'E06-S04'),
  page('/venue/bookings/:bookingId', <BookingDetail />, 'live', 'E06-S04'),
  page('/venue/bookings/:bookingId/decide', <BookingDecision />, 'live', 'E06-S04'),
  page('/venue/blockout', <VenueBlockout />, 'live', 'E05-S04'),

  // Technical Support Staff
  page('/support', <EquipmentDashboard />, 'mock'),
  page('/support/catalogue', <EquipmentCatalogue />, 'live', 'E07-S01'),
  page('/support/catalogue/new', <EquipmentFormPage />, 'live', 'E07-S01'),
  page('/support/catalogue/:equipmentId/edit', <EquipmentFormPage />, 'live', 'E07-S01'),
  page('/support/catalogue/:equipmentId', <EquipmentDetail />, 'live', 'E07-S01'),
  // E07-S04 (D35): reserving happens on the live event equipment pages; the
  // old mock queue and reservation detail now lead to the live list.
  page('/support/events/:eventCode/equipment/:requestId/reserve', <EquipmentReservationFormPage />, 'live', 'E07-S04'),
  page('/support/queue', <Navigate to="/support/equipment-requests" replace />, 'redirect', 'E07-S04'),
  page('/support/requests/:requestId', <Navigate to="/support/equipment-requests" replace />, 'redirect', 'E07-S04'),
  page('/support/technicians', <StaffingQueue />, 'live', 'E07-S07'),
  page('/support/technicians/:requestId', <StaffingRequestPage />, 'live', 'E07-S07'),
  page('/support/schedule', <MySchedule />, 'live', 'E07-S07'),
  page('/support/conflicts', <EquipmentAvailability />, 'live', 'E07-S03'),
  page('/support/availability', <EquipmentAvailability />, 'live', 'E07-S03'),

  // Administrator (no Release 1 stories)
  page('/admin', <AdminHome />, 'mock'),
  page('/admin/users', <UserManagement />, 'mock'),
  page('/admin/users/:userId/role', <RoleAssignment />, 'mock'),
  page('/admin/audit', <AuditLogViewer />, 'mock'),
  page('/admin/reports', <ReportingDashboard />, 'mock'),
  page('/admin/digest', <DigestPreferences />, 'mock'),
  page('/admin/recommendations', <Recommendations />, 'mock'),

  // Design-review screens with no Release 1 story
  page('/audit', <AuditHistory />, 'mock'),
  page('/comments', <CommentsActivity />, 'mock'),
  page('/search', <SearchFilter />, 'mock'),
  page('/ui-states', <EmptyErrorLoading />, 'mock'),
];
