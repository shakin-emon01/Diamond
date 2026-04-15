import type { DiamondToken } from "../../../lib/types";

import { EmptyState } from "../layout/empty-state";

function SummaryCard({
  label,
  value
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[20px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)] px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function formatLexeme(lexeme: string | null) {
  if (!lexeme || lexeme.length === 0) {
    return "(empty)";
  }

  return lexeme;
}

export function TokenStreamPanel({
  tokens
}: {
  tokens: DiamondToken[];
}) {
  if (!tokens.length) {
    return (
      <EmptyState
        title="No tokens yet"
        body="Compile the source to inspect the lexer output stream."
      />
    );
  }

  const grouped = tokens.reduce<Map<number, DiamondToken[]>>((map, token) => {
    const bucket = map.get(token.line) ?? [];
    bucket.push(token);
    map.set(token.line, bucket);
    return map;
  }, new Map());

  const groupedLines = Array.from(grouped.entries()).sort(([left], [right]) => left - right);
  const uniqueTypes = new Set(tokens.map((token) => token.type)).size;

  return (
    <div className="h-full overflow-auto rounded-[24px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)]/95 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryCard label="Total Tokens" value={String(tokens.length)} />
        <SummaryCard label="Source Lines" value={String(groupedLines.length)} />
        <SummaryCard label="Token Kinds" value={String(uniqueTypes)} />
      </div>

      <div className="mt-4 space-y-4">
        {groupedLines.map(([line, lineTokens]) => (
          <section
            key={`token-line-${line}`}
            className="rounded-[22px] border border-[color:var(--panel-border)] bg-[var(--panel-muted-bg)]/70 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm font-semibold text-[var(--text-primary)]">Line {line}</div>
              <div className="rounded-full bg-[var(--panel-bg)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {lineTokens.length} token{lineTokens.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              {lineTokens.map((token, index) => (
                <div
                  key={`${token.line}-${token.type}-${token.lexeme ?? "null"}-${index}`}
                  className="min-w-[132px] rounded-[18px] border border-[color:var(--panel-border)] bg-[var(--panel-bg)] px-3 py-2"
                >
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--accent-text)]">
                    {token.type}
                  </div>
                  <div className="mt-1 break-all font-mono text-sm text-[var(--text-primary)]">
                    {formatLexeme(token.lexeme)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
