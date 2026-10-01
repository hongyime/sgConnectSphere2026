// Lists of records: a table that becomes labelled cards on phones, and
// status filter chips with counts.
import type { ReactNode } from 'react';
import './shared.css';

export type Column<Row> = {
  // Always give a header, even for an actions column: screen readers use it.
  header: string;
  cell: (row: Row) => ReactNode;
  // Hide the label on phones for this column (e.g. the main title column).
  primary?: boolean;
  // Show the header to screen readers only, with no label on phones
  // (e.g. header: 'Actions' over a column of buttons).
  hideHeader?: boolean;
  // Unique id for the column. Defaults to `header`; set it when two columns
  // share a header.
  key?: string;
};

// Give every table a caption (visually hidden) describing what it lists.
export function DataTable<Row>({ caption, columns, rows, rowKey }: {
  caption: string;
  columns: Column<Row>[];
  rows: Row[];
  rowKey: (row: Row) => string;
}) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>{columns.map(column => (
            <th key={column.key ?? column.header} scope="col">
              {column.hideHeader ? <span className="visually-hidden">{column.header}</span> : column.header}
            </th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={rowKey(row)}>
              {columns.map(column => (
                <td
                  key={column.key ?? column.header}
                  data-label={column.hideHeader ? undefined : column.header}
                  className={column.primary || column.hideHeader ? 'ui-table-primary' : undefined}
                >
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type FilterOption<Id extends string> = { id: Id; label: string; count?: number };

export function FilterChips<Id extends string>({ label, options, value, onChange }: {
  // Names the group for screen readers, e.g. "Filter by status".
  label: string;
  options: FilterOption<Id>[];
  value: Id;
  onChange: (id: Id) => void;
}) {
  return (
    <div className="ui-chips" role="group" aria-label={label}>
      {options.map(option => (
        <button key={option.id} type="button" aria-pressed={value === option.id} onClick={() => onChange(option.id)}>
          {option.label}
          {option.count !== undefined ? <span className="ui-count">{option.count}</span> : null}
        </button>
      ))}
    </div>
  );
}
