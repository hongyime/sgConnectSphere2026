// In-memory stand-in for a story's API module, used only by the page
// templates so they run without a backend (at /ui-kit/templates/...).
//
// When you copy a template, replace this with your own API module built on
// apiCall from '../shared'. Keep the same shape: every function takes an
// AbortSignal when it reads, and returns Promise<ApiResult<T>>, so useLoad and
// the states work unchanged. For example:
//
//   export function listRequests(signal?: AbortSignal) {
//     return apiCall<{ events: SampleRequest[] }>('/api/events?assigned=1', { signal }, 'Unable to load requests.');
//   }
import type { ApiResult } from '../shared';

export type SampleStatus = 'under_review' | 'awaiting_clarification' | 'approved' | 'rejected';

export type SampleRequest = {
  id: string;
  title: string;
  organiser: string;
  startsAt: string;
  attendance: number;
  status: SampleStatus;
  notes: string;
  decisionReason?: string;
};

export type SampleInput = Pick<SampleRequest, 'title' | 'organiser' | 'startsAt' | 'attendance' | 'notes'>;

const seed: SampleRequest[] = [
  { id: 'REQ-101', title: 'Leadership Summit', organiser: 'Organiser A', startsAt: '2027-01-20T01:00:00.000Z', attendance: 120, status: 'under_review', notes: 'Theatre seating, two microphones.' },
  { id: 'REQ-102', title: 'Annual Sustainability Forum', organiser: 'Organiser B', startsAt: '2027-02-03T02:00:00.000Z', attendance: 180, status: 'approved', notes: '' },
  { id: 'REQ-103', title: 'Partner Networking Night', organiser: 'Organiser A', startsAt: '2027-02-18T10:00:00.000Z', attendance: 60, status: 'awaiting_clarification', notes: 'Standing reception.' },
];

let store: SampleRequest[] = structuredClone(seed);

// Tests call this so each one starts from the same data.
export function resetSampleData() {
  store = structuredClone(seed);
}

// Simulate a network round trip; reject like fetch does when aborted.
function respond<T>(value: ApiResult<T>, signal?: AbortSignal, delayMs = 250): Promise<ApiResult<T>> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => resolve(value), delayMs);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); });
  });
}

export function listRequests(signal?: AbortSignal) {
  return respond<SampleRequest[]>({ ok: true, data: structuredClone(store) }, signal);
}

export function getRequest(id: string, signal?: AbortSignal) {
  const found = store.find(item => item.id === id);
  return respond<SampleRequest>(found ? { ok: true, data: structuredClone(found) } : { ok: false, status: 404, message: 'Request not found.' }, signal);
}

export function saveRequest(id: string | null, input: SampleInput) {
  if (input.title.trim().toLowerCase() === 'duplicate') {
    // Lets the Form template show a server refusal.
    return respond<SampleRequest>({ ok: false, status: 409, message: 'A request with this name already exists.' });
  }
  if (id) {
    const index = store.findIndex(item => item.id === id);
    if (index < 0) return respond<SampleRequest>({ ok: false, status: 404, message: 'Request not found.' });
    store[index] = { ...store[index], ...input };
    return respond<SampleRequest>({ ok: true, data: structuredClone(store[index]) });
  }
  const created: SampleRequest = { ...input, id: `REQ-${100 + store.length + 1}`, status: 'under_review' };
  store.push(created);
  return respond<SampleRequest>({ ok: true, data: structuredClone(created) });
}

export function decideRequest(id: string, decision: 'approve' | 'reject', reason: string) {
  const index = store.findIndex(item => item.id === id);
  if (index < 0) return respond<SampleRequest>({ ok: false, status: 404, message: 'Request not found.' });
  if (store[index].status !== 'under_review') {
    return respond<SampleRequest>({ ok: false, status: 409, message: 'Only a request under review can be decided.' });
  }
  store[index] = { ...store[index], status: decision === 'approve' ? 'approved' : 'rejected', decisionReason: reason || undefined };
  return respond<SampleRequest>({ ok: true, data: structuredClone(store[index]) });
}
