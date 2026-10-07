import { useState, type FormEvent } from 'react';
import {
  Alert,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  FormActions,
  FormField,
  FormSection,
  LoadingState,
  PageLayout,
  useLoad,
  formatDateRange,
} from '../../shared';
import { checkAvailability } from './equipmentAvailabilityApi';

export function EquipmentAvailability() {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<{
    start: string;
    end: string;
    revision: number;
  } | null>(null);
  function submit(event: FormEvent) {
    event.preventDefault();
    if (
      !start ||
      !end ||
      !Number.isFinite(Date.parse(start)) ||
      !Number.isFinite(Date.parse(end)) ||
      Date.parse(end) <= Date.parse(start)
    ) {
      setError('End must be after start.');
      return;
    }
    setError('');
    setPeriod((previous) => ({
      start: new Date(start).toISOString(),
      end: new Date(end).toISOString(),
      revision: (previous?.revision ?? 0) + 1,
    }));
  }
  return (
    <PageLayout eyebrow="Technical support" title="Equipment availability">
      <p>
        Check the quantity free throughout a period. Location does not restrict
        availability; no transport allowance is applied.
      </p>
      <Card title="Check a period">
        <form onSubmit={submit} className="ui-form">
          <p>
            Enter times in your local timezone (
            {Intl.DateTimeFormat().resolvedOptions().timeZone}).
          </p>
          <FormSection title="Date and time">
            <FormField label="Start" hint="Start of the required period.">
              {(props) => (
                <input
                  {...props}
                  type="datetime-local"
                  required
                  value={start}
                  onChange={(event) => setStart(event.target.value)}
                />
              )}
            </FormField>
            <FormField label="End" error={error || undefined}>
              {(props) => (
                <input
                  {...props}
                  type="datetime-local"
                  required
                  value={end}
                  onChange={(event) => setEnd(event.target.value)}
                />
              )}
            </FormField>
          </FormSection>
          <FormActions>
            <Button type="submit" variant="primary">
              Check availability
            </Button>
          </FormActions>
        </form>
      </Card>
      {period ? (
        <AvailabilityResults
          key={`${period.start}:${period.end}:${period.revision}`}
          start={period.start}
          end={period.end}
        />
      ) : (
        <EmptyState title="Choose a period">
          Enter a start and end date and time to see equipment availability.
        </EmptyState>
      )}
    </PageLayout>
  );
}
function AvailabilityResults({ start, end }: { start: string; end: string }) {
  const { result, reload } = useLoad(
    (signal) => checkAvailability(start, end, signal),
    [start, end],
  );
  if (result.state === 'loading')
    return <LoadingState label="Checking equipment availability…" />;
  if (result.state === 'error')
    return (
      <ErrorState
        failure={result.failure}
        context="equipment availability"
        onRetry={reload}
      />
    );
  if (!result.data.equipment.length)
    return (
      <EmptyState title="No active equipment">
        Technical Support Staff must add equipment to the catalogue before
        checking availability.
      </EmptyState>
    );
  return (
    <Card title="Available equipment">
      <p>{formatDateRange(result.data.period.start, result.data.period.end)}</p>
      <Alert tone="info">
        Free quantity is the minimum available throughout this period. Reserved
        and withdrawn quantities are shown at the most constrained time.
        Standing maintenance makes the entire item unavailable. This check does
        not reserve equipment.
      </Alert>
      <DataTable
        caption="Equipment availability for the selected period"
        rows={result.data.equipment}
        rowKey={(row) => row.id}
        columns={[
          { header: 'Equipment', primary: true, cell: (row) => row.name },
          { header: 'Total stock', cell: (row) => row.totalStock },
          { header: 'Reserved', cell: (row) => row.reservedQuantity },
          {
            header: 'Damaged / withdrawn',
            cell: (row) => row.unavailableQuantity,
          },
          { header: 'Free quantity', cell: (row) => row.freeQuantity },
          {
            header: 'Location',
            cell: (row) => row.location || 'Not specified',
          },
          {
            header: 'Condition',
            cell: (row) =>
              row.operationallyUnavailable ? 'Under maintenance' : 'Working',
          },
        ]}
      />
      <Button onClick={reload}>Refresh availability</Button>
    </Card>
  );
}
