// TEMPLATE: List page (queues, catalogues, registrations, drafts).
// Copy into your feature folder, rename, and:
//   1. Swap `listRequests` for your API module's list function.
//   2. Change the filters, columns and empty-state wording to your story's.
//   3. Point row links at your detail route.
// Keep: useLoad, the loading/error/empty states, and DataTable's caption.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  ButtonLink, DataTable, EmptyState, ErrorState, FilterChips, LoadingState, PageLayout, StatusPill, formatDate, useLoad,
} from '../shared';
import { listRequests, type SampleRequest, type SampleStatus } from './sampleApi';

const filters: { id: 'all' | SampleStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'under_review', label: 'Under review' },
  { id: 'awaiting_clarification', label: 'Awaiting organiser' },
  { id: 'approved', label: 'Approved' },
];

export function ListTemplate() {
  const { result, reload } = useLoad(signal => listRequests(signal), []);
  const [filter, setFilter] = useState<(typeof filters)[number]['id']>('all');
  const rows = result.state === 'ready' ? result.data : [];
  const shown = useMemo(() => filter === 'all' ? rows : rows.filter(row => row.status === filter), [rows, filter]);

  return (
    <PageLayout eyebrow="Template · List" title="Requests"
      actions={<ButtonLink to="/ui-kit/templates/new" variant="primary" icon={<Plus size={14} aria-hidden="true" />}>New request</ButtonLink>}>
      {result.state === 'loading' ? <LoadingState label="Loading requests…" rows={4} /> : null}
      {result.state === 'error' ? <ErrorState failure={result.failure} context="requests" onRetry={reload} /> : null}
      {result.state === 'ready' ? (
        <>
          <FilterChips label="Filter by status" value={filter} onChange={setFilter}
            options={filters.map(option => ({
              ...option,
              count: option.id === 'all' ? rows.length : rows.filter(row => row.status === option.id).length,
            }))} />
          {shown.length === 0 ? (
            <EmptyState title={rows.length === 0 ? 'No requests yet' : 'No requests match this filter'}>
              {rows.length === 0 ? 'Requests you create appear here.' : 'Choose another filter to see the rest.'}
            </EmptyState>
          ) : (
            <DataTable<SampleRequest> caption="Requests" rows={shown} rowKey={row => row.id} columns={[
              { header: 'Request', primary: true, cell: row => <Link to={`/ui-kit/templates/items/${row.id}`}>{row.title}</Link> },
              { header: 'Organiser', cell: row => row.organiser },
              { header: 'Event date', cell: row => formatDate(row.startsAt) },
              { header: 'Status', cell: row => <StatusPill status={row.status} /> },
            ]} />
          )}
        </>
      ) : null}
    </PageLayout>
  );
}
