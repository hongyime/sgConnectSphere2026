import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import {
  Alert, Button, Card, EmptyState, ErrorState, FactList, FormActions, FormField,
  FormSection, LoadingState, PageLayout, StatusPill, apiCall, useLoad,
} from '../../shared';
import './venue.css';

type Option = { id: string; label: string };
type Result = { id: string; name: string; location: string; max_capacity: number; effective_capacity: number | null; available: boolean; suitable: boolean; mismatches: string[]; layouts: (Option & { capacity: number })[]; facilities: Option[]; accessibility: Option[] };
type SearchSetup = {
  options: { layouts: Option[]; accessibility: Option[]; facilities: Option[] };
  defaults: { start?: string; end?: string; attendance?: number; layout?: string; accessibility?: string[]; facilities?: string[]; accessibility_note?: string; title?: string };
};
const localTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export function VenueSearch() {
  const { eventCode } = useParams();
  // A new event gets a fresh form and cannot retain the previous event's search.
  return <VenueSearchPage key={eventCode ?? 'all'} eventCode={eventCode} />;
}

function VenueSearchPage({ eventCode }: { eventCode?: string }) {
  const { result, reload } = useLoad(signal => {
    const params = new URLSearchParams({ mode: 'suitability', ...(eventCode ? { event_id: eventCode } : {}) });
    return apiCall<SearchSetup>(`/api/venues?${params}`, { signal }, 'Unable to load venue search.');
  }, [eventCode]);
  return <PageLayout eyebrow="Coordinator workspace" title="Search for suitable venues">
    {result.state === 'loading' && <LoadingState label="Loading venue search…" />}
    {result.state === 'error' && <ErrorState failure={result.failure} context="venue search" onRetry={reload} />}
    {result.state === 'ready' && <VenueSearchForm setup={result.data} eventCode={eventCode} />}
  </PageLayout>;
}

function VenueSearchForm({ setup: { options, defaults: d }, eventCode }: { setup: SearchSetup; eventCode?: string }) {
  const [fields, setFields] = useState({ start: localTime(d.start || ''), end: localTime(d.end || ''), attendance: String(d.attendance ?? ''), capacity: '', layout: d.layout || '', location: '', q: '' });
  const [selected, setSelected] = useState({ accessibility: d.accessibility || [], facilities: d.facilities || [] });
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
    {d.title && <Card title={d.title}><p>Search criteria are filled from this event. Changing them here does not update the event.</p></Card>}
    <Card title="Search criteria">
      <p>Times use your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Suitability is advisory; unavailable venues cannot be treated as free.</p>
      {d.accessibility_note && <Alert tone="info" title="Additional accessibility notes (for manual review)">{d.accessibility_note}</Alert>}
      <form onSubmit={search} className="venue-search-form">
        {error && <Alert tone="error">{error}</Alert>}
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
          {v.mismatches.length > 0 && <div><strong>Unmet requirements</strong><ul>{v.mismatches.map(m => <li key={m}>{m}</li>)}</ul></div>}
        </Card>)}
      </>}
    </section>}
  </>;
}
