// Late-response guard for the draft editor (/organiser/drafts/:id).
// MemoryRouter keeps OrganiserDraftEdit mounted between draft URLs, so draft
// A's slow load must never land on draft B, and B's form must show B's values.
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { OrganiserDraftEdit } from './OrganiserDrafts';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

type Reply = { status: number; body: unknown };

function draft(id: string, title: string) {
  return { event: { id, title, status: 'draft', description: '', purpose: '' } };
}

function stubFetch(holdId: string) {
  let release!: (reply: Reply) => void;
  const requested: string[] = [];
  vi.stubGlobal('fetch', vi.fn(async (input: string) => {
    const url = new URL(input, 'http://localhost');
    if (url.searchParams.get('accessibilityFeatures') === '1') {
      return { ok: true, status: 200, json: async () => ({ features: [] }) } as Response;
    }
    const id = url.searchParams.get('id') ?? '';
    requested.push(id);
    const reply: Reply = id === holdId
      ? await new Promise<Reply>(resolve => { release = resolve; })
      : { status: 200, body: draft(id, `Draft ${id.toUpperCase()}`) };
    return { ok: reply.status < 300, status: reply.status, json: async () => reply.body } as Response;
  }));
  return { requested, release: (reply: Reply) => release(reply) };
}

function renderDraftA() {
  render(
    <MemoryRouter initialEntries={['/organiser/drafts/a']}>
      <Link to="/organiser/drafts/b">Open draft B</Link>
      <Routes><Route path="/organiser/drafts/:id" element={<OrganiserDraftEdit />} /></Routes>
    </MemoryRouter>,
  );
}

test.each([
  ['success', { status: 200, body: draft('a', 'Draft A') }],
  ['error', { status: 503, body: { error: 'unavailable' } }],
])('a late %s for draft A does not replace draft B', async (_kind, lateReply) => {
  const { requested, release } = stubFetch('a');
  renderDraftA();
  await waitFor(() => expect(requested).toContain('a'));

  fireEvent.click(screen.getByText('Open draft B'));
  expect(await screen.findByLabelText('Event name')).toHaveValue('Draft B');

  await act(async () => { release(lateReply); });
  expect(screen.getByLabelText('Event name')).toHaveValue('Draft B');
  expect(screen.queryByText('The draft could not be loaded.')).not.toBeInTheDocument();
});

test('switching drafts shows the new draft\'s values, never the previous draft\'s', async () => {
  const { release } = stubFetch('b');
  renderDraftA();
  expect(await screen.findByLabelText('Event name')).toHaveValue('Draft A');

  fireEvent.click(screen.getByText('Open draft B'));
  // Saving now would write draft A's values to draft B.
  expect(screen.queryByDisplayValue('Draft A')).not.toBeInTheDocument();

  await act(async () => { release({ status: 200, body: draft('b', 'Draft B') }); });
  expect(await screen.findByLabelText('Event name')).toHaveValue('Draft B');
});
