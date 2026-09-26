// /organiser/drafts/:id failure states: a reply without a draft used to leave
// the page on "Loading draft…" forever; every error must now say so and offer
// a way back to the drafts list.
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { OrganiserDraftEdit } from './OrganiserDrafts';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function renderDraft() {
  render(
    <MemoryRouter initialEntries={['/organiser/drafts/d-1']}>
      <Routes><Route path="/organiser/drafts/:id" element={<OrganiserDraftEdit />} /></Routes>
    </MemoryRouter>,
  );
}

test.each([
  ['a successful reply with no draft', 200, {}, 'The draft could not be loaded.'],
  ['a successful reply that is not JSON', 200, null, 'The draft could not be loaded.'],
  ['a missing draft', 404, { error: 'not_found' }, 'Draft not found.'],
  ['a server error', 503, {}, 'The draft could not be loaded.'],
])('%s shows an error with a way back, not endless loading', async (_case, status, body, message) => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: status < 300, status, json: body === null ? async () => { throw new SyntaxError('bad json'); } : async () => body,
  })));
  renderDraft();

  expect(await screen.findByRole('alert')).toHaveTextContent(message);
  expect(screen.queryByText('Loading draft…')).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '← Back to my drafts' })).toHaveAttribute('href', '/organiser/drafts');
});
