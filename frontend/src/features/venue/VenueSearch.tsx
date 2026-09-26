import { useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import './venue.css';

type Option = { id: string; label: string };
type Result = { id: string; name: string; location: string; max_capacity: number; effective_capacity: number | null; available: boolean; suitable: boolean; mismatches: string[]; layouts: (Option & { capacity: number })[]; facilities: Option[]; accessibility: Option[] };
const localTime = (value: string) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
export function VenueSearch() {
  const { eventCode } = useParams();
  const [options, setOptions] = useState<{ layouts: Option[]; accessibility: Option[]; facilities: Option[] }>({ layouts: [], accessibility: [], facilities: [] });
  const [fields, setFields] = useState({ start: '', end: '', attendance: '', capacity: '', layout: '', location: '', q: '' });
  const [selected, setSelected] = useState<{ accessibility: string[]; facilities: string[] }>({ accessibility: [], facilities: [] });
  const [venues, setVenues] = useState<Result[] | null>(null);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(true);
  const [ready, setReady] = useState(false);
  const [note, setNote] = useState('');
  const [title, setTitle] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setReady(false); setBusy(true); setError(''); setVenues(null);
    const params = new URLSearchParams({ mode: 'suitability', ...(eventCode ? { event_id: eventCode } : {}) });
    fetch(`/api/venues?${params}`, { credentials: 'same-origin', signal: controller.signal }).then(async response => {
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Unable to load venue search.');
      setOptions(body.options);
      const d = body.defaults;
      setFields({ start: localTime(d.start || ''), end: localTime(d.end || ''), attendance: String(d.attendance ?? ''), capacity: '', layout: d.layout || '', location: '', q: '' });
      setSelected({ accessibility: d.accessibility || [], facilities: d.facilities || [] });
      setNote(d.accessibility_note || ''); setTitle(d.title || ''); setReady(true);
    }).catch(e => { if (!controller.signal.aborted) setError(e.message || 'Unable to load venue search.'); })
      .finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [eventCode]);
  async function search(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setErrors({}); setVenues(null);
    try {
      const params = new URLSearchParams({ mode: 'suitability', search: '1', ...fields, start: new Date(fields.start).toISOString(), end: new Date(fields.end).toISOString(), accessibility: selected.accessibility.join(','), facilities: selected.facilities.join(',') });
      if (!fields.capacity) params.delete('capacity');
      if (eventCode) params.set('event_id', eventCode);
      const response = await fetch(`/api/venues?${params}`, { credentials: 'same-origin' });
      const body = await response.json();
      if (body.errors) { setErrors(body.errors); return; }
      if (!response.ok) throw new Error(body.error || 'Unable to search venues.');
      setVenues(body.venues);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to search venues.'); }
    finally { setBusy(false); }
  }
  return <main className="venue-page">
    <h1>Search for suitable venues</h1>
    {title && <h2>{title}</h2>}
    <p>Times use your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone}). Suitability is advisory; unavailable venues cannot be treated as free.</p>
    {note && <p>Additional accessibility notes (for manual review): {note}</p>}
    {error && <p role="alert">{error}</p>}
    {busy && <p role="status">Loading venues...</p>}
    {ready && <form onSubmit={search}>
      <fieldset disabled={busy}><legend>Search criteria</legend>
        {([['q', 'Venue name', 'text'], ['start', 'Start', 'datetime-local'], ['end', 'End', 'datetime-local'], ['attendance', 'Expected attendance', 'number'], ['capacity', 'Minimum capacity (optional)', 'number'], ['location', 'Location', 'text']] as const).map(([key,label,type]) => <p key={key}><label>{label}<input type={type} required={['start','end','attendance'].includes(key)} min={type === 'number' ? 1 : undefined} step={type === 'number' ? 1 : undefined} value={fields[key]} onChange={e => setFields({ ...fields, [key]: e.target.value })} /></label></p>)}
        <p><label>Room layout<select value={fields.layout} onChange={e => setFields({ ...fields, layout: e.target.value })}><option value="">Any layout</option>{options.layouts.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></label></p>
        {(['accessibility','facilities'] as const).map(key => <fieldset key={key}><legend>{key === 'accessibility' ? 'Accessibility requirements' : 'Required facilities'}</legend>{options[key].map(o => <label key={o.id} style={{ display: 'block' }}><input type="checkbox" checked={selected[key].includes(o.id)} onChange={e => setSelected({ ...selected, [key]: e.target.checked ? [...selected[key], o.id] : selected[key].filter(id => id !== o.id) })} />{o.label}</label>)}</fieldset>)}
        {Object.entries(errors).map(([key, messages]) => <p role="alert" key={key}>{key}: {messages.join(' ')}</p>)}
        <button type="submit">Search venues</button>
      </fieldset>
    </form>}
    {venues && <section aria-label="Venue results" aria-live="polite">
      <p>{venues.length === 0 ? 'No active venues match this name. Try another search.' : `${venues.filter(v => v.suitable).length} suitable venues; ${venues.length} results.`}</p>
      {venues.length > 0 && !venues.some(v => v.suitable) && <p>No full matches. Review the unmet requirements below.</p>}
      {venues.map(v => <article key={v.id}><h2>{v.name}</h2><strong>{!v.available ? 'Unavailable' : v.suitable ? 'Suitable' : 'Unsuitable / near match'}</strong><p>{v.location}</p><p>Maximum capacity: {v.max_capacity}. Requested layout capacity: {v.effective_capacity ?? 'Not supported'}.</p><p>Layouts: {v.layouts.map(l => `${l.label} (${l.capacity})`).join(', ') || 'None'}</p><p>Facilities: {v.facilities.map(f => f.label).join(', ') || 'None'}</p><p>Accessibility: {v.accessibility.map(f => f.label).join(', ') || 'None'}</p>{v.mismatches.length > 0 && <ul>{v.mismatches.map(m => <li key={m}>{m}</li>)}</ul>}</article>)}
    </section>}
  </main>;
}
