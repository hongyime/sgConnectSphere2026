import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileText,
  MapPinned,
  Save,
  Send,
} from 'lucide-react';
import { listAccessibilityFeatures, type AccessibilityFeature } from './accessibilityApi';

// Must match backend/src/modules/eventLifecycle/service.ts NONE_REQUIRED.
const NONE_REQUIRED = 'none_required';

type OptionalField = 'equipmentRequirements' | 'layoutPreference' | 'registrationSetup';

type DraftEvent = {
  eventName: string;
  description: string;
  purpose: string;
  startDate: string;
  endDate: string;
  expectedAttendance: string;
  venueRequirements: string;
  accessibilityNeeds: string;
  // E02-S03: predefined accessibility_features ids selected from the live
  // vocabulary, distinct from the free-text accessibilityNeeds above -
  // which is stored and shown to the Coordinator but excluded from
  // automated venue matching.
  accessibilityFeatureIds: string[];
  equipmentRequirements: string;
  layoutPreference: string;
  registrationSetup: string;
};

type FieldKey = keyof DraftEvent;
type SubmitState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'submitted'; persisted: boolean }
  | { status: 'error'; message: string; missingFields?: string[] };

// SCRUM-27: a draft only ever requires these three (Option B - see the
// SCRUM-27 task list). Mirrors the backend's ALWAYS_MANDATORY_KEYS in
// backend/src/modules/eventLifecycle/service.ts.
type DraftSaveState =
  | { status: 'idle' }
  | { status: 'saving' }
  | { status: 'saved' }
  | { status: 'error'; message: string; missingFields?: string[] };

const initialDraft: DraftEvent = {
  eventName: 'Annual Sustainability Forum',
  description: 'A forum bringing together sustainability leads across the client organisation.',
  purpose: 'Share the annual sustainability roadmap and gather feedback.',
  startDate: '2027-01-15T09:00',
  endDate: '2027-01-15T12:00',
  expectedAttendance: '180',
  venueRequirements: 'Seminar room with theatre seating',
  accessibilityNeeds: 'Wheelchair access and front-row reserved seats',
  accessibilityFeatureIds: [],
  equipmentRequirements: 'Projector, 2 wireless microphones, livestream support',
  layoutPreference: '',
  registrationSetup: '',
};

const OPTIONAL_FIELDS: OptionalField[] = ['equipmentRequirements', 'layoutPreference', 'registrationSetup'];

const requiredFields: { key: Exclude<FieldKey, 'accessibilityFeatureIds'>; label: string; optional?: boolean }[] = [
  { key: 'eventName', label: 'Event name' },
  { key: 'description', label: 'Description' },
  { key: 'purpose', label: 'Purpose' },
  { key: 'expectedAttendance', label: 'Expected attendance' },
  { key: 'venueRequirements', label: 'Venue requirements' },
  { key: 'accessibilityNeeds', label: 'Accessibility needs' },
  { key: 'equipmentRequirements', label: 'Equipment requirements', optional: true },
  { key: 'layoutPreference', label: 'Layout preference', optional: true },
  { key: 'registrationSetup', label: 'Registration setup', optional: true },
];

function isFieldComplete(draft: DraftEvent, field: (typeof requiredFields)[number]) {
  const value = draft[field.key].trim();
  // A nonempty number input can still contain zero, a negative value, or a fraction.
  // Match the API's positive-integer rule before enabling submission.
  if (field.key === 'expectedAttendance') {
    return Number.isInteger(Number(value)) && Number(value) > 0;
  }
  if (field.key === 'accessibilityNeeds') {
    // Satisfied by a predefined checkbox OR free text - either records a
    // real accessibility requirement (E02-S03).
    return value.length > 0 || draft.accessibilityFeatureIds.length > 0;
  }
  if (field.optional && value === NONE_REQUIRED) {
    return true;
  }
  return value.length > 0;
}

function getMissingFields(draft: DraftEvent) {
  const missing = requiredFields.filter((field) => !isFieldComplete(draft, field)).map((field) => field.label);
  if (!draft.startDate || !draft.endDate) {
    missing.push('Preferred dates and times');
  }
  return missing;
}

const ALWAYS_MANDATORY_FIELD_KEYS: FieldKey[] = ['eventName', 'expectedAttendance'];

// SCRUM-27 Option B: saving a draft only needs these three, not all ten.
function getDraftMissingFields(draft: DraftEvent) {
  const missing = requiredFields
    .filter((field) => ALWAYS_MANDATORY_FIELD_KEYS.includes(field.key) && !isFieldComplete(draft, field))
    .map((field) => field.label);
  if (!draft.startDate || !draft.endDate) {
    missing.push('Preferred dates and times');
  }
  return missing;
}

function isInvalidDateRange(draft: DraftEvent) {
  if (!draft.startDate || !draft.endDate) {
    return false;
  }

  return new Date(draft.endDate).getTime() <= new Date(draft.startDate).getTime();
}

function isPastDate(draft: DraftEvent) {
  if (!draft.startDate) {
    return false;
  }

  return new Date(draft.startDate).getTime() <= Date.now();
}

function updateDraft(draft: DraftEvent, key: FieldKey, value: string): DraftEvent {
  return { ...draft, [key]: value };
}

function toIsoLocal(value: string) {
  return new Date(value).toISOString();
}

export function OrganiserRequestFlow({
  prototype = false,
  draftId,
  initialValues,
}: {
  // When true, "Save draft" and "Submit request" simulate the state
  // transition locally without hitting the API. Used by the /prototype
  // demo route which is not attached to a real session.
  prototype?: boolean;
  // SCRUM-27: when set, "Save draft" and "Submit request" PATCH this
  // existing draft instead of POSTing a new one.
  draftId?: string;
  // Pre-fills the form when reopening a draft. Omitted (the common case,
  // e.g. /organiser/new-request) keeps the existing example-filled defaults.
  initialValues?: Partial<DraftEvent>;
}) {
  const [draft, setDraft] = useState<DraftEvent>(() => ({ ...initialDraft, ...initialValues }));
  const [submitState, setSubmitState] = useState<SubmitState>({ status: 'idle' });
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>({ status: 'idle' });
  // E02-S03: the predefined checklist is sourced live, not hardcoded. A
  // failed fetch just leaves the checklist empty - free text is always
  // available as a fallback, and prototype mode never needs a real list.
  const [accessibilityFeatures, setAccessibilityFeatures] = useState<AccessibilityFeature[]>([]);
  useEffect(() => {
    if (prototype) return;
    let cancelled = false;
    listAccessibilityFeatures().then((result) => {
      if (!cancelled && result.ok) setAccessibilityFeatures(result.features);
    });
    return () => { cancelled = true; };
  }, [prototype]);
  const missingFields = useMemo(() => getMissingFields(draft), [draft]);
  const draftMissingFields = useMemo(() => getDraftMissingFields(draft), [draft]);
  const invalidDateRange = isInvalidDateRange(draft);
  const pastDate = isPastDate(draft);
  const canSubmit = missingFields.length === 0 && !invalidDateRange && !pastDate;
  // SCRUM-27 Option B: a draft only needs title/dates/attendance valid, not
  // every mandatory field - matches the backend's relaxed validation.
  const canSaveDraft = draftMissingFields.length === 0 && !invalidDateRange && !pastDate;
  const submitted = submitState.status === 'submitted';

  const setNoneRequired = (key: OptionalField, checked: boolean) => {
    setDraft(updateDraft(draft, key, checked ? NONE_REQUIRED : ''));
  };

  const toggleAccessibilityFeature = (featureId: string, checked: boolean) => {
    setDraft((current) => ({
      ...current,
      accessibilityFeatureIds: checked
        ? [...current.accessibilityFeatureIds, featureId]
        : current.accessibilityFeatureIds.filter((id) => id !== featureId),
    }));
  };

  const submitRequest = async () => {
    if (!canSubmit || submitState.status === 'submitting') {
      return;
    }

    setSubmitState({ status: 'submitting' });

    // Prototype mode simulates the state transition without touching the
    // network. The /prototype route uses this so it can demo the flow
    // without a real session cookie.
    if (prototype) {
      setSubmitState({ status: 'submitted', persisted: false });
      return;
    }

    let response: Response;
    try {
      response = await fetch(draftId ? `/api/events?id=${encodeURIComponent(draftId)}` : '/api/events', {
        method: draftId ? 'PATCH' : 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: draft.eventName,
          description: draft.description,
          purpose: draft.purpose,
          status: 'submitted',
          startAt: toIsoLocal(draft.startDate),
          endAt: toIsoLocal(draft.endDate),
          expectedAttendance: Number(draft.expectedAttendance),
          venueRequirements: draft.venueRequirements,
          accessibilityNote: draft.accessibilityNeeds,
          accessibilityFeatureIds: draft.accessibilityFeatureIds,
          equipmentRequirements: draft.equipmentRequirements,
          layoutPreference: draft.layoutPreference,
          registrationSetup: draft.registrationSetup,
        }),
      });
    } catch {
      setSubmitState({ status: 'error', message: 'The request could not be submitted.' });
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (body?.error === 'missing_mandatory_fields' && Array.isArray(body.missingFields)) {
        setSubmitState({
          status: 'error',
          message: 'Submission is blocked until every mandatory field is complete.',
          missingFields: body.missingFields,
        });
        return;
      }
      if (body?.error === 'Preferred date must be in the future') {
        setSubmitState({ status: 'error', message: 'Preferred date must be in the future' });
        return;
      }
      setSubmitState({ status: 'error', message: 'The request could not be submitted.' });
      return;
    }

    setSubmitState({ status: 'submitted', persisted: true });
  };

  const saveDraft = async () => {
    if (!canSaveDraft || draftSaveState.status === 'saving') {
      return;
    }

    setDraftSaveState({ status: 'saving' });

    if (prototype) {
      // In the offline demo the draft has nowhere to persist; report a
      // clear "sign in first" state instead of leaving the form pretending
      // to have saved.
      setDraftSaveState({ status: 'error', message: 'Sign in to save a draft.' });
      return;
    }

    let response: Response;
    try {
      response = await fetch(draftId ? `/api/events?id=${encodeURIComponent(draftId)}` : '/api/events', {
        method: draftId ? 'PATCH' : 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          title: draft.eventName,
          description: draft.description,
          purpose: draft.purpose,
          status: 'draft',
          startAt: toIsoLocal(draft.startDate),
          endAt: toIsoLocal(draft.endDate),
          expectedAttendance: Number(draft.expectedAttendance),
          venueRequirements: draft.venueRequirements,
          accessibilityNote: draft.accessibilityNeeds,
          accessibilityFeatureIds: draft.accessibilityFeatureIds,
          equipmentRequirements: draft.equipmentRequirements,
          layoutPreference: draft.layoutPreference,
          registrationSetup: draft.registrationSetup,
        }),
      });
    } catch {
      setDraftSaveState({ status: 'error', message: 'The draft could not be saved.' });
      return;
    }

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      if (body?.error === 'missing_mandatory_fields' && Array.isArray(body.missingFields)) {
        setDraftSaveState({
          status: 'error',
          message: 'The draft could not be saved until these fields are valid.',
          missingFields: body.missingFields,
        });
        return;
      }
      setDraftSaveState({ status: 'error', message: 'The draft could not be saved.' });
      return;
    }

    setDraftSaveState({ status: 'saved' });
  };

  return (
    <section className="organiser-flow" aria-label="Organiser request creation flow">
      <header className="flow-header">
        <div>
          <p className="eyebrow">Organiser workflow</p>
          <h2>Create event request</h2>
          <p>
            A working request-to-submit flow with mock validation, draft state, and the
            status timeline the backend will later persist.
          </p>
        </div>
        <div className="flow-status">
          {submitState.status === 'submitting' ? (
            <span className="status-pill status-info">Submitting</span>
          ) : submitted ? (
            <span className="status-pill status-success">Submitted</span>
          ) : canSubmit ? (
            <span className="status-pill status-info">Ready to submit</span>
          ) : (
            <span className="status-pill status-warning">Draft has gaps</span>
          )}
        </div>
      </header>

      <div className="flow-layout">
        <aside className="flow-steps" aria-label="Request steps">
          <FlowStep icon={FileText} title="Basics" detail="Name, description, purpose" active />
          <FlowStep icon={CalendarDays} title="Schedule" detail="Date, time, attendance" />
          <FlowStep icon={MapPinned} title="Needs" detail="Venue, equipment, accessibility" />
          <FlowStep icon={ClipboardList} title="Review" detail="Validation and submit" />
        </aside>

        <section className="request-form-panel">
          <div className="form-grid">
            <TextField
              label="Event name"
              value={draft.eventName}
              onChange={(value) => setDraft(updateDraft(draft, 'eventName', value))}
            />
            <TextArea
              label="Description"
              value={draft.description}
              onChange={(value) => setDraft(updateDraft(draft, 'description', value))}
            />
            <TextArea
              label="Purpose"
              value={draft.purpose}
              onChange={(value) => setDraft(updateDraft(draft, 'purpose', value))}
            />
            <TextField
              label="Preferred start date and time"
              type="datetime-local"
              value={draft.startDate}
              onChange={(value) => setDraft(updateDraft(draft, 'startDate', value))}
              invalid={pastDate}
              hint={pastDate ? 'Preferred date must be in the future' : undefined}
            />
            <TextField
              label="Preferred end date and time"
              type="datetime-local"
              value={draft.endDate}
              onChange={(value) => setDraft(updateDraft(draft, 'endDate', value))}
              invalid={invalidDateRange}
              hint={invalidDateRange ? 'End time must be after start time.' : undefined}
            />
            <TextField
              label="Expected attendance"
              type="number"
              value={draft.expectedAttendance}
              onChange={(value) => setDraft(updateDraft(draft, 'expectedAttendance', value))}
            />
            <TextField
              label="Venue requirements"
              value={draft.venueRequirements}
              onChange={(value) => setDraft(updateDraft(draft, 'venueRequirements', value))}
            />
            <div className="field-control field-wide">
              <label>Accessibility requirements</label>
              <div className="field-checkbox-group" role="group" aria-label="Predefined accessibility requirements">
                {accessibilityFeatures.map((feature) => {
                  const id = slugify(`accessibility-${feature.label}`);
                  return (
                    <label key={feature.id} htmlFor={id} className="field-checkbox">
                      <input
                        id={id}
                        type="checkbox"
                        checked={draft.accessibilityFeatureIds.includes(feature.id)}
                        onChange={(event) => toggleAccessibilityFeature(feature.id, event.target.checked)}
                      />
                      {feature.label}
                    </label>
                  );
                })}
              </div>
              <label htmlFor="request-accessibility-needs">Accessibility needs</label>
              <textarea
                id="request-accessibility-needs"
                value={draft.accessibilityNeeds}
                rows={3}
                onChange={(event) => setDraft(updateDraft(draft, 'accessibilityNeeds', event.target.value))}
              />
            </div>
            <OptionalTextArea
              label="Equipment requirements"
              value={draft.equipmentRequirements}
              onChange={(value) => setDraft(updateDraft(draft, 'equipmentRequirements', value))}
              onNoneRequiredChange={(checked) => setNoneRequired('equipmentRequirements', checked)}
            />
            <OptionalTextArea
              label="Layout preference"
              value={draft.layoutPreference}
              onChange={(value) => setDraft(updateDraft(draft, 'layoutPreference', value))}
              onNoneRequiredChange={(checked) => setNoneRequired('layoutPreference', checked)}
            />
            <OptionalTextArea
              label="Registration setup"
              value={draft.registrationSetup}
              onChange={(value) => setDraft(updateDraft(draft, 'registrationSetup', value))}
              onNoneRequiredChange={(checked) => setNoneRequired('registrationSetup', checked)}
            />
          </div>

          <div className="form-actions">
            <button
              className="secondary-action"
              type="button"
              disabled={!canSaveDraft || draftSaveState.status === 'saving'}
              onClick={saveDraft}
            >
              <Save size={16} aria-hidden="true" />
              {draftSaveState.status === 'saving' ? 'Saving...' : 'Save draft'}
            </button>
            <button
              className="primary-action"
              type="button"
              disabled={!canSubmit || submitState.status === 'submitting'}
              onClick={submitRequest}
            >
              <Send size={16} aria-hidden="true" />
              {submitState.status === 'submitting' ? 'Submitting...' : 'Submit request'}
            </button>
          </div>
          {draftSaveState.status === 'error' ? (
            <div role="alert" className="field-control">
              <p className="login-error">{draftSaveState.message}</p>
              {draftSaveState.missingFields ? (
                <ul className="validation-list" aria-label="Fields blocking draft save">
                  {draftSaveState.missingFields.map((label) => (
                    <li key={label}>{label}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {draftSaveState.status === 'saved' ? (
            <p role="status" className="field-control">Draft saved.</p>
          ) : null}
        </section>

        <aside className="review-panel" aria-label="Validation and status">
          <section>
            <div className="panel-title">
              {canSubmit ? (
                <CheckCircle2 size={18} aria-hidden="true" />
              ) : (
                <AlertTriangle size={18} aria-hidden="true" />
              )}
              <h3>Definition of ready</h3>
            </div>
            {missingFields.length === 0 ? (
              <p className="review-copy">All mandatory request details are present.</p>
            ) : (
              <ul className="validation-list" aria-label="Missing mandatory fields">
                {missingFields.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="panel-title">
              <ClipboardList size={18} aria-hidden="true" />
              <h3>Status timeline</h3>
            </div>
            {submitState.status === 'error' ? (
              <div role="alert">
                <p className="login-error">{submitState.message}</p>
                {submitState.missingFields ? (
                  <ul className="validation-list" aria-label="Fields blocking submission">
                    {submitState.missingFields.map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}
            <ol className="timeline-list">
              <li className="timeline-done">Draft saved locally</li>
              <li className={canSubmit ? 'timeline-done' : ''}>Mandatory fields complete</li>
              <li className={submitted ? 'timeline-done' : ''}>
                {submitState.status === 'submitted' && submitState.persisted
                  ? 'Persisted through API and submitted to coordinator queue'
                  : 'Submitted to coordinator queue'}
              </li>
              <li>Awaiting coordinator review</li>
            </ol>
          </section>
        </aside>
      </div>
    </section>
  );
}

function FlowStep({
  icon: Icon,
  title,
  detail,
  active = false,
}: {
  icon: typeof FileText;
  title: string;
  detail: string;
  active?: boolean;
}) {
  return (
    <div className={`flow-step ${active ? 'flow-step-active' : ''}`}>
      <Icon size={18} aria-hidden="true" />
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <ChevronRight size={16} aria-hidden="true" />
    </div>
  );
}

function slugify(label: string) {
  return `request-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  invalid = false,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  invalid?: boolean;
  hint?: string;
}) {
  const id = slugify(label);
  return (
    <div className={`field-control ${invalid ? 'field-invalid' : ''}`}>
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? (
        <small role={invalid ? 'alert' : undefined}>{hint}</small>
      ) : null}
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = slugify(label);
  return (
    <div className="field-control field-wide">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} value={value} rows={4} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function OptionalTextArea({
  label,
  value,
  onChange,
  onNoneRequiredChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onNoneRequiredChange: (checked: boolean) => void;
}) {
  const noneRequired = value === NONE_REQUIRED;
  const id = slugify(label);
  const noneRequiredId = `${id}-none-required`;

  return (
    <div className="field-control field-wide">
      <label htmlFor={id}>{label}</label>
      <textarea
        id={id}
        value={noneRequired ? '' : value}
        rows={4}
        disabled={noneRequired}
        onChange={(event) => onChange(event.target.value)}
      />
      <label className="field-none-required" htmlFor={noneRequiredId}>
        <input
          id={noneRequiredId}
          type="checkbox"
          checked={noneRequired}
          aria-label={`${label}: none required`}
          onChange={(event) => onNoneRequiredChange(event.target.checked)}
        />
        None required
      </label>
    </div>
  );
}
