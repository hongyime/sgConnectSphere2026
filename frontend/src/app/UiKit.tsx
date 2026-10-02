// /ui-kit: every shared building block, live, with sample data. A reference
// for anyone building a story's screens, and for checking the design language.
// Nothing here calls the API.
import { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import {
  Alert, Button, ButtonLink, Card, ConfirmPanel, DataTable, EmptyState, ErrorState, FactList, FilterChips,
  FormActions, FormField, FormSection, LoadingState, PageLayout, StatusPill, formatDate,
} from '../shared';
import './uiKit.css';

type SampleEvent = { id: string; title: string; organiser: string; startsAt: string; status: string };

const sampleEvents: SampleEvent[] = [
  { id: 'EVT-101', title: 'Leadership Summit', organiser: 'Organiser A', startsAt: '2027-01-20T01:00:00Z', status: 'under_review' },
  { id: 'EVT-102', title: 'Annual Sustainability Forum', organiser: 'Organiser B', startsAt: '2027-02-03T02:00:00Z', status: 'approved' },
  { id: 'EVT-103', title: 'Partner Networking Night', organiser: 'Organiser A', startsAt: '2027-02-18T10:00:00Z', status: 'awaiting_clarification' },
];

const statuses = ['draft', 'submitted', 'under_review', 'awaiting_clarification', 'approved', 'planning', 'confirmed', 'rejected', 'cancelled', 'completed'];

export function UiKit() {
  const [filter, setFilter] = useState<'all' | 'review' | 'approved'>('all');
  const [name, setName] = useState('');
  const [confirming, setConfirming] = useState(false);
  const shown = sampleEvents.filter(event => filter === 'all'
    || (filter === 'review' && ['under_review', 'awaiting_clarification'].includes(event.status))
    || (filter === 'approved' && event.status === 'approved'));

  return (
    <PageLayout eyebrow="Frontend skeleton" title="UI kit" actions={<ButtonLink to="/home" variant="secondary">Back to my home page</ButtonLink>}>
      <Alert tone="info" title="How to use this page">
        Every block below comes from <code>frontend/src/shared</code>. Import them with
        <code> import {'{ … }'} from '../../shared'</code>. Build new screens from these instead of new CSS.
      </Alert>

      <Card title="Page templates">
        <p className="ui-state-copy">Working examples to copy from <code>frontend/src/templates</code>. They run on sample data, so try them freely. See <code>docs/frontend-guide.md</code> for the steps.</p>
        <div className="ui-actions">
          <ButtonLink to="/ui-kit/templates/list" variant="primary">List</ButtonLink>
          <ButtonLink to="/ui-kit/templates/items/REQ-101">Detail</ButtonLink>
          <ButtonLink to="/ui-kit/templates/new">Form</ButtonLink>
          <ButtonLink to="/ui-kit/templates/items/REQ-101/decide">Decision</ButtonLink>
        </div>
      </Card>

      <Card title="Page layout and buttons">
        <p className="ui-state-copy">Every page uses <code>PageLayout</code> (eyebrow, title, actions). One primary button per area.</p>
        <div className="ui-actions">
          <Button variant="primary" icon={<Plus size={14} aria-hidden="true" />}>Primary</Button>
          <Button>Secondary</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="primary" busy busyLabel="Saving…">Save</Button>
        </div>
      </Card>

      <Card title="Status pills">
        <div className="ui-actions">{statuses.map(status => <StatusPill key={status} status={status} />)}</div>
      </Card>

      <Card title="Fact list">
        <FactList columns={2} items={[
          ['Organiser', 'Organiser A'], ['Event date', formatDate('2027-01-20T01:00:00Z', true)],
          ['Expected attendance', '120'], ['Accessibility needs', null],
        ]} />
      </Card>

      <Card title="Filter chips and data table">
        <FilterChips label="Filter by status" value={filter} onChange={setFilter} options={[
          { id: 'all', label: 'All', count: sampleEvents.length },
          { id: 'review', label: 'Needs review', count: 2 },
          { id: 'approved', label: 'Approved', count: 1 },
        ]} />
        <DataTable caption="Sample events" rows={shown} rowKey={event => event.id} columns={[
          { header: 'Event', primary: true, cell: event => <strong>{event.title}</strong> },
          { header: 'Organiser', cell: event => event.organiser },
          { header: 'Event date', cell: event => formatDate(event.startsAt) },
          { header: 'Status', cell: event => <StatusPill status={event.status} /> },
        ]} />
      </Card>

      <Card title="Form">
        <form onSubmit={event => event.preventDefault()} noValidate className="ui-form">
          <FormSection title="Basics">
            <FormField label="Event name" hint="As the attendees will see it." error={name ? undefined : 'Event name can’t be left empty.'} wide>
              {props => <input {...props} value={name} onChange={change => setName(change.target.value)} />}
            </FormField>
            <FormField label="Expected attendance">
              {props => <input {...props} type="number" min={1} defaultValue={120} />}
            </FormField>
            <FormField label="Layout">
              {props => <select {...props} defaultValue="theatre"><option value="theatre">Theatre</option><option value="banquet">Banquet</option></select>}
            </FormField>
          </FormSection>
          <FormActions>
            <Button>Cancel</Button>
            <Button type="submit" variant="primary" icon={<Save size={14} aria-hidden="true" />}>Save changes</Button>
          </FormActions>
        </form>
      </Card>

      <Card title="Decisions">
        {confirming ? (
          <ConfirmPanel title="Reject this request?" description="The Organiser is told, with your reason." confirmLabel="Reject request"
            reasonLabel="Reason" danger onCancel={() => setConfirming(false)} onConfirm={() => setConfirming(false)} />
        ) : <div><Button variant="danger" onClick={() => setConfirming(true)}>Reject request…</Button></div>}
      </Card>

      <Card title="Alerts">
        <Alert tone="success">Saved your changes to the venue requirements.</Alert>
        <Alert tone="warning" title="Overlaps a confirmed booking">Leadership Summit holds Central Hall on 20 Jan 2027.</Alert>
        <Alert tone="error">Only the assigned Coordinator may edit an approved event.</Alert>
      </Card>

      <h2 className="ui-kit-heading">States</h2>
      <LoadingState label="Loading your events…" rows={2} />
      <EmptyState title="No events assigned to you yet">New requests are assigned automatically and appear here.</EmptyState>
      <ErrorState failure={{ status: 503, message: 'Service unavailable.' }} context="your events" onRetry={() => undefined} />
      <ErrorState failure={{ status: 403, message: 'Access denied. This event is not assigned to you.' }} context="this event" />
      <ErrorState failure={{ status: 401, message: 'Sign in to continue.' }} context="your events" />
    </PageLayout>
  );
}
