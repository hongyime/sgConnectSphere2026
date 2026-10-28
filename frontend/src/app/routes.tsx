import { lazy, Suspense, type ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import '../shared/shared.css';

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
import { ComingSoon } from './ComingSoon';
import { HomeRedirect } from './HomeRedirect';

const LostVenueRecovery = lazy(() => import('../features/venue/LostVenueRecovery').then(m => ({ default: m.LostVenueRecovery })));
const EventAttendance = lazy(() => import('../features/coordinator/EventAttendance').then(m => ({ default: m.EventAttendance })));
const EventCompletion = lazy(() => import('../features/events/EventCompletion').then(m => ({ default: m.EventCompletion })));
const EventCancellation = lazy(() => import('../features/events/EventCancellation').then(m => ({ default: m.EventCancellation })));
const MySchedule = lazy(() => import('../features/support/TechnicianStaffing').then(m => ({ default: m.MySchedule })));
const StaffingQueue = lazy(() => import('../features/support/TechnicianStaffing').then(m => ({ default: m.StaffingQueue })));
const StaffingRequestPage = lazy(() => import('../features/support/TechnicianStaffing').then(m => ({ default: m.StaffingRequestPage })));
const EquipmentAvailability = lazy(() => import('../features/support/EquipmentAvailability').then(m => ({ default: m.EquipmentAvailability })));
const EquipmentRequests = lazy(() => import('../features/support/EquipmentRequests').then(m => ({ default: m.EquipmentRequests })));
const EquipmentRequestFormPage = lazy(() => import('../features/support/EquipmentRequests').then(m => ({ default: m.EquipmentRequestFormPage })));
const EquipmentRequestEvents = lazy(() => import('../features/support/EquipmentRequests').then(m => ({ default: m.EquipmentRequestEvents })));
const EquipmentCatalogue = lazy(() => import('../features/support/EquipmentCatalogue').then(m => ({ default: m.EquipmentCatalogue })));
const EquipmentFormPage = lazy(() => import('../features/support/EquipmentCatalogue').then(m => ({ default: m.EquipmentFormPage })));
const EquipmentDetail = lazy(() => import('../features/support/EquipmentCatalogue').then(m => ({ default: m.EquipmentDetail })));
const MarkUnavailablePage = lazy(() => import('../features/support/EquipmentUnavailability').then(m => ({ default: m.MarkUnavailablePage })));

const LandingPage = lazy(() => import('../features/landing/LandingPage').then(m => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('../features/accessControl/LoginPage').then(m => ({ default: m.LoginPage })));
const PasswordRecovery = lazy(() => import('../features/accessControl/PasswordRecovery').then(m => ({ default: m.PasswordRecovery })));
const VerifyPage = lazy(() => import('../features/accessControl/VerifyPage').then(m => ({ default: m.VerifyPage })));
const RegisterForm = lazy(() => import('../features/accessControl/RegisterForm').then(m => ({ default: m.RegisterForm })));
const ProfileForm = lazy(() => import('../features/accessControl/ProfileForm').then(m => ({ default: m.ProfileForm })));
const PermissionDenied = lazy(() => import('../features/access/PermissionDenied').then(m => ({ default: m.PermissionDenied })));
const ClientEvents = lazy(() => import('../features/organiser/ClientEvents').then(m => ({ default: m.ClientEvents })));
const OrganiserRequestFlow = lazy(() => import('../features/organiser/OrganiserRequestFlow').then(m => ({ default: m.OrganiserRequestFlow })));
const OrganiserDrafts = lazy(() => import('../features/organiser/OrganiserDrafts').then(m => ({ default: m.OrganiserDrafts })));
const OrganiserDraftEdit = lazy(() => import('../features/organiser/OrganiserDrafts').then(m => ({ default: m.OrganiserDraftEdit })));
const OrganiserDashboard = lazy(() => import('../features/organiser/Organiser').then(m => ({ default: m.OrganiserDashboard })));
const OrganiserRequestList = lazy(() => import('../features/organiser/Organiser').then(m => ({ default: m.RequestList })));
const SubmittedDetail = lazy(() => import('../features/organiser/Organiser').then(m => ({ default: m.SubmittedDetail })));
const AttendeeEvents = lazy(() => import('../features/attendee/AttendeeEvents').then(m => ({ default: m.AttendeeEvents })));
const WithdrawFromEvent = lazy(() => import('../features/attendee/AttendeeRegistration').then(m => ({ default: m.WithdrawFromEvent })));
const EventFeedback = lazy(() => import('../features/attendee/AttendeeRegistration').then(m => ({ default: m.EventFeedback })));
const EventDiscovery = lazy(() => import('../features/attendee/EventRegistration').then(m => ({ default: m.EventDiscovery })));
const EventDetail = lazy(() => import('../features/attendee/EventRegistration').then(m => ({ default: m.EventDetail })));
const RegisterForEvent = lazy(() => import('../features/attendee/EventRegistration').then(m => ({ default: m.RegisterForEvent })));
const NotificationInbox = lazy(() => import('../features/notifications/NotificationInbox').then(m => ({ default: m.NotificationInbox })));
const ChangeRequests = lazy(() => import('../features/events/ChangeRequests').then(m => ({ default: m.ChangeRequests })));
const AnswerQuestions = lazy(() => import('../features/organiser/AnswerQuestions').then(m => ({ default: m.AnswerQuestions })));
const EventRegistrationsPage = lazy(() => import('../features/organiser/EventRegistrations').then(m => ({ default: m.EventRegistrationsPage })));
const RegistrationPeriodPage = lazy(() => import('../features/organiser/RegistrationPeriod').then(m => ({ default: m.RegistrationPeriodPage })));
const RequestClarification = lazy(() => import('../features/coordinator/RequestClarification').then(m => ({ default: m.RequestClarification })));
const CoordinatorHome = lazy(() => import('../features/coordinator/CoordinatorWorkspace').then(m => ({ default: m.CoordinatorHome })));
const CoordinatorReviewQueue = lazy(() => import('../features/coordinator/CoordinatorWorkspace').then(m => ({ default: m.ReviewQueue })));
const CoordinatorRequestDetail = lazy(() => import('../features/coordinator/CoordinatorWorkspace').then(m => ({ default: m.RequestDetail })));
const CoordinatorReassignments = lazy(() => import('../features/coordinator/CoordinatorWorkspace').then(m => ({ default: m.Reassignments })));
const SupportRequestForm = lazy(() => import('../features/coordinator/TechnicalSupport').then(m => ({ default: m.SupportRequestForm })));
const PlanningWorkspace = lazy(() => import('../features/coordinator/Coordinator').then(m => ({ default: m.PlanningWorkspace })));
const ConfirmRedirect = lazy(() => import('../features/coordinator/EventReadiness').then(m => ({ default: m.ConfirmRedirect })));
const EventReadiness = lazy(() => import('../features/coordinator/EventReadiness').then(m => ({ default: m.EventReadiness })));
const DecisionPanel = lazy(() => import('../features/coordinator/DecisionPanel').then(m => ({ default: m.DecisionPanel })));
const VenueSuitability = lazy(() => import('../features/venue/VenueSuitability').then(m => ({ default: m.VenueSuitability })));
const VenueBookingRequests = lazy(() => import('../features/venue/VenueBookingRequests').then(m => ({ default: m.VenueBookingRequests })));
const HoldVenueForm = lazy(() => import('../features/coordinator/VenueHolds').then(m => ({ default: m.HoldVenueForm })));
const TentativeHolds = lazy(() => import('../features/venue/TentativeHolds').then(m => ({ default: m.TentativeHolds })));
const VenueSearch = lazy(() => import('../features/venue/VenueSearch').then(m => ({ default: m.VenueSearch })));
const VenueCalendar = lazy(() => import('../features/venue/VenueCalendar').then(m => ({ default: m.VenueCalendar })));
const VenueForm = lazy(() => import('../features/venue/VenueForm').then(m => ({ default: m.VenueForm })));
const VenueDashboard = lazy(() => import('../features/venue/Venue').then(m => ({ default: m.VenueDashboard })));
const VenueInventory = lazy(() => import('../features/venue/Venue').then(m => ({ default: m.VenueInventory })));
const AvailabilityCalendar = lazy(() => import('../features/venue/Venue').then(m => ({ default: m.AvailabilityCalendar })));
const BookingDecision = lazy(() => import('../features/venue/BookingRequests').then(m => ({ default: m.BookingDecision })));
const BookingDetail = lazy(() => import('../features/venue/BookingRequests').then(m => ({ default: m.BookingDetail })));
const BookingRequests = lazy(() => import('../features/venue/BookingRequests').then(m => ({ default: m.BookingRequests })));
const VenueBlockout = lazy(() => import('../features/venue/VenueBlockout').then(m => ({ default: m.VenueBlockout })));
const EquipmentDashboard = lazy(() => import('../features/support/Support').then(m => ({ default: m.EquipmentDashboard })));
const EquipmentReservationFormPage = lazy(() => import('../features/support/EquipmentReservations').then(m => ({ default: m.EquipmentReservationFormPage })));
const AdminHome = lazy(() => import('../features/admin/Admin').then(m => ({ default: m.AdminHome })));
const UserManagement = lazy(() => import('../features/admin/Admin').then(m => ({ default: m.UserManagement })));
const RoleAssignment = lazy(() => import('../features/admin/Admin').then(m => ({ default: m.RoleAssignment })));
const AuditLogViewer = lazy(() => import('../features/admin/Admin').then(m => ({ default: m.AuditLogViewer })));
const ReportingDashboard = lazy(() => import('../features/admin/Admin').then(m => ({ default: m.ReportingDashboard })));
const DigestPreferences = lazy(() => import('../features/admin/Admin').then(m => ({ default: m.DigestPreferences })));
const Recommendations = lazy(() => import('../features/admin/Admin').then(m => ({ default: m.Recommendations })));
const AuditHistory = lazy(() => import('../features/operations/Operations').then(m => ({ default: m.AuditHistory })));
const CommentsActivity = lazy(() => import('../features/operations/Operations').then(m => ({ default: m.CommentsActivity })));
const SearchFilter = lazy(() => import('../features/operations/Operations').then(m => ({ default: m.SearchFilter })));
const EmptyErrorLoading = lazy(() => import('../features/operations/Operations').then(m => ({ default: m.EmptyErrorLoading })));

const UiKit = lazy(() => import('./UiKit').then(m => ({ default: m.UiKit })));
const ListTemplate = lazy(() => import('../templates/ListTemplate').then(m => ({ default: m.ListTemplate })));
const DetailTemplate = lazy(() => import('../templates/DetailTemplate').then(m => ({ default: m.DetailTemplate })));
const FormTemplate = lazy(() => import('../templates/FormTemplate').then(m => ({ default: m.FormTemplate })));
const DecisionTemplate = lazy(() => import('../templates/DecisionTemplate').then(m => ({ default: m.DecisionTemplate })));

export type RouteAccess = 'public' | 'signed-in';
export type RouteStatus = 'live' | 'mock' | 'coming-soon' | 'redirect';

export type AppRoute = {
  path: string;
  element: ReactElement;
  access: RouteAccess;
  status: RouteStatus;
  story?: string;
};

function RouteLoading() {
  return (
    <div className="ui-page" role="status" aria-label="Loading page">
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '40vh' }}>
        <Loader2 size={32} className="ui-spin" aria-hidden="true" />
        <span className="visually-hidden">Loading page…</span>
      </div>
    </div>
  );
}

const withSuspense = (element: ReactElement): ReactElement => (
  <Suspense fallback={<RouteLoading />}>{element}</Suspense>
);

const pub = (path: string, element: ReactElement, story?: string): AppRoute =>
  ({ path, element: withSuspense(element), access: 'public', status: 'live', story });
const sample = (path: string, element: ReactElement): AppRoute =>
  ({ path, element: withSuspense(element), access: 'signed-in', status: 'mock' });
const page = (path: string, element: ReactElement, status: RouteStatus, story?: string): AppRoute =>
  ({ path, element: withSuspense(element), access: 'signed-in', status, story });

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
  page('/organiser/requests/:eventCode/change', <ChangeRequests />, 'live', 'E10-S01'),
  page('/organiser/requests/:eventCode/cancel', <EventCancellation />, 'live', 'E10-S04'),
  page('/organiser/requests/:eventCode/registrations', <EventRegistrationsPage />, 'live', 'E09-S02'),
  page('/organiser/requests/:eventCode/registration-period', <RegistrationPeriodPage />, 'live', 'E09-S03'),
  page('/change-requests/new', <ChangeRequests />, 'live', 'E10-S01'),
  page('/coordinator/events/:eventCode/changes', <ChangeRequests coordinator />, 'live', 'E10-S01'),
  page('/organiser/new-request', <OrganiserRequestFlow />, 'live', 'E02-S01'),
  page('/organiser/drafts', <OrganiserDrafts />, 'live', 'E02-S02'),
  page('/organiser/drafts/:id', <OrganiserDraftEdit />, 'live', 'E02-S02'),

  // Attendee
  page('/attendee/events', <AttendeeEvents />, 'live', 'E01-S03'),
  // Without this route, event detail links and denied deep links fall through to the landing page.
  page('/attendee/events/*', <AttendeeEvents />, 'live', 'E01-S03'),
  page('/internal/*', <AttendeeEvents />, 'live', 'E01-S03'),
  page('/attendee/discover', <EventDiscovery />, 'live', 'E09-S01'),
  page('/attendee/discover/:eventCode', <EventDetail />, 'live', 'E09-S01'),
  page('/attendee/register/:eventCode', <RegisterForEvent />, 'live', 'E09-S01'),
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
  page('/coordinator/events/:eventCode/attendance', <EventAttendance />, 'live', 'E09-S06'),
  page('/coordinator/events/:eventCode/cancel', <EventCancellation />, 'live', 'E10-S04'),
  page('/events/:eventCode/cancellation', <EventCancellation />, 'live', 'E10-S04'),
  page('/coordinator/events/:eventCode', <CoordinatorRequestDetail />, 'live', 'E03-S01'),
  page('/coordinator/events/:eventCode/clarify', <RequestClarification />, 'live', 'E03-S02'),
  page('/coordinator/events/:eventCode/decide', <DecisionPanel />, 'live', 'E03-S03'),
  page('/coordinator/events/:eventCode/support', <SupportRequestForm />, 'live', 'E07-S06'),
  page('/coordinator/events/:eventCode/plan', <PlanningWorkspace />, 'mock', 'E07-S02'),
  page('/coordinator/events/:eventCode/readiness', <EventReadiness />, 'live', 'E08-S03'),
  page('/coordinator/events/:eventCode/confirm', <ConfirmRedirect />, 'redirect', 'E08-S03'),
  page('/coordinator/events/:eventCode/complete', <EventCompletion />, 'live', 'E08-S05'),
  page('/coordinator/calendar', <VenueCalendar audience="coordinator" />, 'live', 'E05-S03'),
  page('/coordinator/venues/:venueId/calendar', <VenueCalendar audience="coordinator" />, 'live', 'E05-S03'),
  page('/coordinator/venues', <VenueSearch />, 'live', 'E06-S01'),
  page('/coordinator/events/:eventCode/venues', <VenueSearch />, 'live', 'E06-S01'),
  page('/coordinator/events/:eventCode/venue-recovery', <LostVenueRecovery />, 'live', 'E10-S05'),
  page('/coordinator/events/:eventCode/venue-bookings', <VenueBookingRequests />, 'live', 'E06-S03'),
  page('/coordinator/events/:eventCode/venues/:venueId/suitability', <VenueSuitability />, 'live', 'E06-S02'),
  page('/coordinator/events/:eventCode/venues/:venueId/hold', <HoldVenueForm />, 'live', 'E06-S05'),

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
  page('/venue/holds', <TentativeHolds />, 'live', 'E06-S05'),

  // Technical Support Staff
  page('/support', <EquipmentDashboard />, 'mock'),
  page('/support/catalogue', <EquipmentCatalogue />, 'live', 'E07-S01'),
  page('/support/catalogue/new', <EquipmentFormPage />, 'live', 'E07-S01'),
  page('/support/catalogue/:equipmentId/edit', <EquipmentFormPage />, 'live', 'E07-S01'),
  page('/support/catalogue/:equipmentId/unavailable', <MarkUnavailablePage />, 'live', 'E07-S05'),
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
