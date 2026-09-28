// Event-information edit form for E03-S07. It sends only the fields that
// changed, validates them the way the server does (non-empty text, positive
// whole attendance, end after start) so errors appear next to the field, and
// shows the server's message for anything it refuses.
//
// Fields outside `editable` are shown read-only with `lockedNote`, which is
// how the Organiser's post-approval restrictions (Scenario 4) will render
// once the Organiser read exposes these fields.
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { AlertTriangle, Lock, Save } from 'lucide-react';
import { updateEventInformation, type EditableField, type EventPatch } from './eventEditApi';
import './eventEdit.css';

export type EventEditValues = {
  title: string;
  description: string | null;
  purpose: string | null;
  starts_at: string;
  ends_at: string;
  expected_attendance: number;
  venue_requirements: string | null;
  accessibility_note: string | null;
  equipment_requirements: string | null;
  layout_preference: string | null;
};

type FieldSpec = { field: EditableField; label: string; kind: 'text' | 'textarea' | 'datetime' | 'number'; wide?: boolean; hint?: string };

const sections: { title: string; fields: FieldSpec[] }[] = [
  { title: 'Basics', fields: [
    { field: 'title', label: 'Event name', kind: 'text', wide: true },
    { field: 'description', label: 'Description', kind: 'textarea', wide: true },
    { field: 'purpose', label: 'Purpose', kind: 'textarea', wide: true },
  ] },
  { title: 'Date and attendance', fields: [
    { field: 'startAt', label: 'Starts', kind: 'datetime' },
    { field: 'endAt', label: 'Ends', kind: 'datetime' },
    { field: 'expectedAttendance', label: 'Expected attendance', kind: 'number' },
  ] },
  { title: 'Requirements', fields: [
    { field: 'venueRequirements', label: 'Venue requirements', kind: 'textarea' },
    { field: 'accessibilityNote', label: 'Accessibility needs', kind: 'textarea' },
    { field: 'equipmentRequirements', label: 'Equipment', kind: 'textarea' },
    { field: 'layoutPreference', label: 'Layout', kind: 'textarea' },
  ] },
];

type Draft = Record<EditableField, string>;

// <input type="datetime-local"> works in local time without a zone.
export function toLocalInput(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDraft(values: EventEditValues): Draft {
  return {
    title: values.title,
    description: values.description ?? '',
    purpose: values.purpose ?? '',
    startAt: toLocalInput(values.starts_at),
    endAt: toLocalInput(values.ends_at),
    expectedAttendance: String(values.expected_attendance),
    venueRequirements: values.venue_requirements ?? '',
    accessibilityNote: values.accessibility_note ?? '',
    equipmentRequirements: values.equipment_requirements ?? '',
    layoutPreference: values.layout_preference ?? '',
  };
}

const labelOf = Object.fromEntries(sections.flatMap(section => section.fields).map(spec => [spec.field, spec.label])) as Record<EditableField, string>;

export function buildPatch(initial: Draft, draft: Draft): { patch: EventPatch; errors: Partial<Record<EditableField, string>> } {
  const patch: EventPatch = {};
  const errors: Partial<Record<EditableField, string>> = {};
  for (const field of Object.keys(draft) as EditableField[]) {
    const value = draft[field].trim();
    if (value === initial[field].trim()) continue;
    if (field === 'expectedAttendance') {
      const number = Number(value);
      if (!/^\d+$/.test(value) || number <= 0) errors[field] = 'Enter a whole number greater than 0.';
      else patch.expectedAttendance = number;
    } else if (field === 'startAt' || field === 'endAt') {
      const date = new Date(value);
      if (!value || Number.isNaN(date.getTime())) errors[field] = 'Enter a valid date and time.';
      else patch[field] = date.toISOString();
    } else if (!value) {
      errors[field] = `${labelOf[field]} can't be left empty.`;
    } else {
      patch[field] = value;
    }
  }
  const start = new Date(draft.startAt);
  const end = new Date(draft.endAt);
  if (!errors.startAt && !errors.endAt && (patch.startAt || patch.endAt) && end <= start) {
    errors.endAt = 'The event must end after it starts.';
  }
  return { patch, errors };
}

export function EventEditForm({ eventId, values, editable, lockedNote, onSaved, onCancel, intro }: {
  eventId: string;
  values: EventEditValues;
  editable: ReadonlySet<EditableField>;
  lockedNote?: ReactNode;
  onSaved: (fields: string[]) => void;
  onCancel: () => void;
  intro?: ReactNode;
}) {
  const initial = useMemo(() => toDraft(values), [values]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [errors, setErrors] = useState<Partial<Record<EditableField, string>>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLParagraphElement>(null);

  // Bring the form into view when it opens, and move focus to any error so
  // keyboard and screen-reader users hear why the save didn't go through.
  useEffect(() => {
    headingRef.current?.scrollIntoView?.({ block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => { if (serverError) alertRef.current?.focus(); }, [serverError]);
  const changed = (Object.keys(draft) as EditableField[]).some(field => draft[field].trim() !== initial[field].trim());

  function update(field: EditableField, value: string) {
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setServerError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const { patch, errors: found } = buildPatch(initial, draft);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setServerError('Fix the highlighted fields, then save again.');
      return;
    }
    if (Object.keys(patch).length === 0) return;
    setSaving(true);
    setServerError(null);
    const result = await updateEventInformation(eventId, patch);
    setSaving(false);
    if (!result.ok) { setServerError(result.message); return; }
    onSaved(result.fields);
  }

  return (
    <form className="card event-edit-form" onSubmit={submit} noValidate aria-labelledby="event-edit-heading">
      <div className="event-edit-header">
        <h2 id="event-edit-heading" ref={headingRef} tabIndex={-1}>Edit event details</h2>
        {intro}
      </div>
      {serverError ? (
        <p role="alert" className="event-edit-alert" ref={alertRef} tabIndex={-1}><AlertTriangle size={16} aria-hidden="true" /> {serverError}</p>
      ) : null}
      {sections.map(section => (
        <fieldset key={section.title} className="form-section event-edit-section">
          <legend>{section.title}</legend>
          <div className="form-grid">
            {section.fields.map(spec => {
              const locked = !editable.has(spec.field);
              const id = `edit-${spec.field}`;
              const error = errors[spec.field];
              const describedBy = [error ? `${id}-error` : null, locked ? `${id}-locked` : null].filter(Boolean).join(' ') || undefined;
              const common = {
                id, value: draft[spec.field], readOnly: locked, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy,
                onChange: (change: { target: { value: string } }) => update(spec.field, change.target.value),
              };
              return (
                <div key={spec.field} className={`field-control${spec.wide ? ' field-wide' : ''}${error ? ' field-invalid' : ''}${locked ? ' event-edit-locked' : ''}`}>
                  <label htmlFor={id}>{spec.label}{locked ? <Lock size={12} aria-hidden="true" /> : null}</label>
                  {spec.kind === 'textarea'
                    ? <textarea rows={3} {...common} />
                    : <input type={spec.kind === 'datetime' ? 'datetime-local' : spec.kind === 'number' ? 'number' : 'text'} min={spec.kind === 'number' ? 1 : undefined} {...common} />}
                  {locked && lockedNote ? <p id={`${id}-locked`} className="field-hint">{lockedNote}</p> : null}
                  {error ? <small id={`${id}-error`}>{error}</small> : null}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
      <div className="form-actions">
        <button type="button" className="secondary-action" onClick={onCancel} disabled={saving}>Cancel</button>
        <button type="submit" className="primary-action" disabled={saving || !changed}>
          <Save size={14} aria-hidden="true" /> {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}
