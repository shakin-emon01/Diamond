export type DiamondSuiteCase = {
  id: string;
  title: string;
  category: "Syntax" | "Control Flow" | "Arrays" | "Functions" | "Diagnostics";
  source: string;
  stdin: string;
  expectedSuccess: boolean;
  expectedLines?: string[];
};

export type DiamondSuiteCaseResult = {
  caseId: string;
  title: string;
  category: DiamondSuiteCase["category"];
  passed: boolean;
  summary: string;
  expectedLines: string[];
  actualLines: string[];
  errorCount: number;
};

export const DIAMOND_TEST_SUITE: DiamondSuiteCase[] = [
  {
    id: "hello-world",
    title: "Hello world prints a string",
    category: "Syntax",
    stdin: "",
    expectedSuccess: true,
    expectedLines: ["Hello Diamond"],
    source: `shuru

dekhao("Hello Diamond");

shesh
`
  },
  {
    id: "conditional-pass",
    title: "Conditional branch selects pass",
    category: "Control Flow",
    stdin: "80",
    expectedSuccess: true,
    expectedLines: ["Pass"],
    source: `shuru

dhoro shonkha marks;
nao(marks);

jodi (marks >= 40) {
    dekhao("Pass");
} naile {
    dekhao("Fail");
}

shesh
`
  },
  {
    id: "loop-total",
    title: "While loop computes a running total",
    category: "Control Flow",
    stdin: "4",
    expectedSuccess: true,
    expectedLines: ["10"],
    source: `shuru

dhoro shonkha n;
dhoro shonkha i;
dhoro shonkha total;

nao(n);
i = 1;
total = 0;

jotokhon (i <= n) {
    total = total + i;
    i = i + 1;
}

dekhao(total);

shesh
`
  },
  {
    id: "array-total",
    title: "Array indexes accumulate into total",
    category: "Arrays",
    stdin: "2\n4\n6",
    expectedSuccess: true,
    expectedLines: ["12"],
    source: `shuru

dhoro shonkha i;
dhoro shonkha total;
dhoro shonkha nums[3];

total = 0;

ghurao (i = 0; i < 3; i = i + 1) {
    nao(nums[i]);
    total = total + nums[i];
}

dekhao(total);

shesh
`
  },
  {
    id: "function-call",
    title: "Function call returns a computed value",
    category: "Functions",
    stdin: "",
    expectedSuccess: true,
    expectedLines: ["13"],
    source: `kaj jog(a, b) {
    ferot a + b;
}

shuru

dekhao(jog(6, 7));

shesh
`
  },
  {
    id: "invalid-source-syntax",
    title: "Syntax error: Missing semicolon",
    category: "Diagnostics",
    stdin: "",
    expectedSuccess: false,
    source: `shuru\n\ndhoro shonkha x\ndekhao(x);\n\nshesh\n`
  },
  {
    id: "invalid-source-lexical",
    title: "Lexical error: Unrecognized character",
    category: "Diagnostics",
    stdin: "",
    expectedSuccess: false,
    source: `shuru\n\ndhoro shonkha x;\nx = 5 @ 3;\ndekhao(x);\n\nshesh\n`
  },
  {
    id: "invalid-source-semantic",
    title: "Semantic error: Type mismatch",
    category: "Diagnostics",
    stdin: "",
    expectedSuccess: false,
    source: `shuru\n\ndhoro shonkha x;\nx = "Hello";\ndekhao(x);\n\nshesh\n`
  }
];
