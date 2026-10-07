// Page frame, cards and label/value lists.
import { useId, type ReactNode } from 'react';
import './shared.css';

// Every page's outer frame: eyebrow, title, optional actions, then content.
// `width="narrow"` suits single forms; "wide" (default) suits lists and dashboards.
export function PageLayout({ eyebrow, title, actions, width = 'wide', children }: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  width?: 'wide' | 'narrow';
  children: ReactNode;
}) {
  return (
    <main className={`ui-page ui-page-${width}`}>
      <header className="page-heading ui-page-heading">
        <div>
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1>{title}</h1>
        </div>
        {actions ? <div className="ui-actions">{actions}</div> : null}
      </header>
      {children}
    </main>
  );
}

// A titled group of content. Give it a title unless the content explains itself.
export function Card({ title, actions, children, label }: {
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
  // Accessible name when there's no visible title.
  label?: string;
}) {
  const headingId = useId();
  return (
    <section className="card ui-card" aria-labelledby={title ? headingId : undefined} aria-label={title ? undefined : label}>
      {title || actions ? (
        <div className="ui-card-heading">
          {title ? <h2 id={headingId}>{title}</h2> : <span />}
          {actions ? <div className="ui-actions">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

// Label and value pairs, for details pages. Empty values show "None recorded".
export function FactList({ items, columns = 1 }: {
  items: [label: string, value: ReactNode][];
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl className={`ui-facts ui-facts-${columns}`}>
      {items.map(([label, value]) => {
        const empty = value === null || value === undefined || value === '';
        return (
          <div key={label}>
            <dt>{label}</dt>
            <dd className={empty ? 'ui-none' : undefined}>{empty ? 'None recorded' : value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
