// TEMPLATE: Form page (create or edit: request, venue, equipment, block...).
// Copy into your feature folder, rename, and:
//   1. Swap `getRequest` / `saveRequest` for your API module's functions.
//   2. Replace the fields and `validate` with your story's rules. Mirror the
//      server's rules so errors appear next to the field before a round trip,
//      but always show the server's refusal too (it has the final say): its
//      message in the alert, and its `fieldErrors` next to the fields.
//   3. Decide where to go after saving (here: the detail page).
// Keep: errors linked to fields (FormField), the busy button, and the error
// summary alert at the top.
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ErrorState, FormActions, FormField, FormSection, LoadingState, PageLayout, useLoad,
  type ApiResult,
} from '../shared';
import { getRequest, saveRequest, type SampleInput, type SampleRequest } from './sampleApi';

type Errors = Partial<Record<keyof SampleInput, string>>;

const blank: SampleInput = { title: '', organiser: '', startsAt: '', attendance: 0, notes: '' };

// Mirror of the server's rules, so most problems show before a round trip.
export function validate(input: SampleInput): Errors {
  const errors: Errors = {};
  if (!input.title.trim()) errors.title = 'Enter the event name.';
  if (!input.organiser.trim()) errors.organiser = 'Enter the organiser.';
  if (!input.startsAt || Number.isNaN(new Date(input.startsAt).getTime())) errors.startsAt = 'Enter a valid date and time.';
  if (!Number.isInteger(input.attendance) || input.attendance <= 0) errors.attendance = 'Enter a whole number greater than 0.';
  return errors;
}

function toLocalInput(iso: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function FormTemplate() {
  const { id } = useParams();
  const editing = Boolean(id);
  // New records start from blank values; existing ones load first.
  const { result } = useLoad<SampleRequest | null>(
    signal => (id ? getRequest(id, signal) : Promise.resolve<ApiResult<null>>({ ok: true, data: null })), [id ?? 'new']);

  return (
    <PageLayout eyebrow="Template · Form" title={editing ? 'Edit request' : 'New request'} width="narrow">
      {result.state === 'loading' ? <LoadingState label="Loading request…" rows={2} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="this request" backTo="/ui-kit/templates/list" backLabel="Back to requests" /> : null}
      {result.state === 'ready' ? <RequestForm key={id ?? 'new'} id={id ?? null} initial={result.data ?? null} /> : null}
    </PageLayout>
  );
}

function RequestForm({ id, initial }: { id: string | null; initial: SampleRequest | null }) {
  const navigate = useNavigate();
  const [values, setValues] = useState<SampleInput>(() => initial
    ? { title: initial.title, organiser: initial.organiser, startsAt: initial.startsAt, attendance: initial.attendance, notes: initial.notes }
    : blank);
  const [errors, setErrors] = useState<Errors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Don't update state if the user navigated away while saving. Set on every
  // mount: in development, StrictMode mounts, unmounts and remounts once, and
  // a ref left false would drop every reply (found on #186).
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  function update<K extends keyof SampleInput>(field: K, value: SampleInput[K]) {
    setValues(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: undefined }));
    setServerError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length > 0) { setServerError('Fix the highlighted fields, then save again.'); return; }
    setSaving(true);
    const result = await saveRequest(id, { ...values, title: values.title.trim(), organiser: values.organiser.trim(), notes: values.notes.trim() });
    if (!mounted.current) return;
    setSaving(false);
    if (!result.ok) {
      // Show the server's per-field messages next to their fields (first one
      // each), and its overall message in the alert at the top.
      const fromServer: Errors = {};
      for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
        if (field in blank && messages[0]) fromServer[field as keyof SampleInput] = messages[0];
      }
      setErrors(current => ({ ...current, ...fromServer }));
      setServerError(result.message);
      return;
    }
    navigate(`/ui-kit/templates/items/${result.data.id}`, { state: { saved: true } });
  }

  return (
    <Card>
      <form onSubmit={submit} noValidate className="ui-form">
        {serverError ? <Alert tone="error">{serverError}</Alert> : null}
        <FormSection title="Basics">
          <FormField label="Event name" error={errors.title} wide hint="Try “duplicate” to see a server refusal.">
            {props => <input {...props} value={values.title} onChange={change => update('title', change.target.value)} />}
          </FormField>
          <FormField label="Organiser" error={errors.organiser}>
            {props => <input {...props} value={values.organiser} onChange={change => update('organiser', change.target.value)} />}
          </FormField>
          <FormField label="Expected attendance" error={errors.attendance}>
            {props => <input {...props} type="number" min={1} value={values.attendance || ''} onChange={change => update('attendance', Number(change.target.value))} />}
          </FormField>
          <FormField label="Starts" error={errors.startsAt}>
            {props => <input {...props} type="datetime-local" value={toLocalInput(values.startsAt)}
              onChange={change => update('startsAt', change.target.value ? new Date(change.target.value).toISOString() : '')} />}
          </FormField>
          <FormField label="Notes" wide>
            {props => <textarea {...props} rows={3} value={values.notes} onChange={change => update('notes', change.target.value)} />}
          </FormField>
        </FormSection>
        <FormActions>
          <ButtonLink to={id ? `/ui-kit/templates/items/${id}` : '/ui-kit/templates/list'}>Cancel</ButtonLink>
          <Button type="submit" variant="primary" busy={saving} busyLabel="Saving…" icon={<Save size={14} aria-hidden="true" />}>Save request</Button>
        </FormActions>
      </form>
    </Card>
  );
}
