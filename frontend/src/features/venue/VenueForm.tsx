import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createVenue, getVenue, updateVenue, type VenueLayout } from './venueApi';
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

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready' };

export function VenueForm({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate();
  const { venueId } = useParams<{ venueId: string }>();
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [load, setLoad] = useState<LoadState>(mode === 'edit' ? { status: 'loading' } : { status: 'ready' });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [layoutWarning, setLayoutWarning] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== 'edit' || !venueId) return;
    let cancelled = false;
    (async () => {
      const result = await getVenue(venueId);
      if (cancelled) return;
      if (!result.ok) {
        setLoad({ status: 'error', message: result.message });
        return;
      }
      const venue = result.venue;
      setValues({
        name: venue.name,
        location: venue.location,
        max_capacity: String(venue.max_capacity),
        opens_at: venue.opens_at,
        closes_at: venue.closes_at,
        facilities: venue.facilities,
        accessibility_features: venue.accessibility_features,
        supported_layouts: venue.supported_layouts,
      });
      setLoad({ status: 'ready' });
    })();
    return () => { cancelled = true; };
  }, [mode, venueId]);

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
      setErrors(result.errors);
      setFormError(result.message);
      return;
    }

    navigate('/venue/inventory');
  };

  if (load.status === 'loading') {
    return <main className="venue-page"><p role="status">Loading venue…</p></main>;
  }

  if (load.status === 'error') {
    return (
      <main className="venue-page">
        <p role="alert" className="login-error">{load.message}</p>
        <Link to="/venue/inventory" className="secondary-action">Back to venue inventory</Link>
      </main>
    );
  }

  return (
    <main className="venue-page">
      <header className="venue-heading">
        <p className="eyebrow">Venue staff</p>
        <h1>{mode === 'create' ? 'Add venue' : 'Edit venue'}</h1>
      </header>

      <form onSubmit={submit} noValidate className="venue-form">
        {formError ? <div role="alert" className="login-error">{formError}</div> : null}

        <TextField
          id="venue-name" label="Venue name" value={values.name}
          onChange={(value) => setValues((current) => ({ ...current, name: value }))}
          errors={errors.name}
        />
        <TextField
          id="venue-location" label="Location" value={values.location}
          onChange={(value) => setValues((current) => ({ ...current, location: value }))}
          errors={errors.location}
        />
        <TextField
          id="venue-capacity" label="Max capacity" type="number" value={values.max_capacity}
          onChange={(value) => setValues((current) => ({ ...current, max_capacity: value }))}
          errors={errors.max_capacity}
        />
        <TextField
          id="venue-opens" label="Opens at" type="time" value={values.opens_at}
          onChange={(value) => setValues((current) => ({ ...current, opens_at: value }))}
          errors={errors.opens_at}
        />
        <TextField
          id="venue-closes" label="Closes at" type="time" value={values.closes_at}
          onChange={(value) => setValues((current) => ({ ...current, closes_at: value }))}
          errors={errors.closes_at}
        />

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
        <LayoutListField
          layouts={values.supported_layouts}
          onAdd={addLayout}
          onRemove={removeLayout}
          errors={errors.supported_layouts}
          warning={layoutWarning}
        />

        <div className="form-actions">
          <Link to="/venue/inventory" className="secondary-action">Cancel</Link>
          <button className="primary-action" type="submit" disabled={!canSubmit || saving}>
            {saving ? 'Saving…' : mode === 'create' ? 'Add venue' : 'Save changes'}
          </button>
        </div>
      </form>
    </main>
  );
}

function TextField({ id, label, value, onChange, type = 'text', errors }: {
  id: string; label: string; value: string; onChange: (value: string) => void; type?: string; errors?: string[];
}) {
  return (
    <div className="field-control">
      <label htmlFor={id}>{label}</label>
      <input
        id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(errors?.length)} aria-describedby={`${id}-errors`}
      />
      <div id={`${id}-errors`} aria-live="polite">
        {errors?.map((message) => <p key={message} className="field-error">{message}</p>)}
      </div>
    </div>
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
      <label>Supported layouts</label>
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
