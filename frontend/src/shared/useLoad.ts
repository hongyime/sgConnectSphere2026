// Load data for a screen and keep it correct as the route changes.
//
// - Runs `load` whenever `deps` change (for example a route parameter).
// - Cancels the previous request, so a slow response for an earlier route or
//   retry can never overwrite the current one, success or error. (This is the
//   stale-response bug found on #136 and #137; don't hand-roll fetches.)
// - `reload()` after an action keeps the current data on screen while it
//   refreshes; a new route or a retry after an error shows loading again.
//
// Example:
//   const { eventCode = '' } = useParams();
//   const { result, reload } = useLoad(signal => getEvent(eventCode, signal), [eventCode]);
//   if (result.state === 'loading') return <LoadingState label="Loading event…" />;
//   if (result.state === 'error') return <ErrorState failure={result.failure} onRetry={reload} context="this event" />;
//   return <EventView event={result.data} />;
import { useEffect, useRef, useState } from 'react';
import { isAbort, type ApiResult } from './api';

export type Failure = { status: number; message: string };
export type Load<T> =
  | { state: 'loading' }
  | { state: 'error'; failure: Failure }
  | { state: 'ready'; data: T };

export function useLoad<T>(load: (signal: AbortSignal) => Promise<ApiResult<T>>, deps: unknown[]) {
  const [result, setResult] = useState<Load<T>>({ state: 'loading' });
  const [reloadToken, setReloadToken] = useState(0);
  const depsKey = JSON.stringify(deps);
  const loadedKey = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    if (loadedKey.current !== depsKey) setResult({ state: 'loading' });
    else setResult(current => current.state === 'ready' ? current : { state: 'loading' });
    load(controller.signal)
      .then(outcome => {
        if (controller.signal.aborted) return;
        loadedKey.current = depsKey;
        setResult(outcome.ok ? { state: 'ready', data: outcome.data } : { state: 'error', failure: outcome });
      })
      .catch(error => {
        if (!isAbort(error) && !controller.signal.aborted) {
          setResult({ state: 'error', failure: { status: 0, message: 'Something went wrong. Please try again.' } });
        }
      });
    return () => controller.abort();
    // `load` is intentionally not a dependency: callers pass a new closure each
    // render, and `deps` already describes what the request depends on.
  }, [depsKey, reloadToken]);

  return { result, reload: () => setReloadToken(token => token + 1) };
}
