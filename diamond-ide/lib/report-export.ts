import type { ChallengeEvaluation } from "./challenges";
import type { ReportExportPayload } from "./ide-types";

import { downloadTextFile, escapeHtml } from "./ide-utils";

function renderKeyValueTable(rows: Array<[string, string | number | null | undefined]>) {
  return rows
    .map(
      ([label, value]) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${escapeHtml(String(value ?? "-"))}</td>
        </tr>
      `
    )
    .join("");
}

function renderTextLines(lines: string[]) {
  if (lines.length === 0) {
    return "<p class=\"muted\">No rows available.</p>";
  }

  return `<pre>${escapeHtml(lines.join("\n"))}</pre>`;
}

function renderChallengeSummary(challengeReport: ChallengeEvaluation | null) {
  if (!challengeReport) {
    return "<p class=\"muted\">No challenge evaluation was attached to this report.</p>";
  }

  return `
    <div class="callout ${challengeReport.passed ? "success" : "warning"}">
      <strong>${escapeHtml(challengeReport.challengeId)}</strong>
      <p>${escapeHtml(challengeReport.summary)}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>Check</th>
          <th>Status</th>
          <th>Detail</th>
        </tr>
      </thead>
      <tbody>
        ${challengeReport.checks
          .map(
            (check) => `
              <tr>
                <td>${escapeHtml(check.label)}</td>
                <td>${check.passed ? "Passed" : "Failed"}</td>
                <td>${escapeHtml(check.detail)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

export function buildDiamondReportHtml(payload: ReportExportPayload) {
  const tokens = payload.result?.tokens ?? [];
  const symbols = payload.result?.symbolTable ?? [];
  const rawTac = payload.result?.rawTac ?? [];
  const tac = payload.result?.tac ?? [];
  const assembly = payload.result?.assembly ?? null;
  const diagnostics = payload.result?.errors ?? [];
  const optimizations = payload.result?.optimizations ?? null;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Diamond IDE Report</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #10243f;
        --muted: #51627d;
        --bg: #eef3fb;
        --surface: #ffffff;
        --accent: #d97706;
        --accent-soft: #fff3e2;
        --border: #d7e3f4;
        --success: #0f766e;
        --success-soft: #dbf4ef;
        --warning: #9a3412;
        --warning-soft: #ffedd5;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 32px;
        font-family: "Segoe UI", "Trebuchet MS", sans-serif;
        background: linear-gradient(180deg, #f6f9ff 0%, var(--bg) 100%);
        color: var(--ink);
      }

      main {
        max-width: 1180px;
        margin: 0 auto;
      }

      h1, h2, h3 {
        margin: 0;
      }

      .hero {
        padding: 24px 28px;
        border-radius: 24px;
        background:
          radial-gradient(circle at top left, rgba(217, 119, 6, 0.18), transparent 38%),
          radial-gradient(circle at top right, rgba(14, 165, 233, 0.16), transparent 34%),
          var(--surface);
        border: 1px solid var(--border);
        box-shadow: 0 18px 50px rgba(15, 23, 42, 0.08);
      }

      .hero p {
        margin: 12px 0 0;
        color: var(--muted);
        line-height: 1.65;
      }

      .grid {
        display: grid;
        gap: 20px;
        margin-top: 20px;
      }

      .grid.two {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      }

      .card {
        border-radius: 22px;
        border: 1px solid var(--border);
        background: var(--surface);
        padding: 22px;
        box-shadow: 0 16px 40px rgba(15, 23, 42, 0.06);
      }

      .eyebrow {
        margin-bottom: 8px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent);
      }

      .muted {
        color: var(--muted);
      }

      pre {
        margin: 0;
        padding: 16px;
        overflow: auto;
        border-radius: 18px;
        background: #0d1a2b;
        color: #e5edf9;
        font-size: 13px;
        line-height: 1.6;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 12px;
      }

      th, td {
        padding: 10px 12px;
        border-bottom: 1px solid var(--border);
        vertical-align: top;
        text-align: left;
        font-size: 14px;
      }

      th {
        color: var(--muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.14em;
        text-transform: uppercase;
      }

      .callout {
        margin-top: 12px;
        padding: 14px 16px;
        border-radius: 18px;
      }

      .callout p {
        margin: 8px 0 0;
        line-height: 1.6;
      }

      .callout.success {
        background: var(--success-soft);
        color: var(--success);
      }

      .callout.warning {
        background: var(--warning-soft);
        color: var(--warning);
      }

      @media print {
        body {
          padding: 0;
          background: #fff;
        }

        .hero,
        .card {
          box-shadow: none;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="eyebrow">Diamond IDE Report</div>
        <h1>Compilation snapshot</h1>
        <p>Generated on ${escapeHtml(payload.generatedAt)}. This report captures the editor source, diagnostics, compiler artifacts, runtime output, and challenge status that were visible in the IDE at export time.</p>
      </section>

      <section class="grid two">
        <article class="card">
          <div class="eyebrow">Summary</div>
          <table>
            <tbody>
              ${renderKeyValueTable([
                ["Success", payload.result?.success ? "yes" : "no"],
                ["Engine", payload.result?.meta?.mode ?? "unknown"],
                ["Errors", payload.result?.meta?.errorCount ?? payload.result?.errors.length ?? 0],
                ["Symbols", payload.result?.meta?.symbolCount ?? payload.result?.symbolTable.length ?? 0],
                ["Tokens", payload.result?.meta?.tokenCount ?? payload.result?.tokens.length ?? 0],
                ["Raw TAC", payload.result?.meta?.rawTacCount ?? rawTac.length],
                ["Optimized TAC", payload.result?.meta?.tacCount ?? tac.length],
                ["Execution status", payload.executionStatus]
              ])}
            </tbody>
          </table>
        </article>

        <article class="card">
          <div class="eyebrow">Compiler Report</div>
          <p>${escapeHtml(payload.result?.output ?? "No compiler output was available.")}</p>
          ${
            payload.runtimeError
              ? `<div class="callout warning"><strong>Runtime error</strong><p>${escapeHtml(payload.runtimeError)}</p></div>`
              : ""
          }
        </article>
      </section>

      <section class="grid">
        <article class="card">
          <div class="eyebrow">Source Code</div>
          ${renderTextLines([payload.code])}
        </article>

        <article class="card">
          <div class="eyebrow">Program Input</div>
          ${renderTextLines([payload.stdinText || "[no input provided]"])}
        </article>

        <article class="card">
          <div class="eyebrow">Console Output</div>
          ${renderTextLines(payload.consoleLines.length > 0 ? payload.consoleLines : ["[no console output]"])}
        </article>

        <article class="card">
          <div class="eyebrow">Challenge Evaluation</div>
          ${renderChallengeSummary(payload.challengeReport)}
        </article>

        <article class="card">
          <div class="eyebrow">Diagnostics</div>
          ${
            diagnostics.length === 0
              ? `<p class="muted">No diagnostics were reported.</p>`
              : `
                <table>
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Line</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${diagnostics
                      .map(
                        (error) => `
                          <tr>
                            <td>${escapeHtml(error.type)}</td>
                            <td>${escapeHtml(String(error.line ?? "-"))}</td>
                            <td>${escapeHtml(error.message)}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              `
          }
        </article>

        <article class="card">
          <div class="eyebrow">Tokens</div>
          ${
            tokens.length === 0
              ? `<p class="muted">No tokens were captured.</p>`
              : `
                <table>
                  <thead>
                    <tr>
                      <th>Line</th>
                      <th>Token</th>
                      <th>Lexeme</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tokens
                      .map(
                        (token) => `
                          <tr>
                            <td>${token.line}</td>
                            <td>${escapeHtml(token.type)}</td>
                            <td>${escapeHtml(token.lexeme ?? "-")}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              `
          }
        </article>

        <article class="card">
          <div class="eyebrow">Symbol Table</div>
          ${
            symbols.length === 0
              ? `<p class="muted">No symbols were reported.</p>`
              : `
                <table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Kind</th>
                      <th>Type</th>
                      <th>Scope</th>
                      <th>Line</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${symbols
                      .map(
                        (symbol) => `
                          <tr>
                            <td>${escapeHtml(symbol.name)}</td>
                            <td>${escapeHtml(symbol.kind)}</td>
                            <td>${escapeHtml(symbol.type)}</td>
                            <td>${symbol.scope}</td>
                            <td>${symbol.line}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              `
          }
        </article>

        <article class="card">
          <div class="eyebrow">Three-Address Code</div>
          ${
            tac.length === 0
              ? `<p class="muted">No TAC instructions were reported.</p>`
              : `
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Op</th>
                      <th>Arg1</th>
                      <th>Arg2</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tac
                      .map(
                        (instruction) => `
                          <tr>
                            <td>${instruction.index}</td>
                            <td>${escapeHtml(instruction.op ?? "-")}</td>
                            <td>${escapeHtml(instruction.arg1 ?? "-")}</td>
                            <td>${escapeHtml(instruction.arg2 ?? "-")}</td>
                            <td>${escapeHtml(instruction.result ?? "-")}</td>
                          </tr>
                        `
                      )
                      .join("")}
                  </tbody>
                </table>
              `
          }
        </article>

        <article class="card">
          <div class="eyebrow">IR and Code Generation</div>
          ${
            rawTac.length === 0 && tac.length === 0 && !assembly
              ? `<p class="muted">No IR or code generation artifacts were available.</p>`
              : `
                <table>
                  <tbody>
                    ${renderKeyValueTable([
                      ["Raw TAC instructions", payload.result?.meta?.rawTacCount ?? rawTac.length],
                      ["Optimized TAC instructions", payload.result?.meta?.tacCount ?? tac.length],
                      ["Instruction savings", Math.max((payload.result?.meta?.rawTacCount ?? rawTac.length) - (payload.result?.meta?.tacCount ?? tac.length), 0)],
                      ["Assembly target", assembly ? "Educational pseudo-assembly" : "Not generated"]
                    ])}
                  </tbody>
                </table>
                ${
                  optimizations
                    ? `
                      <table>
                        <thead>
                          <tr>
                            <th>Optimization</th>
                            <th>Count</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${[
                            ["Constant folds", optimizations.constantFolds],
                            ["Strength reductions", optimizations.strengthReductions],
                            ["Common subexpressions", optimizations.commonSubexpressions],
                            ["Dead code eliminated", optimizations.deadCodeEliminated],
                            ["Unreachable removed", optimizations.unreachableRemoved]
                          ]
                            .map(
                              ([label, value]) => `
                                <tr>
                                  <td>${escapeHtml(String(label))}</td>
                                  <td>${escapeHtml(String(value))}</td>
                                </tr>
                              `
                            )
                            .join("")}
                        </tbody>
                      </table>
                    `
                    : ""
                }
                ${
                  assembly
                    ? `
                      <div style="margin-top: 16px;">
                        <div class="muted" style="margin-bottom: 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;">
                          Pseudo-Assembly Listing
                        </div>
                        <pre>${escapeHtml(assembly)}</pre>
                      </div>
                    `
                    : ""
                }
              `
          }
        </article>
      </section>
    </main>
  </body>
</html>`;
}

export function downloadDiamondReportHtml(payload: ReportExportPayload) {
  downloadTextFile(buildDiamondReportHtml(payload), "diamond-report.html", "text/html;charset=utf-8");
}

export function printDiamondReportPdf(payload: ReportExportPayload) {
  if (typeof window === "undefined") {
    return;
  }

  const popup = window.open("", "_blank", "noopener,noreferrer,width=1280,height=900");
  if (!popup) {
    downloadDiamondReportHtml(payload);
    return;
  }

  popup.document.open();
  popup.document.write(buildDiamondReportHtml(payload));
  popup.document.close();
  popup.focus();
  popup.addEventListener("load", () => popup.print(), { once: true });
}
