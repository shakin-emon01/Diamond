import type { DiamondError } from "./types";

type RecordField = {
  name: string;
  typeName: string;
};

type RecordType = {
  name: string;
  fields: RecordField[];
};

export type DiamondPreprocessStats = {
  preprocessImports: number;
  preprocessRecordTypes: number;
  preprocessRecordVariables: number;
};

export type DiamondPreprocessResult = {
  code: string;
  errors: DiamondError[];
  stats: DiamondPreprocessStats;
};

const BUILTIN_TYPES = new Set(["shonkha", "doshomik", "lekha", "shotto", "khali", "auto"]);
const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function createStats(): DiamondPreprocessStats {
  return {
    preprocessImports: 0,
    preprocessRecordTypes: 0,
    preprocessRecordVariables: 0
  };
}

function pushError(errors: DiamondError[], line: number, message: string) {
  errors.push({ type: "preprocess", line, message });
}

function stripLineComment(line: string) {
  const commentIndex = line.indexOf("//");
  return commentIndex >= 0 ? line.slice(0, commentIndex) : line;
}

function parseDeclaration(trimmed: string) {
  const match = /^dhoro\s+([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)(.*)$/.exec(trimmed);
  if (!match) {
    return null;
  }

  return {
    typeName: match[1],
    varName: match[2],
    remainder: match[3] ?? ""
  };
}

function lookupRecord(records: Map<string, RecordType>, typeName: string) {
  return records.get(typeName);
}

function lookupScopedType(scopes: Array<Map<string, string | null>>, name: string) {
  for (let index = scopes.length - 1; index >= 0; index -= 1) {
    if (scopes[index].has(name)) {
      return scopes[index].get(name);
    }
  }

  return undefined;
}

function expandRecordDeclarations(
  records: Map<string, RecordType>,
  errors: DiamondError[],
  lineNumber: number,
  typeName: string,
  baseName: string,
  depth = 0
): string[] {
  const record = lookupRecord(records, typeName);
  if (!record) {
    pushError(errors, lineNumber, `Unknown record type '${typeName}'.`);
    return [];
  }

  if (depth > records.size + 2) {
    pushError(errors, lineNumber, "Cyclic record definitions are not supported.");
    return [];
  }

  return record.fields.flatMap((field) => {
    const flattenedName = `${baseName}__${field.name}`;
    if (lookupRecord(records, field.typeName)) {
      return expandRecordDeclarations(records, errors, lineNumber, field.typeName, flattenedName, depth + 1);
    }

    return [`dhoro ${field.typeName} ${flattenedName};`];
  });
}

function collectFunctionParamNames(
  trimmed: string,
  records: Map<string, RecordType>,
  errors: DiamondError[],
  lineNumber: number
) {
  const match = /^kaj\s+(.+?)\s*\((.*)\)\s*\{$/.exec(trimmed);
  if (!match) {
    return [] as string[];
  }

  const signatureTokens = match[1].trim().split(/\s+/).filter(Boolean);
  if (signatureTokens.length >= 2 && records.has(signatureTokens[0])) {
    pushError(errors, lineNumber, "Record return types are not supported yet.");
  }

  return match[2]
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .flatMap((segment) => {
      const tokens = segment.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) {
        return [];
      }

      if (tokens.length >= 2 && records.has(tokens[0])) {
        pushError(errors, lineNumber, "Record-typed function parameters are not supported yet.");
      }

      const name = tokens[tokens.length - 1];
      return IDENTIFIER_RE.test(name) ? [name] : [];
    });
}

function rewriteRecordAccesses(
  line: string,
  records: Map<string, RecordType>,
  scopes: Array<Map<string, string | null>>,
  errors: DiamondError[],
  lineNumber: number
) {
  let result = "";
  let index = 0;

  while (index < line.length) {
    if (line[index] === "/" && line[index + 1] === "/") {
      result += line.slice(index);
      break;
    }

    if (line[index] === '"') {
      const start = index;
      index += 1;
      while (index < line.length) {
        if (line[index] === '"' && line[index - 1] !== "\\") {
          index += 1;
          break;
        }
        index += 1;
      }
      result += line.slice(start, index);
      continue;
    }

    if (!/[A-Za-z_]/.test(line[index])) {
      result += line[index];
      index += 1;
      continue;
    }

    const identifierStart = index;
    index += 1;
    while (index < line.length && /[A-Za-z0-9_]/.test(line[index])) {
      index += 1;
    }

    const identifier = line.slice(identifierStart, index);
    const typeName = lookupScopedType(scopes, identifier);

    if (!typeName || line[index] !== ".") {
      result += identifier;
      continue;
    }

    let flattened = identifier;
    let currentType = typeName;
    let chainIndex = index;

    while (line[chainIndex] === ".") {
      chainIndex += 1;
      const fieldStart = chainIndex;

      if (!/[A-Za-z_]/.test(line[fieldStart] ?? "")) {
        pushError(errors, lineNumber, "Invalid record field access.");
        break;
      }

      while (chainIndex < line.length && /[A-Za-z0-9_]/.test(line[chainIndex])) {
        chainIndex += 1;
      }

      const fieldName = line.slice(fieldStart, chainIndex);
      const field = lookupRecord(records, currentType)?.fields.find((entry) => entry.name === fieldName);

      if (!field) {
        pushError(errors, lineNumber, `Unknown field '${fieldName}' on record '${currentType}'.`);
        break;
      }

      flattened += `__${fieldName}`;
      currentType = lookupRecord(records, field.typeName) ? field.typeName : "";

      if (line[chainIndex] === "." && !currentType) {
        pushError(errors, lineNumber, `Scalar field '${fieldName}' has no nested members.`);
        break;
      }
    }

    result += flattened;
    index = chainIndex;
  }

  return result;
}

function applyBraceTransitions(
  line: string,
  scopes: Array<Map<string, string | null>>,
  paramNames: string[]
) {
  let seededParams = false;

  for (let index = 0; index < line.length; index += 1) {
    if (line[index] === "/" && line[index + 1] === "/") {
      break;
    }

    if (line[index] === '"') {
      index += 1;
      while (index < line.length && !(line[index] === '"' && line[index - 1] !== "\\")) {
        index += 1;
      }
      continue;
    }

    if (line[index] === "{") {
      const nextScope = new Map<string, string | null>();
      if (!seededParams) {
        for (const name of paramNames) {
          nextScope.set(name, null);
        }
        seededParams = true;
      }
      scopes.push(nextScope);
    } else if (line[index] === "}" && scopes.length > 1) {
      scopes.pop();
    }
  }
}

export function preprocessDiamondSource(code: string): DiamondPreprocessResult {
  const source = code.replace(/}\s*naile/g, "}\nnaile");
  const lines = source.split(/\r?\n/);
  const strippedLines: string[] = [];
  const records = new Map<string, RecordType>();
  const errors: DiamondError[] = [];
  const stats = createStats();
  let currentRecord: RecordType | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const trimmed = stripLineComment(lines[index]).trim();

    if (!currentRecord) {
      const importMatch = /^amdani\s+"([^"]+)"\s*;?$/.exec(trimmed);
      const recordMatch = /^gothon\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{$/.exec(trimmed);

      if (importMatch) {
        stats.preprocessImports += 1;
        pushError(
          errors,
          lineNumber,
          "amdani imports are available in file-based native compilation, not in the browser/demo compiler."
        );
        strippedLines.push("");
        continue;
      }

      if (recordMatch) {
        currentRecord = { name: recordMatch[1], fields: [] };
        if (records.has(currentRecord.name)) {
          pushError(errors, lineNumber, `Record type '${currentRecord.name}' is already defined.`);
        } else {
          records.set(currentRecord.name, currentRecord);
          stats.preprocessRecordTypes += 1;
        }
        strippedLines.push("");
        continue;
      }

      strippedLines.push(lines[index]);
      continue;
    }

    if (trimmed.startsWith("}")) {
      currentRecord = null;
      strippedLines.push("");
      continue;
    }

    if (trimmed.length > 0) {
      const fieldMatch = /^([A-Za-z_][A-Za-z0-9_]*)\s+([A-Za-z_][A-Za-z0-9_]*)\s*;$/.exec(trimmed);
      if (!fieldMatch) {
        pushError(errors, lineNumber, "Invalid field declaration inside gothon block.");
      } else {
        currentRecord.fields.push({ typeName: fieldMatch[1], name: fieldMatch[2] });
      }
    }

    strippedLines.push("");
  }

  for (const record of records.values()) {
    if (record.fields.length === 0) {
      pushError(errors, 0, `Record type '${record.name}' must declare at least one field.`);
    }
    for (const field of record.fields) {
      if (!BUILTIN_TYPES.has(field.typeName) && !records.has(field.typeName)) {
        pushError(errors, 0, `Record field type '${field.typeName}' is not defined.`);
      }
    }
  }

  const scopes: Array<Map<string, string | null>> = [new Map()];
  const rewrittenLines = strippedLines.map((line, index) => {
    const lineNumber = index + 1;
    const trimmed = stripLineComment(line).trim();
    const paramNames = collectFunctionParamNames(trimmed, records, errors, lineNumber);
    const declaration = parseDeclaration(trimmed);

    let rewritten = line;
    if (declaration && records.has(declaration.typeName)) {
      if (declaration.remainder.trim() !== ";") {
        pushError(errors, lineNumber, "Record declarations currently support only 'dhoro Type name;'.");
        rewritten = "";
      } else {
        rewritten = expandRecordDeclarations(records, errors, lineNumber, declaration.typeName, declaration.varName).join("\n");
        scopes[scopes.length - 1]?.set(declaration.varName, declaration.typeName);
        stats.preprocessRecordVariables += 1;
      }
    } else {
      rewritten = rewriteRecordAccesses(line, records, scopes, errors, lineNumber);
      if (declaration) {
        scopes[scopes.length - 1]?.set(declaration.varName, null);
      }
    }

    applyBraceTransitions(line, scopes, paramNames);
    return rewritten;
  });

  return {
    code: rewrittenLines.join("\n"),
    errors,
    stats
  };
}
