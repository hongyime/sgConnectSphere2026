// Shared building blocks for every story's screens (ADR-017 skeleton).
// Import from here:  import { PageLayout, Card, useLoad, apiCall } from '../../shared';
// See every block live at /ui-kit.
export { apiCall, jsonRequest, isAbort, type ApiResult, type ApiFailure } from './api';
export { useLoad, type Load, type Failure } from './useLoad';
export { statusLabel, formatDate, formatDateRange } from './format';
export { PageLayout, Card, FactList } from './layout';
export { Button, ButtonLink } from './buttons';
export { FormField, FormSection, FormActions, ConfirmPanel, type ControlProps } from './forms';
export { StatusPill, Alert, LoadingState, EmptyState, ErrorState } from './feedback';
export { DataTable, FilterChips, type Column, type FilterOption } from './data';
export { useSession, type SessionState, type SessionUser } from '../features/shell/AppHeader';
