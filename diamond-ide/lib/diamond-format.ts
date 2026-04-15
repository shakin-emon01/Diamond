const INDENT = "    ";
const ALIGNMENT_BLACKLIST = /^(jodi|jotokhon|ghurao|kaj|ferot|dekhao|nao|shuru|shesh|})\b/;

function splitInlineComment(line: string) {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < line.length - 1; index += 1) {
    const current = line[index];
    const next = line[index + 1];

    if (current === "\\" && inString && !escaped) {
      escaped = true;
      continue;
    }

    if (current === '"' && !escaped) {
      inString = !inString;
    }

    if (!inString && current === "/" && next === "/") {
      return {
        code: line.slice(0, index),
        comment: line.slice(index)
      };
    }

    escaped = false;
  }

  return { code: line, comment: "" };
}

function formatNonStringSegment(segment: string) {
  return segment
    .replace(/\s+/g, " ")
    .replace(/\s*(<=|>=|==|!=|=|<|>|\+|-|\*|\/)\s*/g, " $1 ")
    .replace(/(^|[(\[=,:;+\-*/<>])\s*-\s*(?=[A-Za-z_0-9(])/g, "$1-")
    .replace(/\(\s+/g, "(")
    .replace(/\s+\)/g, ")")
    .replace(/\[\s+/g, "[")
    .replace(/\s+\]/g, "]")
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s*;\s*/g, "; ")
    .replace(/\b(jodi|jotokhon|ghurao)\(/g, "$1 (")
    .replace(/\)\s*\{/g, ") {")
    .replace(/\bnaile\s*\{/g, "naile {")
    .replace(/\bshuru\b/g, "shuru")
    .replace(/\bshesh\b/g, "shesh")
    .replace(/\s+\{/g, " {")
    .replace(/\{\s+/g, "{")
    .trim();
}

function normalizeCodeSpacing(code: string) {
  const parts: string[] = [];
  let buffer = "";
  let inString = false;
  let escaped = false;

  for (const char of code) {
    buffer += char;

    if (char === "\\" && inString && !escaped) {
      escaped = true;
      continue;
    }

    if (char === '"' && !escaped) {
      inString = !inString;

      if (!inString) {
        parts.push(buffer);
        buffer = "";
      } else if (buffer.length > 1) {
        const prefix = buffer.slice(0, -1);
        parts.push(prefix);
        buffer = '"';
      }
    }

    if (!inString) {
      escaped = false;
    } else if (escaped && char !== "\\") {
      escaped = false;
    }
  }

  if (buffer) {
    parts.push(buffer);
  }

  return parts
    .map((part) => (part.startsWith('"') ? part : formatNonStringSegment(part)))
    .join("")
    .replace(/(<=|>=|==|!=|=|<|>|\+|-|\*|\/)"/g, "$1 \"")
    .replace(/\s+([)\],;])/g, "$1")
    .replace(/([([{])\s+/g, "$1")
    .replace(/\s+([+\-*/<>=])/g, " $1")
    .replace(/([+\-*/<>=])\s+/g, "$1 ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function countBraceDelta(code: string) {
  const sanitized = code.replace(/"([^"\\]|\\.)*"/g, "\"\"");
  const opens = (sanitized.match(/{/g) ?? []).length;
  const closes = (sanitized.match(/}/g) ?? []).length;

  return { opens, closes };
}

function isAlignableLine(line: string) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("//") || ALIGNMENT_BLACKLIST.test(trimmed)) {
    return false;
  }

  return findAssignmentIndex(trimmed) >= 0;
}

function findAssignmentIndex(line: string) {
  let inString = false;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const current = line[index];
    const previous = line[index - 1];
    const next = line[index + 1];

    if (current === "\\" && inString && !escaped) {
      escaped = true;
      continue;
    }

    if (current === '"' && !escaped) {
      inString = !inString;
    }

    if (!inString && current === "=" && previous !== "=" && previous !== "!" && previous !== "<" && previous !== ">" && next !== "=") {
      return index;
    }

    escaped = false;
  }

  return -1;
}

function alignAssignmentGroups(lines: string[]) {
  const result = [...lines];
  let index = 0;

  while (index < result.length) {
    if (!isAlignableLine(result[index])) {
      index += 1;
      continue;
    }

    const start = index;
    const indentWidth = result[index].match(/^\s*/)?.[0].length ?? 0;

    while (
      index < result.length &&
      isAlignableLine(result[index]) &&
      (result[index].match(/^\s*/)?.[0].length ?? 0) === indentWidth
    ) {
      index += 1;
    }

    const group = result.slice(start, index);
    if (group.length <= 1) {
      continue;
    }

    const targetIndex = Math.max(...group.map((line) => findAssignmentIndex(line)));
    group.forEach((line, groupIndex) => {
      const assignmentIndex = findAssignmentIndex(line);
      if (assignmentIndex < 0) {
        return;
      }

      const padding = " ".repeat(Math.max(targetIndex - assignmentIndex, 0));
      result[start + groupIndex] = `${line.slice(0, assignmentIndex)}${padding}${line.slice(assignmentIndex)}`;
    });
  }

  return result;
}

export function formatDiamondCode(source: string) {
  const normalized = source.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const formatted: string[] = [];
  let depth = 0;
  let previousBlank = false;

  for (const rawLine of lines) {
    const { code, comment } = splitInlineComment(rawLine);
    const trimmedCode = normalizeCodeSpacing(code);
    const trimmedComment = comment.trim();

    if (!trimmedCode && !trimmedComment) {
      if (!previousBlank && formatted.length > 0) {
        formatted.push("");
      }
      previousBlank = true;
      continue;
    }

    const startsWithClose = trimmedCode.startsWith("}");
    if (startsWithClose) {
      depth = Math.max(depth - 1, 0);
    }

    const body = trimmedCode
      ? `${INDENT.repeat(depth)}${trimmedCode}`
      : `${INDENT.repeat(depth)}${trimmedComment}`;

    formatted.push(
      trimmedComment && trimmedCode
        ? `${body}  ${trimmedComment}`
        : trimmedComment && !trimmedCode
          ? `${INDENT.repeat(depth)}${trimmedComment}`
          : body
    );

    const { opens, closes } = countBraceDelta(trimmedCode);
    if (opens > closes) {
      depth += opens - closes;
    } else if (!startsWithClose && closes > opens) {
      depth = Math.max(depth - (closes - opens), 0);
    }

    previousBlank = false;
  }

  return alignAssignmentGroups(formatted).join("\n").replace(/\n{3,}/g, "\n\n").trimEnd();
}
