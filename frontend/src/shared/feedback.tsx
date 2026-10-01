// Status pills, alerts, and the loading, empty and error states every screen
// that loads data must show.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Info, Inbox, Loader2, LockKeyhole, RefreshCw } from 'lucide-react';
import { statusLabel } from './format';
import type { Failure } from './useLoad';
import './shared.css';

// One pill for every event, booking and reservation status. Colours come from
// the status-* classes in styles.css.
export function StatusPill({ status, label }: { status: string; label?: string }) {
  return <span className={`status-pill status-${status.replaceAll('_', '-')}`}>{label ?? statusLabel(status)}</span>;
}

type Tone = 'success' | 'info' | 'warning' | 'error';
const toneIcon: Record<Tone, ReactNode> = {
  success: <CheckCircle2 size={18} aria-hidden="true" />,
  info: <Info size={18} aria-hidden="true" />,
  warning: <AlertTriangle size={18} aria-hidden="true" />,
  error: <AlertTriangle size={18} aria-hidden="true" />,
};

// A message about something that just happened or must be fixed: a save that
// worked, a server refusal ("overlaps booking X"), a warning. Errors and
// warnings are announced immediately (role="alert"); others politely.
export function Alert({ tone, title, children, action }: { tone: Tone; title?: string; children: ReactNode; action?: ReactNode }) {
  const urgent = tone === 'error' || tone === 'warning';
  return (
    <div className={`ui-alert ui-alert-${tone}`} role={urgent ? 'alert' : 'status'}>
      {toneIcon[tone]}
      <div>
        {title ? <strong>{title}</strong> : null}
        <div>{children}</div>
      </div>
      {action ? <div className="ui-alert-action">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label, rows = 3 }: { label: string; rows?: number }) {
  return (
    <section className="card ui-state" aria-busy="true">
      <p role="status" className="ui-state-title"><Loader2 size={18} className="ui-spin" aria-hidden="true" /> {label}</p>
      <div className="ui-skeleton" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => <span key={index} />)}
      </div>
    </section>
  );
}

// Nothing to show yet: say why, and what will make something appear.
export function EmptyState({ title, children, icon = <Inbox size={22} />, action }: {
  title: string; children: ReactNode; icon?: ReactNode; action?: ReactNode;
}) {
  return (
    <section className="card ui-state ui-state-empty">
      <span className="ui-state-icon" aria-hidden="true">{icon}</span>
      <p className="ui-state-title">{title}</p>
      <p className="ui-state-copy">{children}</p>
      {action ? <div>{action}</div> : null}
    </section>
  );
}

// The right message for a failed load: 401 asks the user to sign in, 403
// shows the server's refusal, anything else offers a retry.
// `context` completes "Couldn't load …", e.g. "your assigned events".
export function ErrorState({ failure, context, onRetry, backTo = '/home', backLabel = 'Back to my home page' }: {
  failure: Failure;
  context: string;
  onRetry?: () => void;
  backTo?: string;
  backLabel?: string;
}) {
  if (failure.status === 401) {
    return (
      <section className="card ui-state" role="alert">
        <p className="ui-state-title"><LockKeyhole size={18} aria-hidden="true" /> Sign in to continue</p>
        <p className="ui-state-copy">Your session has ended. Sign in again to see {context}.</p>
        <div><Link to="/login" className="primary-action">Sign in</Link></div>
      </section>
    );
  }
  if (failure.status === 403) {
    return (
      <section className="card ui-state ui-state-refused" role="alert">
        <p className="ui-state-title"><LockKeyhole size={18} aria-hidden="true" /> Access refused</p>
        <p className="ui-state-copy">{failure.message}</p>
        <div><Link to={backTo} className="secondary-action">{backLabel}</Link></div>
      </section>
    );
  }
  return (
    <section className="card ui-state ui-state-error" role="alert">
      <p className="ui-state-title"><AlertTriangle size={18} aria-hidden="true" /> Couldn&apos;t load {context}</p>
      <p className="ui-state-copy">{failure.message}</p>
      {onRetry ? (
        <div><button type="button" className="secondary-action" onClick={onRetry}><RefreshCw size={14} aria-hidden="true" /> Try again</button></div>
      ) : null}
    </section>
  );
}
