import { useMemo, useState } from 'react';
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

type DraftEvent = {
  title: string;
  eventType: string;
  startDate: string;
  endDate: string;
  expectedAttendance: string;
  venuePreference: string;
  equipmentNeeds: string;
  accessibilityNeeds: string;
  cateringNeeds: string;
  organiserNotes: string;
};

type FieldKey = keyof DraftEvent;

const initialDraft: DraftEvent = {
  title: 'Annual Sustainability Forum',
  eventType: 'Conference',
  startDate: '2027-01-15T09:00',
  endDate: '2027-01-15T12:00',
  expectedAttendance: '180',
  venuePreference: 'Seminar room with theatre seating',
  equipmentNeeds: 'Projector, 2 wireless microphones, livestream support',
  accessibilityNeeds: 'Wheelchair access and front-row reserved seats',
  cateringNeeds: '',
  organiserNotes: '',
};

const requiredFields: { key: FieldKey; label: string }[] = [
  { key: 'title', label: 'Event title' },
  { key: 'eventType', label: 'Event type' },
  { key: 'startDate', label: 'Start date and time' },
  { key: 'endDate', label: 'End date and time' },
  { key: 'expectedAttendance', label: 'Expected attendance' },
  { key: 'venuePreference', label: 'Venue preference' },
  { key: 'equipmentNeeds', label: 'Equipment needs' },
  { key: 'accessibilityNeeds', label: 'Accessibility needs' },
  { key: 'cateringNeeds', label: 'Catering needs' },
  { key: 'organiserNotes', label: 'Purpose and organiser notes' },
];

function getMissingFields(draft: DraftEvent) {
  return requiredFields.filter((field) => draft[field.key].trim().length === 0);
}

function isInvalidDateRange(draft: DraftEvent) {
  if (!draft.startDate || !draft.endDate) {
    return false;
  }

  return new Date(draft.endDate).getTime() <= new Date(draft.startDate).getTime();
}

function updateDraft(draft: DraftEvent, key: FieldKey, value: string): DraftEvent {
  return { ...draft, [key]: value };
}

export function OrganiserRequestFlow() {
  const [draft, setDraft] = useState(initialDraft);
  const [submitted, setSubmitted] = useState(false);
  const missingFields = useMemo(() => getMissingFields(draft), [draft]);
  const invalidDateRange = isInvalidDateRange(draft);
  const canSubmit = missingFields.length === 0 && !invalidDateRange;

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
          {submitted ? (
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
          <FlowStep icon={FileText} title="Basics" detail="Title, type, purpose" active />
          <FlowStep icon={CalendarDays} title="Schedule" detail="Date, time, attendance" />
          <FlowStep icon={MapPinned} title="Needs" detail="Venue, equipment, accessibility" />
          <FlowStep icon={ClipboardList} title="Review" detail="Validation and submit" />
        </aside>

        <section className="request-form-panel">
          <div className="form-grid">
            <TextField
              label="Event title"
              value={draft.title}
              onChange={(value) => setDraft(updateDraft(draft, 'title', value))}
            />
            <TextField
              label="Event type"
              value={draft.eventType}
              onChange={(value) => setDraft(updateDraft(draft, 'eventType', value))}
            />
            <TextField
              label="Start date and time"
              type="datetime-local"
              value={draft.startDate}
              onChange={(value) => setDraft(updateDraft(draft, 'startDate', value))}
            />
            <TextField
              label="End date and time"
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
              label="Venue preference"
              value={draft.venuePreference}
              onChange={(value) => setDraft(updateDraft(draft, 'venuePreference', value))}
            />
            <TextArea
              label="Equipment needs"
              value={draft.equipmentNeeds}
              onChange={(value) => setDraft(updateDraft(draft, 'equipmentNeeds', value))}
            />
            <TextArea
              label="Accessibility needs"
              value={draft.accessibilityNeeds}
              onChange={(value) => setDraft(updateDraft(draft, 'accessibilityNeeds', value))}
            />
            <TextArea
              label="Catering needs"
              value={draft.cateringNeeds}
              onChange={(value) => setDraft(updateDraft(draft, 'cateringNeeds', value))}
            />
            <TextArea
              label="Purpose and organiser notes"
              value={draft.organiserNotes}
              onChange={(value) => setDraft(updateDraft(draft, 'organiserNotes', value))}
            />
          </div>

          <div className="form-actions">
            <button className="secondary-action" type="button">
              <Save size={16} aria-hidden="true" />
              Save draft
            </button>
            <button
              className="primary-action"
              type="button"
              disabled={!canSubmit}
              onClick={() => setSubmitted(true)}
            >
              <Send size={16} aria-hidden="true" />
              Submit request
            </button>
          </div>
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
              <ul className="validation-list">
                {missingFields.map((field) => (
                  <li key={field.key}>{field.label}</li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="panel-title">
              <ClipboardList size={18} aria-hidden="true" />
              <h3>Status timeline</h3>
            </div>
            <ol className="timeline-list">
              <li className="timeline-done">Draft saved locally</li>
              <li className={canSubmit ? 'timeline-done' : ''}>Mandatory fields complete</li>
              <li className={submitted ? 'timeline-done' : ''}>Submitted to coordinator queue</li>
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
  return (
    <label className={`field-control ${invalid ? 'field-invalid' : ''}`}>
      <span>{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      {hint ? <small>{hint}</small> : null}
    </label>
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
  return (
    <label className="field-control field-wide">
      <span>{label}</span>
      <textarea value={value} rows={4} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
