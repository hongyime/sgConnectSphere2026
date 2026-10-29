import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, EmptyState, ErrorState, FactList, FormActions, FormField,
  FormSection, LoadingState, PageLayout, StatusPill, apiCall, useLoad,
} from '../../shared';
import { getVenueBookingRequests } from './venueBookingRequestsApi';
import { lostVenueRecoveryState } from './lostVenueRecoveryState';
import './venue.css';

type Option = { id: string; label: string };
type Result = { id: string; name: string; location: string; max_capacity: number; effective_capacity: number | null; available: boolean; suitable: boolean; mismatches: string[]; layouts: (Option & { capacity: number })[]; facilities: Option[]; accessibility: Option[] };
type SessionOption = { id: string; title?: string; start: string; end: string; attendance: number; layout?: string; accessibility: string[]; facilities: string[]; accessibility_note?: string };
type SearchSetup = {
  options: { layouts: Option[]; accessibility: Option[]; facilities: Option[] };
  defaults: { id?: string; start?: string; end?: string; attendance?: number; layout?: string; accessibility?: string[]; facilities?: string[]; accessibility_note?: string; title?: string; session_id?: string; sessions?: SessionOption[] };
};
const localTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function VenueSearch() {
  const { eventCode } = useParams();
  const [params] = useSearchParams();
  const replacementId = params.get('replaces_booking_id') ?? '';
  const requestedSessionId = params.get('session_id') ?? '';
  // A new event gets a fresh form and cannot retain the previous event's search.
  return <VenueSearchPage key={`${eventCode}:${replacementId}:${requestedSessionId}`} eventCode={eventCode} replacementId={replacementId} requestedSessionId={requestedSessionId} />;
}

function VenueSearchPage({ eventCode, replacementId, requestedSessionId }: { eventCode?: string; replacementId: string; requestedSessionId: string }) {
  const { result, reload } = useLoad(async signal => {
    const params = new URLSearchParams({ mode: 'suitability', ...(eventCode ? { event_id: eventCode } : {}), ...(requestedSessionId ? { session_id: requestedSessionId } : {}) });
    const setup = await apiCall<SearchSetup>(`/api/venues?${params}`, { signal }, 'Unable to load venue search.');
    if (!setup.ok || !replacementId || !eventCode) return setup;
    const bookings = await getVenueBookingRequests(eventCode, signal);
    if (!bookings.ok) return bookings;
    const source = bookings.data.bookings.find(b => b.id === replacementId && b.status === 'conflicting' && b.conflict_block_id && lostVenueRecoveryState(bookings.data.bookings, b).canRequest);
    if (!source) return { ok: false as const, status: 409, message: 'This lost booking is no longer available for replacement.' };
    return { ...setup, data: { ...setup.data, defaults: { ...setup.data.defaults, session_id: source.session_id ?? undefined, start: source.starts_at, end: source.ends_at, attendance: source.headcount ?? setup.data.defaults.attendance } } };
  }, [eventCode, replacementId, requestedSessionId]);
  return <PageLayout eyebrow="Coordinator workspace" title="Search for suitable venues">
    {result.state === 'loading' && <LoadingState label="Loading venue search…" />}
    {result.state === 'error' && <ErrorState failure={result.failure} context="venue search" onRetry={reload} />}
    {result.state === 'ready' && <VenueSearchForm setup={result.data} eventCode={eventCode} replacementId={replacementId} />}
  </PageLayout>;
}

function VenueSearchForm({ setup: { options, defaults: d }, eventCode, replacementId }: { setup: SearchSetup; eventCode?: string; replacementId: string }) {
  const initialSession = d.sessions?.find(session => session.id === d.session_id) ?? d.sessions?.[0];
  const initial = d.session_id ? d : initialSession ?? d;
  const [sessionId, setSessionId] = useState(d.session_id ?? initialSession?.id ?? '');
  const [fields, setFields] = useState({ start: localTime(initial.start ?? ''), end: localTime(initial.end ?? ''), attendance: String(initial.attendance ?? ''), capacity: '', layout: initial.layout ?? '', location: '', q: '' });
  const [selected, setSelected] = useState({ accessibility: initial.accessibility ?? [], facilities: initial.facilities ?? [] });
  const [venues, setVenues] = useState<Result[] | null>(null);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const searchRequest = useRef(0);
  useEffect(() => () => { searchRequest.current += 1; }, []);

  async function search(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setErrors({}); setVenues(null);
    const request = ++searchRequest.current;
    const current = () => request === searchRequest.current;
    try {
      const params = new URLSearchParams({ mode: 'suitability', search: '1', ...fields, start: new Date(fields.start).toISOString(), end: new Date(fields.end).toISOString(), accessibility: selected.accessibility.join(','), facilities: selected.facilities.join(',') });
      if (!fields.capacity) params.delete('capacity');
      if (eventCode) params.set('event_id', eventCode);
      if (sessionId) params.set('session_id', sessionId);
      const result = await apiCall<{ venues: Result[] }>(`/api/venues?${params}`, undefined, 'Unable to search venues.');
      if (!current()) return;
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        setError(result.message);
        return;
      }
      setVenues(result.data.venues);
    } catch (e) { if (current()) setError(e instanceof Error ? e.message : 'Unable to search venues.'); }
    finally { if (current()) setBusy(false); }
  }

  return <>
    {eventCode && <ButtonLink to={`/coordinator/events/${encodeURIComponent(eventCode)}/venue-bookings`}>View venue booking requests</ButtonLink>}
    {d.title && <Card title={d.title}><p>Search criteria are filled from this event. Changing them here does not update the event.</p></Card>}
    <Card title="Search criteria">
      <p>Times use your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Suitability is advisory; unavailable venues cannot be treated as free.</p>
      {d.accessibility_note && <Alert tone="info" title="Additional accessibility notes (for manual review)">{d.accessibility_note}</Alert>}
      <form onSubmit={search} className="venue-search-form">
        {error && <Alert tone="error">{error}</Alert>}
        {d.sessions && d.sessions.length > 1 && <FormField label="Session">
          {props => <select {...props} value={sessionId} onChange={event => {
            const chosen = d.sessions?.find(session => session.id === event.target.value);
            setSessionId(event.target.value);
            if (!chosen) return;
            setFields(current => ({ ...current, start: localTime(chosen.start), end: localTime(chosen.end), attendance: String(chosen.attendance), layout: chosen.layout ?? '' }));
            setSelected({ accessibility: chosen.accessibility, facilities: chosen.facilities });
            setVenues(null); setError(''); setErrors({});
          }}><option value="">Choose a Session</option>{d.sessions?.map((session, index) => <option key={session.id} value={session.id}>{session.title || `Session ${index + 1}`}</option>)}</select>}
        </FormField>}
        <FormSection title="Date, time and venue requirements">
          {([['q', 'Venue name', 'text'], ['location', 'Location', 'text'], ['start', 'Start', 'datetime-local'], ['end', 'End', 'datetime-local'], ['attendance', 'Expected attendance', 'number'], ['capacity', 'Minimum capacity (optional)', 'number']] as const).map(([key, label, type]) => {
            const required = ['start', 'end', 'attendance'].includes(key);
            return <FormField key={key} label={`${label}${required ? ' (required)' : ''}`} error={errors[key]?.join(' ')}>
              {props => <input {...props} type={type} required={required} min={type === 'number' ? 1 : undefined} step={type === 'number' ? 1 : undefined} value={fields[key]} onChange={e => setFields({ ...fields, [key]: e.target.value })} />}
            </FormField>;
          })}
          <FormField label="Room layout" error={errors.layout?.join(' ')}>
            {props => <select {...props} value={fields.layout} onChange={e => setFields({ ...fields, layout: e.target.value })}><option value="">Any layout</option>{options.layouts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select>}
          </FormField>
        </FormSection>
        {(['accessibility', 'facilities'] as const).map(key => <fieldset className="form-section ui-form-section" key={key}>
          <legend>{key === 'accessibility' ? 'Accessibility requirements' : 'Required facilities'}</legend>
          <div className="field-checkbox-group">
            {options[key].map(o => <label key={o.id} className="field-checkbox"><input type="checkbox" checked={selected[key].includes(o.id)} onChange={e => setSelected({ ...selected, [key]: e.target.checked ? [...selected[key], o.id] : selected[key].filter(id => id !== o.id) })} />{o.label}</label>)}
          </div>
          {!options[key].length && <p>No {key === 'accessibility' ? 'accessibility features' : 'facilities'} recorded.</p>}
          {errors[key] && <Alert tone="error">{errors[key].join(' ')}</Alert>}
        </fieldset>)}
        {Object.entries(errors).filter(([key]) => !(key in fields) && !(key in selected)).map(([key, messages]) => <Alert tone="error" key={key}>{messages.join(' ')}</Alert>)}
        <FormActions><Button type="submit" variant="primary" busy={busy} busyLabel="Searching venues…" icon={<Search size={16} aria-hidden="true" />}>Search venues</Button></FormActions>
      </form>
    </Card>
    {busy && <LoadingState label="Searching venues…" />}
    {!busy && venues === null && !error && <EmptyState title="Ready to search">Apply the event requirements or adjust the filters, then search for suitable venues.</EmptyState>}
    {venues && <section aria-label="Venue results" aria-live="polite" className="venue-search-results">
      {venues.length === 0 ? <EmptyState title="No venues match this name">Try another venue name or clear the name filter.</EmptyState> : <>
        <p>{venues.filter(v => v.suitable).length} suitable venues; {venues.length} results.</p>
        {!venues.some(v => v.suitable) && <Alert tone="warning">No full matches. Review the unmet requirements below.</Alert>}
        {venues.map(v => <Card key={v.id} title={v.name} actions={
          <StatusPill status={!v.available ? 'danger' : v.suitable ? 'success' : 'warning'}
            label={!v.available ? 'Unavailable' : v.suitable ? 'Suitable' : 'Near match'} />
        }>
          <FactList columns={3} items={[
            ['Location', v.location], ['Maximum capacity', v.max_capacity], ['Requested layout capacity', v.effective_capacity ?? 'Not supported'],
            ['Layouts', v.layouts.map(l => `${l.label} (${l.capacity})`).join(', ') || 'None'],
            ['Facilities', v.facilities.map(f => f.label).join(', ') || 'None'],
            ['Accessibility', v.accessibility.map(f => f.label).join(', ') || 'None'],
          ]} />
          {eventCode && <ButtonLink to={`/coordinator/events/${encodeURIComponent(eventCode)}/venues/${encodeURIComponent(v.id)}/suitability${sessionId || replacementId ? `?${new URLSearchParams({ ...(sessionId ? { session_id: sessionId } : {}), ...(replacementId ? { replaces_booking_id: replacementId } : {}) })}` : ''}`}>Check recorded event requirements</ButtonLink>}
          {eventCode && v.available && <ButtonLink to={`/coordinator/events/${encodeURIComponent(eventCode)}/venues/${encodeURIComponent(v.id)}/hold${sessionId ? `?${new URLSearchParams({ session_id: sessionId, starts_at: new Date(fields.start).toISOString(), ends_at: new Date(fields.end).toISOString() })}` : ''}`}>Hold this venue</ButtonLink>}
          {v.mismatches.length > 0 && <div><strong>Unmet requirements</strong><ul>{v.mismatches.map(m => <li key={m}>{m}</li>)}</ul></div>}
        </Card>)}
      </>}
    </section>}
  </>;
}
