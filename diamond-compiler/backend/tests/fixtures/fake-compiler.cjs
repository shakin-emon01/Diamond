const fs = require("fs");

const sourcePath = process.argv[2];
const source = fs.readFileSync(sourcePath, "utf8");

if (source.includes("BROKEN_JSON")) {
  process.stdout.write("this-is-not-json");
  process.exit(0);
}

if (source.includes("FAIL_COMPILE")) {
  process.stdout.write(
    JSON.stringify({
      success: false,
      output: "Compilation failed.",
      errors: [
        {
          message: "Synthetic compiler failure",
          line: 2,
          type: "syntax"
        }
      ],
      tokens: [],
      ast: null,
      symbolTable: [],
      rawTac: [],
      tac: [],
      meta: {
        errorCount: 1,
        symbolCount: 0,
        tacCount: 0,
        tokenCount: 0
      }
    })
  );
  process.exit(1);
}

process.stdout.write(
  JSON.stringify({
    success: true,
    output: "Compilation succeeded.",
    errors: [],
    tokens: [
      {
        type: "SHURU",
        lexeme: "shuru",
        line: 1
      }
    ],
    ast: {
      type: "PROGRAM",
      text: "program",
      line: 1,
      valueType: "unknown",
      arraySize: -1,
      children: []
    },
    symbolTable: [],
    rawTac: [],
    tac: [],
    meta: {
      errorCount: 0,
      symbolCount: 0,
      tacCount: 0,
      tokenCount: 1
    }
  })
);
