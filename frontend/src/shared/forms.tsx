// Form building blocks on the existing .field-control / .form-section /
// .form-actions styles, with the accessibility wiring done for you: the label,
// hint and error are linked to the control, and an error sets aria-invalid.
import { useId, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from './buttons';
import './shared.css';

export type ControlProps = {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
};

// Render prop gives you the props to spread on your input, textarea or select:
//   <FormField label="Event name" error={errors.title}>
//     {props => <input {...props} value={title} onChange={e => setTitle(e.target.value)} />}
//   </FormField>
export function FormField({ label, hint, error, wide = false, children }: {
  label: string;
  hint?: string;
  error?: string;
  // Span both columns of a .form-grid.
  wide?: boolean;
  children: (props: ControlProps) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`field-control${wide ? ' field-wide' : ''}${error ? ' field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined })}
      {hint ? <p id={hintId} className="field-hint">{hint}</p> : null}
      {error ? <small id={errorId}>{error}</small> : null}
    </div>
  );
}

// A titled group of fields laid out in the two-column .form-grid (one column on phones).
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="form-section ui-form-section">
      <legend>{title}</legend>
      <div className="form-grid">{children}</div>
    </fieldset>
  );
}

// Save, cancel and similar buttons, right-aligned (stacked on phones).
export function FormActions({ children }: { children: ReactNode }) {
  return <div className="form-actions">{children}</div>;
}

// Inline "are you sure?" step for decisions: approve, reject, cancel, withdraw,
// revert. With `reasonLabel`, a reason is required before confirming.
export function ConfirmPanel({
  title, description, confirmLabel, busyLabel, reasonLabel, reasonRequiredMessage, danger = false, busy = false, error, onConfirm, onCancel,
}: {
  title: string;
  description?: ReactNode;
  confirmLabel: string;
  // Shown on the confirm button while busy, e.g. "Rejecting…".
  busyLabel?: string;
  reasonLabel?: string;
  // Replaces "<reasonLabel> is required." so the screen can use the API's own
  // sentence for the same rule (design.md section 8.5).
  reasonRequiredMessage?: string;
  danger?: boolean;
  busy?: boolean;
  // Server refusal to show inside the panel.
  error?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  const [missing, setMissing] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (reasonLabel && !reason.trim()) { setMissing(true); return; }
    onConfirm(reason.trim());
  }
  return (
    <form className={`card ui-confirm${danger ? ' ui-confirm-danger' : ''}`} onSubmit={submit} noValidate aria-label={title}>
      <h2>{title}</h2>
      {description ? <div className="ui-confirm-description">{description}</div> : null}
      {error ? <p role="alert" className="ui-inline-error"><AlertTriangle size={14} aria-hidden="true" /> {error}</p> : null}
      {reasonLabel ? (
        <FormField label={reasonLabel} error={missing ? reasonRequiredMessage ?? `${reasonLabel} is required.` : undefined} wide>
          {props => <textarea {...props} rows={3} value={reason} onChange={change => { setReason(change.target.value); setMissing(false); }} />}
        </FormField>
      ) : null}
      <FormActions>
        <Button onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" variant={danger ? 'danger' : 'primary'} busy={busy} busyLabel={busyLabel}>{confirmLabel}</Button>
      </FormActions>
    </form>
  );
}
