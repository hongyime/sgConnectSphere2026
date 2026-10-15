import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, expect, test, vi } from 'vitest';
import { VenueBookingForm } from './VenueBookingForm';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function mount() { render(<MemoryRouter><VenueBookingForm eventId="event" eventCode="EVT-1" venueId="venue" start="2027-01-15T01:00:00Z" end="2027-01-15T10:00:00Z" /></MemoryRouter>); }
const success = { booking: { id: 'booking' }, suitability: { suitable: false, mismatches: ['Event is outside operating hours.'] } };
test('TC_E06S03_01 request uses recorded IDs, optional fields and an idempotency key; shows advisory outcome', async () => {
  const fetcher = vi.fn().mockResolvedValue({ok:true,json:async()=>success}); vi.stubGlobal('fetch',fetcher); mount();
  fireEvent.change(screen.getByLabelText('Purpose (optional)'),{target:{value:' Breakout '}});
  fireEvent.change(screen.getByLabelText('Headcount (optional)'),{target:{value:'50'}});
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  expect(await screen.findByText('Booking request submitted')).toBeInTheDocument();
  const init = fetcher.mock.calls[0][1];
  expect(JSON.parse(init.body)).toMatchObject({event_id:'event',venue_id:'venue',purpose:'Breakout',headcount:50});
  expect(init.headers['Idempotency-Key']).toMatch(/^[0-9a-f-]{36}$/);
  expect(screen.getByText('Event is outside operating hours.')).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'View venue booking requests'})).toHaveAttribute('href','/coordinator/events/EVT-1/venue-bookings');
});
test('network retry retains the key; changing the payload rotates it', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('offline')); vi.stubGlobal('fetch',fetcher); mount();
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(/Check your connection/);
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2));
  await waitFor(()=>expect(screen.getByRole('button',{name:'Submit booking request'})).not.toBeDisabled());
  expect(fetcher.mock.calls[0][1].headers['Idempotency-Key']).toBe(fetcher.mock.calls[1][1].headers['Idempotency-Key']);
  fireEvent.change(screen.getByLabelText('Purpose (optional)'),{target:{value:'Another purpose'}});
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(3));
  expect(fetcher.mock.calls[2][1].headers['Idempotency-Key']).not.toBe(fetcher.mock.calls[0][1].headers['Idempotency-Key']);
});
test('blank optional values use event attendance; suitable result has no failure list', async () => {
  const fetcher = vi.fn().mockResolvedValue({ok:true,json:async()=>({...success,suitability:{suitable:true,mismatches:[]}})});vi.stubGlobal('fetch',fetcher); mount();
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  await screen.findByText('Booking request submitted');
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({purpose:null,headcount:null});
  expect(screen.queryByRole('list')).not.toBeInTheDocument();
});
test('invalid dates, reversed/outside periods, purpose and headcount prevent submission', async () => {
  const fetcher = vi.fn();vi.stubGlobal('fetch',fetcher);mount();
  const start = screen.getByLabelText('Booking start') as HTMLInputElement;
  const end = screen.getByLabelText('Booking end') as HTMLInputElement;
  const originalStart=start.value,originalEnd=end.value;
  fireEvent.change(start,{target:{value:''}});fireEvent.change(end,{target:{value:''}});
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  expect(screen.getByText('Enter when the booking starts.')).toBeInTheDocument();
  fireEvent.change(start,{target:{value:originalEnd}});fireEvent.change(end,{target:{value:originalStart}});
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  expect(screen.getByText('The booking must end after it starts.')).toBeInTheDocument();
  fireEvent.change(start,{target:{value:'2027-01-14T00:00'}});fireEvent.change(end,{target:{value:originalEnd}});
  fireEvent.change(screen.getByLabelText('Purpose (optional)'),{target:{value:'x'.repeat(81)}});
  fireEvent.change(screen.getByLabelText('Headcount (optional)'),{target:{value:'0'}});
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  expect(screen.getByText('The booking period must fall within the event.')).toBeInTheDocument();
  expect(screen.getByText('Purpose must be at most 80 characters.')).toBeInTheDocument();
  expect(screen.getByText('Enter a whole number greater than zero.')).toBeInTheDocument();
  expect(fetcher).not.toHaveBeenCalled();
});
test('server field errors and conflict messages remain visible and recoverable', async () => {
  vi.stubGlobal('fetch',vi.fn().mockResolvedValue({ok:false,status:400,json:async()=>({error:'Validation refused.',errors:{purpose:['Check this purpose.']}})}));mount();
  fireEvent.click(screen.getByRole('button',{name:'Submit booking request'}));
  expect(await screen.findByRole('alert')).toHaveTextContent('Validation refused.');
  expect(screen.getByText('Check this purpose.')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Purpose (optional)'),{target:{value:'Updated'}});
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
});
test('submission disables controls while waiting and cannot double submit', async () => {
  let resolve!: (value:unknown)=>void;
  const fetcher=vi.fn().mockImplementation(()=>new Promise(r=>{resolve=r;}));vi.stubGlobal('fetch',fetcher);mount();
  fireEvent.submit(screen.getByRole('form',{name:'Request venue booking'}));
  expect(screen.getByRole('button',{name:'Submitting...'})).toBeDisabled();
  fireEvent.submit(screen.getByRole('form',{name:'Request venue booking'}));expect(fetcher).toHaveBeenCalledTimes(1);
  resolve({ok:false,status:409,json:async()=>({error:'This venue is occupied.'})});
  expect(await screen.findByRole('alert')).toHaveTextContent('This venue is occupied.');
});
