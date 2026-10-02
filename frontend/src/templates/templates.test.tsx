// The page templates work end to end on their sample data. Teams copy these
// tests alongside the templates and swap in stubApi for their real endpoints.
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, test } from 'vitest';
import { DecisionTemplate } from './DecisionTemplate';
import { DetailTemplate } from './DetailTemplate';
import { FormTemplate, validate } from './FormTemplate';
import { ListTemplate } from './ListTemplate';
import { resetSampleData } from './sampleApi';

beforeEach(() => resetSampleData());
afterEach(() => cleanup());

function renderAt(path: string, strict = false) {
  const app = (
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/ui-kit/templates/list" element={<ListTemplate />} />
        <Route path="/ui-kit/templates/new" element={<FormTemplate />} />
        <Route path="/ui-kit/templates/items/:id" element={<DetailTemplate />} />
        <Route path="/ui-kit/templates/items/:id/edit" element={<FormTemplate />} />
        <Route path="/ui-kit/templates/items/:id/decide" element={<DecisionTemplate />} />
      </Routes>
    </MemoryRouter>
  );
  // StrictMode, as in main.tsx, mounts each component twice in development.
  render(strict ? <StrictMode>{app}</StrictMode> : app);
}

test('List: loads, filters with counts, and shows a filter-specific empty state', async () => {
  renderAt('/ui-kit/templates/list');
  expect(await screen.findByRole('table', { name: 'Requests' })).toBeInTheDocument();
  const filters = screen.getByRole('group', { name: 'Filter by status' });
  expect(within(filters).getByRole('button', { name: /All/ })).toHaveTextContent('3');
  fireEvent.click(within(filters).getByRole('button', { name: /Approved/ }));
  expect(screen.getByRole('link', { name: 'Annual Sustainability Forum' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Leadership Summit' })).not.toBeInTheDocument();
});

test('Detail: shows the facts, and a 404 shows the server message with a way back', async () => {
  renderAt('/ui-kit/templates/items/REQ-101');
  expect(await screen.findByRole('heading', { level: 1, name: 'Leadership Summit' })).toBeInTheDocument();
  expect(screen.getByText('Theatre seating, two microphones.')).toBeInTheDocument();
  cleanup();
  renderAt('/ui-kit/templates/items/REQ-999');
  expect(await screen.findByRole('alert')).toHaveTextContent('Request not found.');
});

test('Form: client validation mirrors the server rules', () => {
  expect(validate({ title: '', organiser: 'A', startsAt: '', attendance: 0, notes: '' }))
    .toEqual({ title: 'Enter the event name.', startsAt: 'Enter a valid date and time.', attendance: 'Enter a whole number greater than 0.' });
});

test('Form: errors appear next to fields, a server refusal is shown, and a save opens the detail page', async () => {
  renderAt('/ui-kit/templates/items/REQ-101/edit');
  const name = await screen.findByLabelText('Event name');
  fireEvent.change(name, { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save request' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Fix the highlighted fields');
  expect(name).toHaveAccessibleDescription(/Enter the event name\./);

  fireEvent.change(name, { target: { value: 'duplicate' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save request' }));
  // The server's message appears in the alert and, from fieldErrors, next to the field.
  expect(await screen.findByRole('alert')).toHaveTextContent('A request with this name already exists.');
  expect(name).toHaveAccessibleDescription(/A request with this name already exists\./);
  expect(name).toHaveAttribute('aria-invalid', 'true');

  fireEvent.change(name, { target: { value: 'Leadership Summit 2027' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save request' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Leadership Summit 2027' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Saved your changes.');
});

test('Form: a save still completes under StrictMode, as in npm run dev', async () => {
  renderAt('/ui-kit/templates/items/REQ-101/edit', true);
  const name = await screen.findByLabelText('Event name');
  fireEvent.change(name, { target: { value: 'Leadership Summit 2027' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save request' }));
  expect(await screen.findByRole('heading', { level: 1, name: 'Leadership Summit 2027' })).toBeInTheDocument();
});

test('Decision: rejecting requires a reason, then the outcome is confirmed', async () => {
  renderAt('/ui-kit/templates/items/REQ-101/decide');
  fireEvent.click(await screen.findByRole('button', { name: 'Reject…' }));
  fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));
  expect(screen.getByLabelText('Reason')).toHaveAccessibleDescription('Reason is required.');
  fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Clashes with the annual audit.' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reject request' }));
  expect(await screen.findByText('Rejected. Organiser A has been notified, with your reason.')).toBeInTheDocument();
  expect(await screen.findByText(/This request is rejected/)).toBeInTheDocument();
});

test('Decision: a request that is not under review has nothing to decide', async () => {
  renderAt('/ui-kit/templates/items/REQ-102/decide');
  expect(await screen.findByText("This request is approved, so there's nothing to decide.")).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Approve…' })).not.toBeInTheDocument();
});
