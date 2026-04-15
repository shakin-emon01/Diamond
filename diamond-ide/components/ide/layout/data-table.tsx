import { EmptyState } from "./empty-state";

export function DataTable({
  headers,
  rows,
  emptyTitle,
  emptyBody
}: {
  headers: string[];
  rows: string[][];
  emptyTitle: string;
  emptyBody: string;
}) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} body={emptyBody} />;
  }

  return (
    <div className="h-full overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95">
      <table className="min-w-full text-left text-sm text-[var(--text-primary)]">
        <thead className="sticky top-0 bg-[var(--panel-muted-bg)]/95 text-[11px] uppercase tracking-[0.2em] text-[var(--text-muted)]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="border-b border-[color:var(--panel-border)] px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-[color:var(--panel-border-soft)] last:border-b-0">
              {row.map((cell, cellIndex) => (
                <td key={`${rowIndex}-${cellIndex}`} className="px-4 py-3 text-[var(--text-primary)]/90">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
