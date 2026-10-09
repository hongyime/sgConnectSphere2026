// Event-information edit form for E03-S07. It sends only the fields that
// changed, validates them the way the server does (non-empty text, positive
// whole attendance, end after start) so errors appear next to the field, and
// shows the server's message for anything it refuses.
//
// Fields outside `editable` are shown read-only with `lockedNote`, which is
// how the Organiser's post-approval restrictions (Scenario 4) will render
// once the Organiser read exposes these fields.
import { Fragment, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Lock, Save } from 'lucide-react';
import { Alert, Button, FormActions, FormSection } from '../../shared';
import { updateEventInformation, type EditableField, type EventPatch } from './eventEditApi';
import { fieldList } from './eventEditFields';
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
  registration_setup?: string | null;
  registration_opens_at?: string | null;
  registration_closes_at?: string | null;
};

type FieldSpec = { field: EditableField; label: string; kind: 'text' | 'textarea' | 'datetime' | 'number'; wide?: boolean; hint?: string };

// Date changes fan out to the Organiser and attendees (informationChange.ts),
// and datetime-local has no zone of its own, so say both next to the fields.
const dateHint = `Times are in ${Intl.DateTimeFormat().resolvedOptions().timeZone}. Changing the date notifies the Organiser and registered attendees.`;

const sections: { title: string; fields: FieldSpec[] }[] = [
  { title: 'Basics', fields: [
    { field: 'title', label: 'Event name', kind: 'text', wide: true },
    { field: 'description', label: 'Description', kind: 'textarea', wide: true },
    { field: 'purpose', label: 'Purpose', kind: 'textarea', wide: true },
  ] },
  { title: 'Date and attendance', fields: [
    { field: 'startAt', label: 'Starts', kind: 'datetime', hint: dateHint },
    { field: 'endAt', label: 'Ends', kind: 'datetime', hint: dateHint },
    { field: 'expectedAttendance', label: 'Expected attendance', kind: 'number' },
  ] },
  { title: 'Requirements', fields: [
    { field: 'venueRequirements', label: 'Venue requirements', kind: 'textarea' },
    { field: 'accessibilityNote', label: 'Accessibility needs', kind: 'textarea' },
    { field: 'equipmentRequirements', label: 'Equipment', kind: 'textarea' },
    { field: 'layoutPreference', label: 'Layout', kind: 'textarea' },
  ] },
  { title: 'Registration', fields: [
    { field: 'registrationSetup', label: 'Registration setup', kind: 'textarea', wide: true },
    { field: 'registrationDates', label: 'Registration dates', kind: 'text' },
  ] },
];

type Draft = Omit<Record<EditableField, string>, 'registrationDates'> & { registrationDates?: string };

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
    registrationSetup: values.registration_setup ?? '',
    registrationDates: `${values.registration_opens_at ? toLocalInput(values.registration_opens_at) : ''}|${values.registration_closes_at ? toLocalInput(values.registration_closes_at) : ''}`,
  };
}

const labelOf = Object.fromEntries(sections.flatMap(section => section.fields).map(spec => [spec.field, spec.label])) as Record<EditableField, string>;

export function buildPatch(initial: Draft, draft: Draft): { patch: EventPatch; errors: Partial<Record<EditableField, string>> } {
  const patch: EventPatch = {};
  const errors: Partial<Record<EditableField, string>> = {};
  for (const field of Object.keys(draft) as EditableField[]) {
    const value = (draft[field] ?? '').trim();
    if (value === (initial[field] ?? '').trim()) continue;
    if (field === 'expectedAttendance') {
      const number = Number(value);
      if (!/^[1-9]\d*$/.test(value)) errors[field] = 'Enter a whole number greater than 0.';
      else patch.expectedAttendance = number;
    } else if (field === 'startAt' || field === 'endAt') {
      const date = new Date(value);
      if (!value || Number.isNaN(date.getTime())) errors[field] = 'Enter a valid date and time.';
      else patch[field] = date.toISOString();
    } else if (field === 'registrationDates') {
      const [opensAt, closesAt] = value.split('|');
      if (!opensAt || !closesAt || Number.isNaN(Date.parse(opensAt)) || Number.isNaN(Date.parse(closesAt)) || new Date(closesAt) <= new Date(opensAt)) {
        errors[field] = 'Enter a valid opening and closing date, with closing after opening.';
      } else {
        patch.registrationDates = { opensAt: new Date(opensAt).toISOString(), closesAt: new Date(closesAt).toISOString() };
      }
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
  const alertRef = useRef<HTMLDivElement>(null);

  // Bring the form into view when it opens, and move focus to any error so
  // keyboard and screen-reader users hear why the save didn't go through.
  useEffect(() => {
    headingRef.current?.scrollIntoView?.({ block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => { if (serverError) alertRef.current?.focus(); }, [serverError]);
  const changed = (Object.keys(draft) as EditableField[]).some(field => (draft[field] ?? '').trim() !== (initial[field] ?? '').trim());

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

  // Registration dates that are locked and empty (the Coordinator read doesn't
  // return them) would only show two blank read-only boxes, so leave them out.
  const hasRegistrationDates = Boolean(values.registration_opens_at || values.registration_closes_at);
  const visibleSections = sections
    .map(section => ({ ...section, fields: section.fields.filter(spec =>
      spec.field !== 'registrationDates' || editable.has(spec.field) || hasRegistrationDates) }))
    .filter(section => section.fields.length > 0);

  return (
    <form className="card event-edit-form" onSubmit={submit} noValidate aria-labelledby="event-edit-heading">
      <div className="event-edit-header">
        <h2 id="event-edit-heading" ref={headingRef} tabIndex={-1}>Edit event details</h2>
        {intro}
      </div>
      {serverError ? (
        <div ref={alertRef} tabIndex={-1} className="event-edit-alert"><Alert tone="error">{serverError}</Alert></div>
      ) : null}
      {visibleSections.map(section => (
        <FormSection key={section.title} title={section.title}>
          {/* Hand-built rather than FormField: a locked field adds a lock icon
              to its label and a second note to its description. */}
          {section.fields.map(spec => {
            const locked = !editable.has(spec.field);
            const id = `edit-${spec.field}`;
            const error = errors[spec.field];
            const describedBy = [error ? `${id}-error` : null, spec.hint ? `${id}-hint` : null, locked ? `${id}-locked` : null].filter(Boolean).join(' ') || undefined;
            const common = {
              id, value: draft[spec.field], readOnly: locked, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy,
              onChange: (change: { target: { value: string } }) => update(spec.field, change.target.value),
            };
            const lock = locked ? <Lock size={12} aria-hidden="true" /> : null;
            const state = `${error ? ' field-invalid' : ''}${locked ? ' event-edit-locked' : ''}`;
            const lockedHint = locked && lockedNote ? <p id={`${id}-locked`} className="field-hint">{lockedNote}</p> : null;
            const errorText = error ? <small id={`${id}-error`}>{error}</small> : null;
            if (spec.field === 'registrationDates') {
              // Two ordinary fields side by side in the section grid, rather
              // than a nested fieldset the section's legend rule would float.
              const [opens = '', closes = ''] = (draft.registrationDates ?? '').split('|');
              const dateProps = { type: 'datetime-local', readOnly: locked, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy };
              return (
                <Fragment key={spec.field}>
                  <div className={`field-control${state}`}>
                    <label htmlFor={`${id}-opens`}>Registration opens{lock}</label>
                    <input id={`${id}-opens`} {...dateProps} value={opens} onChange={change => update(spec.field, `${change.target.value}|${closes}`)} />
                    {lockedHint}
                  </div>
                  <div className={`field-control${state}`}>
                    <label htmlFor={`${id}-closes`}>Registration closes{lock}</label>
                    <input id={`${id}-closes`} {...dateProps} value={closes} onChange={change => update(spec.field, `${opens}|${change.target.value}`)} />
                    {errorText}
                  </div>
                </Fragment>
              );
            }
            return (
              <div key={spec.field} className={`field-control${spec.wide ? ' field-wide' : ''}${state}`}>
                <label htmlFor={id}>{spec.label}{lock}</label>
                {spec.kind === 'textarea'
                  ? <textarea rows={3} {...common} />
                  : <input type={spec.kind === 'datetime' ? 'datetime-local' : spec.kind === 'number' ? 'number' : 'text'} min={spec.kind === 'number' ? 1 : undefined} {...common} />}
                {spec.hint ? <p id={`${id}-hint`} className="field-hint">{spec.hint}</p> : null}
                {lockedHint}
                {errorText}
              </div>
            );
          })}
        </FormSection>
      ))}
      <FormActions>
        <Button onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" variant="primary" icon={<Save size={14} aria-hidden="true" />} busy={saving} busyLabel="Saving…" disabled={!changed}>
          Save changes
        </Button>
      </FormActions>
    </form>
  );
}
