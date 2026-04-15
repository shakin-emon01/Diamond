const KEYWORDS = [
  "shuru",
  "shesh",
  "dhoro",
  "shonkha",
  "doshomik",
  "lekha",
  "shotto",
  "khali",
  "auto",
  "mithya",
  "jodi",
  "naile",
  "jotokhon",
  "ghurao",
  "kaj",
  "ferot",
  "dekhao",
  "nao",
  "ebong",
  "ba",
  "na",
  "amdani",
  "gothon"
];

const SNIPPETS = [
  {
    label: "ghurao",
    detail: "For loop snippet",
    documentation: "Insert a full ghurao loop with init, condition, and step.",
    insertText: [
      "ghurao (${1:i = 0}; ${2:i < limit}; ${3:i = i + 1}) {",
      "\t${0}",
      "}"
    ].join("\n")
  },
  {
    label: "jotokhon",
    detail: "While loop snippet",
    documentation: "Insert a jotokhon loop skeleton.",
    insertText: [
      "jotokhon (${1:condition}) {",
      "\t${0}",
      "}"
    ].join("\n")
  },
  {
    label: "jodi",
    detail: "If / else snippet",
    documentation: "Insert a jodi block with an optional naile branch.",
    insertText: [
      "jodi (${1:condition}) {",
      "\t${2}",
      "} naile {",
      "\t${0}",
      "}"
    ].join("\n")
  },
  {
    label: "dhoro",
    detail: "Declaration snippet",
    documentation: "Insert a typed variable declaration.",
    insertText: "dhoro ${1|shonkha,doshomik,lekha,shotto|} ${2:name};"
  },
  {
    label: "kaj",
    detail: "Function snippet",
    documentation: "Insert a Diamond function with a return statement.",
    insertText: [
      "kaj ${1:name}(${2:param}) {",
      "\t${3}",
      "\tferot ${0:0};",
      "}"
    ].join("\n")
  },
  {
    label: "gothon",
    detail: "Record type snippet",
    documentation: "Insert a user-defined composite record type.",
    insertText: [
      "gothon ${1:RecordName} {",
      "\t${2:shonkha value};",
      "}",
      "",
      "dhoro ${1:RecordName} ${0:item};"
    ].join("\n")
  },
  {
    label: "dekhao",
    detail: "Print snippet",
    documentation: "Insert a print statement.",
    insertText: "dekhao(${1:value});"
  },
  {
    label: "nao",
    detail: "Input snippet",
    documentation: "Insert an input statement.",
    insertText: "nao(${1:variable});"
  },
  {
    label: "program",
    detail: "Program skeleton",
    documentation: "Insert the basic shuru/shesh structure.",
    insertText: [
      "shuru",
      "",
      "\t${0}",
      "",
      "shesh"
    ].join("\n")
  }
];

let configured = false;

export function getDiamondEditorTheme(mode: "dark" | "light") {
  return mode === "light" ? "diamond-day" : "diamond-night";
}

export function configureDiamondMonaco(monaco: any) {
  if (configured) {
    return;
  }

  monaco.languages.register({ id: "diamond" });
  monaco.languages.setLanguageConfiguration("diamond", {
    comments: {
      lineComment: "//",
      blockComment: ["/*", "*/"]
    },
    brackets: [
      ["{", "}"],
      ["[", "]"],
      ["(", ")"]
    ],
    autoClosingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' }
    ],
    surroundingPairs: [
      { open: "{", close: "}" },
      { open: "[", close: "]" },
      { open: "(", close: ")" },
      { open: '"', close: '"' }
    ]
  });

  monaco.languages.registerCompletionItemProvider("diamond", {
    triggerCharacters: [...new Set(KEYWORDS.map((keyword) => keyword[0]))],
    provideCompletionItems(model: any, position: any) {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      return {
        suggestions: [
          ...SNIPPETS.map((snippet, index) => ({
            label: snippet.label,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: snippet.insertText,
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            detail: snippet.detail,
            documentation: snippet.documentation,
            range,
            sortText: `0${index}`
          })),
          ...KEYWORDS.map((keyword, index) => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            detail: "Diamond keyword",
            documentation: `Insert the Diamond keyword \`${keyword}\`.`,
            range,
            sortText: `1${index}`
          }))
        ]
      };
    }
  });

  monaco.languages.setMonarchTokensProvider("diamond", {
    keywords: KEYWORDS,
    operators: ["+", "-", "*", "/", "=", "<", ">", "<=", ">=", "==", "!="],
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/"([^"\\]|\\.)*$/, "string.invalid"],
        [/"([^"\\]|\\.)*"/, "string"],
        [/\d+\.\d+/, "number.float"],
        [/\d+/, "number"],
        [/[A-Za-z_][A-Za-z0-9_]*/, {
          cases: {
            "@keywords": "keyword",
            "@default": "identifier"
          }
        }],
        [/[{}()[\]]/, "@brackets"],
        [/[;,.]/, "delimiter"],
        [/(<=|>=|==|!=|=|<|>|\+|-|\*|\/)/, "operator"]
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/./, "comment"]
      ]
    }
  });

  monaco.editor.defineTheme("diamond-night", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "ff7ab6", fontStyle: "bold" },
      { token: "identifier", foreground: "e8e5ff" },
      { token: "number", foreground: "66d9cc" },
      { token: "number.float", foreground: "66d9cc" },
      { token: "string", foreground: "be99ff" },
      { token: "comment", foreground: "817ba7", fontStyle: "italic" },
      { token: "operator", foreground: "d7d1ff" }
    ],
    colors: {
      "editor.background": "#05050b",
      "editorLineNumber.foreground": "#4e4875",
      "editorLineNumber.activeForeground": "#c9c5ef",
      "editorCursor.foreground": "#be99ff",
      "editorIndentGuide.background1": "#171730",
      "editor.selectionBackground": "#be99ff22"
    }
  });

  monaco.editor.defineTheme("diamond-day", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "keyword", foreground: "7B38E0", fontStyle: "bold" },
      { token: "identifier", foreground: "1F2E6B" },
      { token: "number", foreground: "006D66" },
      { token: "number.float", foreground: "006D66" },
      { token: "string", foreground: "4B57C5" },
      { token: "comment", foreground: "6B6590", fontStyle: "italic" },
      { token: "operator", foreground: "352D5B" }
    ],
    colors: {
      "editor.background": "#fcfbff",
      "editor.foreground": "#1f1b43",
      "editorLineNumber.foreground": "#8f88b7",
      "editorLineNumber.activeForeground": "#1f2e6b",
      "editorCursor.foreground": "#7b38e0",
      "editorIndentGuide.background1": "#d8d1fb",
      "editor.selectionBackground": "#7b38e022"
    }
  });

  configured = true;
}
