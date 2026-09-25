// SCAFFOLD: replace with real implementations below. Safe to delete/rewrite entirely.
// Each export corresponds to one screen in the roleAreas 'operations' area (Shared Operations).
import './operations.css';

// SCAFFOLD: replace with real E14-S02 implementation. Safe to delete/rewrite entirely.
export function AuditHistory() {
  return (
    <main className="operations-page" data-scaffold="true">
      <header>
        <p className="eyebrow">Shared operations</p>
        <h1>Audit and history</h1>
      </header>
      <p>
        Cross-role timeline drawer showing status changes, actors, and
        timestamps for any entity. Opens as a full-screen sheet on mobile.
        Every lifecycle action appends an audit entry (E14-S02).
      </p>
    </main>
  );
}

// SCAFFOLD: replace with real E03-S06 implementation. Safe to delete/rewrite entirely.
export function CommentsActivity() {
  return (
    <main className="operations-page" data-scaffold="true">
      <header>
        <p className="eyebrow">Shared operations</p>
        <h1>Comments and activity</h1>
      </header>
      <p>
        Threaded comment feed attached to an event. Coordinator clarification
        questions are flagged and stay open until the organiser replies.
        Used inside the coordinator and organiser views (E03-S06).
      </p>
    </main>
  );
}

// SCAFFOLD: replace with real E06-S01 implementation. Safe to delete/rewrite entirely.
export function SearchFilter() {
  return (
    <main className="operations-page" data-scaffold="true">
      <header>
        <p className="eyebrow">Shared operations</p>
        <h1>Search and filter patterns</h1>
      </header>
      <p>
        Reusable search bar, filter chips, and saved-view components shared
        across all six role areas. Consistent filter language reduces
        role-to-role confusion (E06-S01).
      </p>
    </main>
  );
}

// SCAFFOLD: replace with real E13-S02 implementation. Safe to delete/rewrite entirely.
export function EmptyErrorLoading() {
  return (
    <main className="operations-page" data-scaffold="true">
      <header>
        <p className="eyebrow">Shared operations</p>
        <h1>Empty, loading, and error states</h1>
      </header>
      <p>
        Standard empty-state copy, loading skeletons, and specific error panels
        with named recovery actions. Used across all role areas to keep
        fallback UI consistent (E13-S02).
      </p>
    </main>
  );
}
