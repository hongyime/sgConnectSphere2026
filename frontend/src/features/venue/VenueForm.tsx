// E05-S01 / E05-S02 add and edit venue form for Venue Staff, on the shared
// blocks (ADR-017).
import { useState, type FormEvent, type KeyboardEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Alert, Button, ButtonLink, ErrorState, FormActions, FormField, FormSection, LoadingState, PageLayout, useLoad,
  type ApiResult,
} from '../../shared';
import { createVenue, getVenue, updateVenue, type Venue, type VenueLayout } from './venueApi';
import './venue.css';

type FormValues = {
  name: string;
  location: string;
  max_capacity: string;
  opens_at: string;
  closes_at: string;
  facilities: string[];
  accessibility_features: string[];
  supported_layouts: VenueLayout[];
};

const emptyForm: FormValues = {
  name: '', location: '', max_capacity: '', opens_at: '', closes_at: '',
  facilities: [], accessibility_features: [], supported_layouts: [],
};

function toForm(venue: Venue): FormValues {
  return {
    name: venue.name,
    location: venue.location,
    max_capacity: String(venue.max_capacity),
    opens_at: venue.opens_at,
    closes_at: venue.closes_at,
    facilities: venue.facilities,
    accessibility_features: venue.accessibility_features,
    supported_layouts: venue.supported_layouts,
  };
}

export function VenueForm({ mode }: { mode: 'create' | 'edit' }) {
  const { venueId } = useParams<{ venueId: string }>();
  const { result, reload } = useLoad(async (signal): Promise<ApiResult<Venue | null>> => (
    mode === 'edit' && venueId ? getVenue(venueId, signal) : { ok: true, data: null }
  ), [mode, venueId]);

  return (
    <PageLayout eyebrow="Venue staff" title={mode === 'create' ? 'Add venue' : 'Edit venue'} width="narrow">
      {result.state === 'loading' ? <LoadingState label="Loading venue…" rows={4} /> : null}
      {result.state === 'error' ? (
        <ErrorState
          failure={result.failure} onRetry={reload} context="this venue"
          backTo="/venue/inventory" backLabel="Back to venue inventory"
        />
      ) : null}
      {/* React Router reuses this screen between venue URLs. Keying the form
          by venue starts it afresh, so one venue's values and messages can
          never be saved against another. */}
      {result.state === 'ready' ? (
        <VenueFormBody
          key={venueId ?? 'new'} mode={mode} venueId={venueId}
          initial={result.data ? toForm(result.data) : emptyForm}
        />
      ) : null}
    </PageLayout>
  );
}

function VenueFormBody({ mode, venueId, initial }: { mode: 'create' | 'edit'; venueId?: string; initial: FormValues }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<FormValues>(initial);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [layoutWarning, setLayoutWarning] = useState<string | null>(null);

  const setField = (key: 'name' | 'location' | 'max_capacity' | 'opens_at' | 'closes_at') => (value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const addToList = (key: 'facilities' | 'accessibility_features', value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (values[key].some((item) => item.toLowerCase() === trimmed.toLowerCase())) return;
    setValues((current) => ({ ...current, [key]: [...current[key], trimmed] }));
  };

  const removeFromList = (key: 'facilities' | 'accessibility_features', value: string) => {
    setValues((current) => ({ ...current, [key]: current[key].filter((item) => item !== value) }));
  };

  // Client-side duplicate check only - this form always saves the whole
  // layout list via action: 'update' (a full replace), never the backend's
  // incremental add_layout action, so there is no live add_layout call to
  // route this through. The message deliberately matches the backend's own
  // wording in addVenueLayout() for consistency (E05-S02 Scenario 3).
  const addLayout = (label: string, capacity: string): boolean => {
    const trimmedLabel = label.trim();
    const parsedCapacity = Number(capacity);
    if (!trimmedLabel || !Number.isInteger(parsedCapacity) || parsedCapacity <= 0) return false;
    if (values.supported_layouts.some((layout) => layout.label.toLowerCase() === trimmedLabel.toLowerCase())) {
      setLayoutWarning(`"${trimmedLabel}" is already a supported layout for this venue.`);
      return false;
    }
    setLayoutWarning(null);
    setValues((current) => ({
      ...current,
      supported_layouts: [...current.supported_layouts, { label: trimmedLabel, capacity: parsedCapacity }],
    }));
    return true;
  };

  const removeLayout = (label: string) => {
    setValues((current) => ({
      ...current,
      supported_layouts: current.supported_layouts.filter((layout) => layout.label !== label),
    }));
  };

  const canSubmit = Boolean(
    values.name.trim() && values.location.trim() && values.max_capacity
    && values.opens_at && values.closes_at
    && values.facilities.length > 0 && values.accessibility_features.length > 0 && values.supported_layouts.length > 0,
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setErrors({});
    setFormError(null);

    const input = {
      name: values.name.trim(),
      location: values.location.trim(),
      max_capacity: Number(values.max_capacity),
      opens_at: values.opens_at,
      closes_at: values.closes_at,
      facilities: values.facilities,
      accessibility_features: values.accessibility_features,
      supported_layouts: values.supported_layouts,
    };

    const result = mode === 'create' ? await createVenue(input) : await updateVenue(venueId!, input);
    setSaving(false);

    if (!result.ok) {
      setErrors(result.fieldErrors ?? {});
      setFormError(result.message);
      return;
    }

    navigate('/venue/inventory');
  };

  const fieldError = (key: string) => errors[key]?.join(' ') || undefined;

  return (
    <form onSubmit={submit} noValidate className="venue-form card" aria-label={mode === 'create' ? 'Add venue' : 'Edit venue'}>
      {formError ? <Alert tone="error">{formError}</Alert> : null}

      <FormSection title="Basic details">
        <TextField label="Venue name" value={values.name} onChange={setField('name')} error={fieldError('name')} wide />
        <TextField label="Location" value={values.location} onChange={setField('location')} error={fieldError('location')} wide />
        <TextField label="Max capacity" type="number" value={values.max_capacity} onChange={setField('max_capacity')} error={fieldError('max_capacity')} />
        <span aria-hidden="true" />
        <TextField label="Opens at" type="time" value={values.opens_at} onChange={setField('opens_at')} error={fieldError('opens_at')} />
        <TextField label="Closes at" type="time" value={values.closes_at} onChange={setField('closes_at')} error={fieldError('closes_at')} />
      </FormSection>

      <FormSection title="Facilities and accessibility">
        <TagListField
          label="Facilities" items={values.facilities}
          onAdd={(value) => addToList('facilities', value)}
          onRemove={(value) => removeFromList('facilities', value)}
          errors={errors.facilities}
        />
        <TagListField
          label="Accessibility features" items={values.accessibility_features}
          onAdd={(value) => addToList('accessibility_features', value)}
          onRemove={(value) => removeFromList('accessibility_features', value)}
          errors={errors.accessibility_features}
        />
      </FormSection>

      <FormSection title="Supported layouts">
        <LayoutListField
          layouts={values.supported_layouts}
          onAdd={addLayout}
          onRemove={removeLayout}
          errors={errors.supported_layouts}
          warning={layoutWarning}
        />
      </FormSection>

      <FormActions>
        <ButtonLink to="/venue/inventory">Cancel</ButtonLink>
        <Button type="submit" variant="primary" busy={saving} busyLabel="Saving…" disabled={!canSubmit}>
          {mode === 'create' ? 'Add venue' : 'Save changes'}
        </Button>
      </FormActions>
    </form>
  );
}

function TextField({ label, value, onChange, type = 'text', error, wide = false }: {
  label: string; value: string; onChange: (value: string) => void; type?: string; error?: string; wide?: boolean;
}) {
  return (
    <FormField label={label} error={error} wide={wide}>
      {(props) => <input {...props} type={type} value={value} onChange={(event) => onChange(event.target.value)} />}
    </FormField>
  );
}

function TagListField({ label, items, onAdd, onRemove, errors }: {
  label: string; items: string[]; onAdd: (value: string) => void; onRemove: (value: string) => void; errors?: string[];
}) {
  const [draft, setDraft] = useState('');
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const commit = () => {
    onAdd(draft);
    setDraft('');
  };

  return (
    <div className="field-control field-wide">
      <label htmlFor={id}>{label}</label>
      <div className="tag-list" aria-label={`${label} added`}>
        {items.map((item) => (
          <span key={item} className="tag-chip">
            {item}
            <button type="button" aria-label={`Remove ${item}`} onClick={() => onRemove(item)}>×</button>
          </span>
        ))}
      </div>
      <div className="tag-input-row">
        <input
          id={id} value={draft} onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') { event.preventDefault(); commit(); }
          }}
        />
        <button type="button" className="secondary-action" onClick={commit}>Add</button>
      </div>
      <div aria-live="polite">{errors?.map((message) => <p key={message} className="field-error">{message}</p>)}</div>
    </div>
  );
}

function LayoutListField({ layouts, onAdd, onRemove, errors, warning }: {
  layouts: VenueLayout[];
  onAdd: (label: string, capacity: string) => boolean;
  onRemove: (label: string) => void;
  errors?: string[];
  warning?: string | null;
}) {
  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState('');

  const commit = () => {
    // Only clear the inputs on success, so a rejected duplicate leaves what
    // was typed visible next to the warning instead of silently vanishing.
    if (onAdd(label, capacity)) {
      setLabel('');
      setCapacity('');
    }
  };

  return (
    <div className="field-control field-wide">
      <ul className="layout-list" aria-label="Supported layouts added">
        {layouts.map((layout) => (
          <li key={layout.label}>
            {layout.label} — capacity {layout.capacity}
            <button type="button" aria-label={`Remove ${layout.label}`} onClick={() => onRemove(layout.label)}>×</button>
          </li>
        ))}
      </ul>
      <div className="layout-input-row">
        <input
          aria-label="Layout name" placeholder="Layout name" value={label}
          onChange={(event) => setLabel(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') { event.preventDefault(); commit(); }
          }}
        />
        <input
          aria-label="Layout capacity" placeholder="Capacity" type="number" value={capacity}
          onChange={(event) => setCapacity(event.target.value)}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') { event.preventDefault(); commit(); }
          }}
        />
        <button type="button" className="secondary-action" onClick={commit}>Add layout</button>
      </div>
      {warning ? <p role="alert" className="field-error">{warning}</p> : null}
      <div aria-live="polite">{errors?.map((message) => <p key={message} className="field-error">{message}</p>)}</div>
    </div>
  );
}
