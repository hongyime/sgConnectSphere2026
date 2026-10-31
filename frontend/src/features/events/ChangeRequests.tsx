import { readChangeRequestPrefill, type ChangeRequestPrefill } from './changeRequestPrefill';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, DataTable, EmptyState, ErrorState,
  FormActions, FormField, FormSection, LoadingState, PageLayout, StatusPill, formatDate, useLoad,
} from '../../shared';
import {
  changeFields, decideChangeRequest, getChangeRequests, submitChangeRequest, waitingMessage, previewChangeRequest, type ChangePreview,
  type ChangeField, type ChangeRequestRecord, type ChangeRequestView, type ChangeValues,
} from './changeRequestsApi';

const activeStatuses = ['approved', 'planning', 'safety_review', 'confirmed'];
const label = (key: string) => changeFields.find(([field]) => field === key)?.[1] ?? key;
function display(key: string, value: ChangeValues[ChangeField] | undefined, references?: ChangeRequestView['references']) {
  if (value === null || value === undefined || value === '') return 'None recorded';
  if (typeof value === 'boolean') return value ? 'Enabled' : 'Disabled';
  if (Array.isArray(value)) return value.length ? value.map(id => references?.accessibility.find(item => item.id === id)?.label ?? 'Unavailable feature').join(', ') : 'None selected';
  if (typeof value === 'object') return `${value.opensAt ? formatDate(value.opensAt, true) : 'No opening date'} — ${value.closesAt ? formatDate(value.closesAt, true) : 'No closing date'}`;
  if (key === 'layoutId') return references?.layouts.find(item => item.id === value)?.label ?? 'Unavailable layout';
  if (key === 'startAt' || key === 'endAt' || key === 'withdrawalDeadline') return formatDate(String(value), true);
  return String(value);
}
function dateInput(value: string) {
  return new Date(new Date(value).getTime() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
}

function fieldInput(key: ChangeField, value: ChangeValues[ChangeField]) {
  if (['startAt', 'endAt', 'withdrawalDeadline'].includes(key) && value) return dateInput(String(value));
  if (Array.isArray(value)) return value.join(',');
  if (key === 'registrationDates') {
    const dates = value as { opensAt: string | null; closesAt: string | null } | undefined;
    return `${dates?.opensAt ? dateInput(dates.opensAt) : ''}|${dates?.closesAt ? dateInput(dates.closesAt) : ''}`;
  }
  return String(value ?? '');
}

export function ChangeRequests({ coordinator = false }: { coordinator?: boolean }) {
  const { eventCode } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const identifier = eventCode ?? params.get('event') ?? '';
  return <RequestPage key={`${coordinator}:${identifier}:${location.key}`} identifier={identifier} coordinator={coordinator} params={params} navigationState={location.state} />;
}

function RequestPage({ identifier, coordinator, params, navigationState }: { identifier: string; coordinator: boolean; params: URLSearchParams; navigationState: unknown }) {
  const { result, reload } = useLoad(signal => identifier ? getChangeRequests(identifier, signal)
    : Promise.resolve({ ok: false as const, status: 400, message: 'Choose an Event before requesting a change.' }), [identifier]);
  const view = result.state === 'ready' ? result.data : null;
  const [done, setDone] = useState<string | null>(null);
  const success = useRef<HTMLDivElement>(null);
  useEffect(() => { if (done) { success.current?.focus(); success.current?.scrollIntoView?.({ block: 'nearest' }); } }, [done]);
  const back = coordinator ? `/coordinator/events/${encodeURIComponent(identifier)}` : `/organiser/requests/${encodeURIComponent(identifier)}`;
  const active = view && activeStatuses.includes(view.event.status);
  return <PageLayout eyebrow={view?.event.eventCode ?? identifier} title="Change requests"
    actions={<ButtonLink to={identifier ? back : '/home'}>Back to event</ButtonLink>}>
    {result.state === 'loading' ? <LoadingState label="Loading change requests…" /> : null}
    {result.state === 'error' ? <ErrorState failure={result.failure} onRetry={reload} context="these change requests" /> : null}
    {done ? <div ref={success} tabIndex={-1}><Alert tone="success">{done}</Alert></div> : null}
    {view ? <>
      {!active ? <Alert tone="info">This Event is {view.event.status.replaceAll('_', ' ')}. Change requests cannot be submitted or decided.</Alert> : null}
      {!coordinator && active && view.permissions.canSubmit ? <RequestForm key={view.event.id} view={view} prefill={readChangeRequestPrefill(params, navigationState, view.event.id)} onSent={() => {
        setDone('Change request sent for Coordinator review. Current Event details stay unchanged.'); reload();
      }} /> : null}
      <Card title="Recorded change requests">
        {!view.requests.length ? <EmptyState title="No change requests yet">Submitted changes will appear here.</EmptyState> :
          view.requests.map(request => <RequestCard key={`${request.id}:${request.status}`} request={request} current={view.current} references={view.references}
            coordinator={coordinator && Boolean(active) && view.permissions.canDecide} identifier={identifier} onDecided={message => { setDone(message); reload(); }} />)}
      </Card>
    </> : null}
  </PageLayout>;
}

function RequestForm({ view, prefill, onSent }: { view: ChangeRequestView; prefill: ChangeRequestPrefill; onSent: () => void }) {
  const [selected, setSelected] = useState<ChangeField[]>(prefill.fields);
  const [values, setValues] = useState<Partial<Record<ChangeField, string>>>(() => Object.fromEntries(
    prefill.fields.map(key => [key, fieldInput(key, prefill.changes[key] ?? view.current[key])]),
  ));
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const refusal = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (error) { refusal.current?.focus(); refusal.current?.scrollIntoView?.({ block: 'nearest' }); } }, [error]);
  function select(key: ChangeField, checked: boolean) {
    setSelected(current => checked ? [...current, key] : current.filter(field => field !== key));
    const raw = fieldInput(key, view.current[key]);
    setValues(current => ({ ...current, [key]: raw }));
    setError(null);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (sending.current) return;
    if (!description.trim() || !selected.length) { setError('Describe the change and choose at least one field.'); return; }
    const changes: ChangeValues = {};
    for (const key of selected) {
      const raw = (values[key] ?? '').trim();
      if (key === 'layoutId') { changes[key] = raw || null; continue; }
      if (key === 'accessibilityFeatureIds') { changes[key] = raw ? raw.split(',') : []; continue; }
      if (key === 'registrationEnabled' || key === 'waitlistEnabled') { changes[key] = raw === 'true'; continue; }
      if (key === 'withdrawalDeadline' && !raw) { changes[key] = null; continue; }
      if (key === 'registrationDates') {
        const [opens = '', closes = ''] = raw.split('|');
        const opening = opens ? new Date(`${opens}+08:00`) : null;
        const closing = closes ? new Date(`${closes}+08:00`) : null;
        if ((opening && !Number.isFinite(opening.getTime())) || (closing && !Number.isFinite(closing.getTime()))) {
          setError('Enter valid Singapore registration dates.'); return;
        }
        const opensAt = opening?.toISOString() ?? null;
        const closesAt = closing?.toISOString() ?? null;
        if (opensAt && closesAt && opensAt >= closesAt) { setError('Registration closing must be after opening.'); return; }
        changes[key] = { opensAt, closesAt }; continue;
      }
      if (!raw) { setError(`Enter a new value for ${label(key).toLowerCase()}.`); return; }
      if (key === 'expectedAttendance') {
        if (!Number.isSafeInteger(Number(raw)) || Number(raw) <= 0) { setError('Expected attendance must be a positive whole number.'); return; }
        changes[key] = Number(raw);
      } else if (key === 'startAt' || key === 'endAt' || key === 'withdrawalDeadline') {
        const date = new Date(`${raw}+08:00`);
        if (!Number.isFinite(date.getTime())) { setError('Enter a valid Singapore date and time.'); return; }
        changes[key] = date.toISOString();
      } else changes[key] = raw;
    }
    sending.current = true; setBusy(true); setError(null);
    const result = await submitChangeRequest(view.event.id, description.trim(), changes);
    if (!mounted.current) return;
    sending.current = false; setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setSelected([]); setValues({}); setDescription(''); onSent();
  }
  return <Card title="Request a change">
    <p>Select the details you want changed. Your current Event details stay unchanged until the approved change is applied.</p>
    <form className="ui-form" onSubmit={submit} noValidate>
      {error ? <div ref={refusal} tabIndex={-1}><Alert tone="error">{error}</Alert></div> : null}
      <FormField label="Describe the change" hint="Explain what you need the Coordinator to review.">
        {props => <textarea {...props} required maxLength={4000} rows={3} value={description} disabled={busy}
          onChange={event => setDescription(event.target.value)} />}
      </FormField>
      <FormSection title="Details to change">
        {changeFields.map(([key, name, kind]) => <div key={key}>
          <label><input type="checkbox" checked={selected.includes(key)} disabled={busy}
            onChange={event => select(key, event.target.checked)} /> Change {name.toLowerCase()}</label>
          {selected.includes(key) ? <FormField label={`New ${name.toLowerCase()}`}
            hint={`Current: ${display(key, view.current[key], view.references)}${kind === 'date' || kind === 'nullable-date' || kind === 'window' ? '. Enter Singapore time (UTC+8).' : ''}`}>
            {props => kind === 'layout' ? <select {...props} value={values[key] ?? ''} disabled={busy} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))}>
              <option value="">No layout selected</option>{view.references?.layouts.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select> : kind === 'switch' ? <select {...props} value={values[key] ?? 'false'} disabled={busy} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))}>
              <option value="false">Disabled</option><option value="true">Enabled</option>
            </select> : kind === 'accessibility' ? <select {...props} multiple value={values[key] ? values[key]!.split(',') : []} disabled={busy}
              onChange={event => setValues(current => ({ ...current, [key]: Array.from(event.target.selectedOptions, option => option.value).join(',') }))}>
              {view.references?.accessibility.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select> : kind === 'window' ? <>
              <input {...props} aria-label="Registration opens (Singapore time)" type="datetime-local" disabled={busy} value={(values[key] ?? '|').split('|')[0]}
                onChange={event => setValues(current => ({ ...current, [key]: `${event.target.value}|${(current[key] ?? '|').split('|')[1]}` }))} />
              <label>Registration closes (Singapore time)<input type="datetime-local" disabled={busy} value={(values[key] ?? '|').split('|')[1]}
                onChange={event => setValues(current => ({ ...current, [key]: `${(current[key] ?? '|').split('|')[0]}|${event.target.value}` }))} /></label>
              <p>Leave a boundary blank to clear it. A closing date after the Event starts requires confirmation before application.</p>
            </> : <input {...props} type={kind === 'number' ? 'number' : kind === 'date' || kind === 'nullable-date' ? 'datetime-local' : 'text'}
              min={kind === 'number' ? 1 : undefined} maxLength={key === 'title' ? 240 : 4000}
              value={values[key] ?? ''} disabled={busy} onChange={event => setValues(current => ({ ...current, [key]: event.target.value }))} />}
          </FormField> : null}
        </div>)}
      </FormSection>
      <FormActions><Button type="submit" variant="primary" busy={busy} busyLabel="Sending…">Send change request</Button></FormActions>
    </form>
  </Card>;
}

function RequestCard({ request, current, coordinator, identifier, onDecided, references }: {
  request: ChangeRequestRecord; current: ChangeValues; coordinator: boolean; identifier: string; onDecided: (message: string) => void; references?: ChangeRequestView['references'];
}) {
  const [choice, setChoice] = useState<'approve' | 'decline' | 'apply' | null>(null);
  const [preview, setPreview] = useState<ChangePreview | null>(null);
  const [lateCloseConfirmed, setLateCloseConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const sending = useRef(false);
  const mounted = useRef(true);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<string | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (choice) { panel.current?.focus(); panel.current?.scrollIntoView?.({ block: 'nearest' }); }
    else if (trigger.current) document.getElementById(trigger.current)?.focus();
  }, [choice]);
  async function confirm() {
    if (!choice || sending.current) return;
    sending.current = true; setBusy(true); setError(null);
    const result = await decideChangeRequest(identifier, request.id, choice, note.trim(),
      preview?.canApply ? preview.token : undefined, lateCloseConfirmed);
    if (!mounted.current) return;
    sending.current = false; setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setChoice(null);
    onDecided(result.data.request.status === 'applied' ? 'Change applied to the Event.'
      : result.data.request.status === 'approved' ? waitingMessage : 'Change declined. Current Event details are unchanged.');
  }
  const fields = Object.entries(request.requested_changes.fields ?? {});
  async function review(event: React.MouseEvent<HTMLButtonElement>) {
    if (sending.current) return;
    trigger.current = event.currentTarget.id;
    setError(null); setPreview(null); setLateCloseConfirmed(false);
    const action = request.status === 'approved' ? 'apply' : 'approve';
    if (fields.every(([key]) => ['title', 'description', 'purpose'].includes(key))) { setChoice(action); return; }
    sending.current = true; setBusy(true);
    const result = await previewChangeRequest(identifier, request.id);
    if (!mounted.current) return;
    sending.current = false; setBusy(false);
    if (!result.ok) { setError(result.message); return; }
    setPreview(result.data.request.preview); setChoice(action);
  }
  return <Card title={request.description} actions={<StatusPill status={request.status} />}>
    <p>Submitted {formatDate(request.created_at, true)}</p>
    {request.status === 'approved' ? <Alert tone="info">{waitingMessage}. Current Event details have not changed.</Alert> : null}
    {request.decision_reason ? <p>Decision reason: {request.decision_reason}</p> : null}
    {fields.length ? <DataTable caption={`Details for ${request.description}`} rows={fields} rowKey={([key]) => key}
      columns={[
        { header: 'Field', primary: true, cell: ([key]) => label(key) },
        { header: 'Current Event details', cell: ([key]) => display(key, current[key as ChangeField], references) },
        { header: 'Requested value', cell: ([key, value]) => display(key, value, references) },
      ]} /> : <p>No structured field changes recorded.</p>}
    {error && !choice ? <Alert tone="error">{error}</Alert> : null}
    {coordinator && ['pending', 'approved'].includes(request.status) ? choice ? <div ref={panel} tabIndex={-1}>
      <ConfirmPanel title={choice === 'decline' ? 'Decline this change request?' : choice === 'apply' ? 'Apply this approved change request?' : 'Approve this change request?'}
        description={<><p>{choice !== 'decline' ? (fields.every(([key]) => ['title', 'description', 'purpose'].includes(key))
          ? 'This request changes only name, description or purpose. The changes are applied when approved.'
          : preview?.canApply ? 'Review the affected arrangements below. Confirming applies this entire request together.'
            : 'This request includes fields the shared arrangement path cannot apply yet. The entire request will remain Approved and unchanged.') : 'The Event stays unchanged.'}</p>
          {choice !== 'decline' && preview?.canApply ? <>
            <p>Affected venue bookings: {preview.impact.bookings.length}. Affected equipment reservations: {preview.impact.reservations.length}. Affected Technical Support requests: {preview.impact.supports?.length ?? 0}.</p>
            {preview.impact.bookings.map(item => <p key={item.id}>{item.venueName}: {item.reasons.join(', ')}</p>)}
            {preview.impact.reservations.map(item => <p key={item.id}>{item.equipmentName}: {item.reasons.join(', ')}</p>)}
            {preview.impact.supports?.map(item => <p key={item.id}>{item.description || 'Technical support'}: {item.reasons.join(', ')}</p>)}
            {preview.overSubscription.map((item, index) => <Alert key={index} tone="warning">{item.scope}: {item.registered} registered places exceed capacity {item.capacity}. Registrations will be retained.</Alert>)}
            {preview.lateClose ? <label><input type="checkbox" checked={lateCloseConfirmed} disabled={busy}
              onChange={event => setLateCloseConfirmed(event.target.checked)} /> Confirm registration closing after the Event starts</label> : null}
          </> : null}
          {choice !== 'decline' && preview && !preview.canApply ? <p>Waiting fields: {preview.blockedFields.map(label).join(', ')}.</p> : null}
          <FormField label="Decision note (optional)">{props => <textarea {...props} rows={2} maxLength={4000}
            disabled={busy} value={note} onChange={event => setNote(event.target.value)} />}</FormField></>}
        confirmLabel={choice === 'decline' ? 'Decline change request' : choice === 'apply' ? 'Apply change request' : 'Approve change request'} busy={busy}
        danger={choice === 'decline'} error={error ?? undefined} onConfirm={confirm}
        onCancel={() => { if (busy) return; setChoice(null); setError(null); setNote(''); }} />
    </div> : <div className="ui-actions">
      <Button id={`${request.id}-approve`} variant="primary" busy={busy} onClick={review}>{request.status === 'approved' ? 'Review and apply…' : 'Approve…'}</Button>
      {request.status === 'pending' ? <Button id={`${request.id}-decline`} disabled={busy} onClick={event => { trigger.current = event.currentTarget.id; setChoice('decline'); }}>Decline…</Button> : null}
    </div> : null}
  </Card>;
}
