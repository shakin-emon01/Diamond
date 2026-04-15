import { runDiamondProgram } from "./diamond-runtime";
import type { DiamondAstNode, DiamondResult } from "./types";

type ChallengeTestcase = {
  id: string;
  label: string;
  stdin: string;
  expectedLines: string[];
};

type ChallengeRequirement = {
  label: string;
  nodeType: string;
};

export type DiamondChallenge = {
  id: string;
  title: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  description: string;
  hint: string;
  starterCode: string;
  requirements: ChallengeRequirement[];
  tests: ChallengeTestcase[];
  successMessage: string;
};

export type ChallengeCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

export type ChallengeEvaluation = {
  challengeId: string;
  passed: boolean;
  checks: ChallengeCheck[];
  summary: string;
};

function walkAst(node: DiamondAstNode | null, visit: (current: DiamondAstNode) => void) {
  if (!node) {
    return;
  }

  visit(node);
  node.children.forEach((child) => walkAst(child, visit));
}

function hasNodeType(ast: DiamondAstNode | null, type: string) {
  let found = false;

  walkAst(ast, (node) => {
    if (node.type === type) {
      found = true;
    }
  });

  return found;
}

function normalizeLines(lines: string[]) {
  const normalized = lines.map((line) => line.trimEnd());

  while (normalized.length > 0 && normalized[normalized.length - 1] === "") {
    normalized.pop();
  }

  return normalized;
}

function formatLines(lines: string[]) {
  return lines.length > 0 ? lines.join(" | ") : "[no output]";
}

export const DIAMOND_CHALLENGES: DiamondChallenge[] = [
  {
    id: "count-with-for",
    title: "Challenge 1: Count with ghurao",
    difficulty: "Beginner",
    description: "Write a `ghurao` loop that prints the numbers 1 through 10, one number per line.",
    hint: "Use a loop variable, start at 1, stop at 10, and print inside the loop body.",
    starterCode: `shuru

dhoro shonkha i;

// 1 theke 10 porjonto print koro

shesh
`,
    requirements: [
      {
        label: "Use a ghurao loop",
        nodeType: "FOR"
      }
    ],
    tests: [
      {
        id: "for-output",
        label: "Prints 1 to 10",
        stdin: "",
        expectedLines: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
      }
    ],
    successMessage: "Loop logic is correct. ghurao challenge passed."
  },
  {
    id: "grade-checker",
    title: "Challenge 2: Grade Checker",
    difficulty: "Beginner",
    description:
      "Read a number with `nao()`. If the mark is 40 or more, print `Pass`; otherwise print `Fail`.",
    hint: "You need both `nao()` and `jodi` for this one.",
    starterCode: `shuru

dhoro shonkha marks;

// marks nao() diye poro, tarpor Pass ba Fail print koro

shesh
`,
    requirements: [
      {
        label: "Read input with nao()",
        nodeType: "INPUT"
      },
      {
        label: "Use a jodi decision",
        nodeType: "IF"
      }
    ],
    tests: [
      {
        id: "grade-pass",
        label: "75 should pass",
        stdin: "75",
        expectedLines: ["Pass"]
      },
      {
        id: "grade-fail",
        label: "20 should fail",
        stdin: "20",
        expectedLines: ["Fail"]
      }
    ],
    successMessage: "Branching logic is correct. Grade checker passed."
  },
  {
    id: "sum-with-while",
    title: "Challenge 3: Sum with jotokhon",
    difficulty: "Intermediate",
    description: "Read a number `n` and print the sum of 1 through `n` using a `jotokhon` loop.",
    hint: "Keep two variables: one counter and one running total.",
    starterCode: `shuru

dhoro shonkha n;
dhoro shonkha i;
dhoro shonkha total;

// n input nao, jotokhon diye 1..n er sum ber koro

shesh
`,
    requirements: [
      {
        label: "Read input with nao()",
        nodeType: "INPUT"
      },
      {
        label: "Use a jotokhon loop",
        nodeType: "WHILE"
      }
    ],
    tests: [
      {
        id: "sum-five",
        label: "5 should output 15",
        stdin: "5",
        expectedLines: ["15"]
      },
      {
        id: "sum-three",
        label: "3 should output 6",
        stdin: "3",
        expectedLines: ["6"]
      }
    ],
    successMessage: "Your while-loop algorithm works across the hidden tests."
  },
  {
    id: "array-totalizer",
    title: "Challenge 4: Array Totalizer",
    difficulty: "Intermediate",
    description:
      "Read four numbers into an array and print their total using `ghurao` and indexed assignment.",
    hint: "Use `nums[i]` for both input and summing, and keep a `total` variable outside the loop.",
    starterCode: `shuru

dhoro shonkha i;
dhoro shonkha total;
dhoro shonkha nums[4];

total = 0;

// 4 ta value nums array te nao, tarpor total print koro

shesh
`,
    requirements: [
      {
        label: "Use an array",
        nodeType: "ARRAY_REF"
      },
      {
        label: "Read indexed input",
        nodeType: "INPUT"
      },
      {
        label: "Use a ghurao loop",
        nodeType: "FOR"
      }
    ],
    tests: [
      {
        id: "array-sum-a",
        label: "1 2 3 4 -> 10",
        stdin: "1\n2\n3\n4",
        expectedLines: ["10"]
      },
      {
        id: "array-sum-b",
        label: "5 10 0 7 -> 22",
        stdin: "5\n10\n0\n7",
        expectedLines: ["22"]
      }
    ],
    successMessage: "Great work. You used arrays and loops together successfully."
  },
  {
    id: "function-summer",
    title: "Challenge 5: Build a Function",
    difficulty: "Intermediate",
    description:
      "Create a function `jog(a, b)` that returns the sum of two numbers, then read two values and print the result.",
    hint: "The function should use `ferot`, and the main block should call it after reading input.",
    starterCode: `kaj jog(a, b) {
    // ekhane sum return koro
}

shuru

dhoro shonkha left;
dhoro shonkha right;
dhoro shonkha result;

// dui ta number nao, jog() call koro, tarpor result print koro

shesh
`,
    requirements: [
      {
        label: "Declare a function",
        nodeType: "FUNCTION_DECL"
      },
      {
        label: "Use ferot",
        nodeType: "RETURN"
      },
      {
        label: "Read input with nao()",
        nodeType: "INPUT"
      }
    ],
    tests: [
      {
        id: "function-sum-a",
        label: "5 + 8 -> 13",
        stdin: "5\n8",
        expectedLines: ["13"]
      },
      {
        id: "function-sum-b",
        label: "11 + 2 -> 13",
        stdin: "11\n2",
        expectedLines: ["13"]
      }
    ],
    successMessage: "The function compiled, returned a value, and passed the hidden tests."
  },
  {
    id: "promotion-checker",
    title: "Challenge 6: Promotion Checker",
    difficulty: "Advanced",
    description:
      "Read `marks` and `attendance`. Print `Scholarship` if marks >= 85 and attendance >= 90, `Pass` if marks >= 40, otherwise `Probation`.",
    hint: "This one is about nested decisions or careful ordering of `jodi` / `naile` blocks.",
    starterCode: `shuru

dhoro shonkha marks;
dhoro shonkha attendance;

// marks ebong attendance nao, tarpor Scholarship / Pass / Probation print koro

shesh
`,
    requirements: [
      {
        label: "Read two inputs",
        nodeType: "INPUT"
      },
      {
        label: "Use conditional branches",
        nodeType: "IF"
      }
    ],
    tests: [
      {
        id: "promotion-a",
        label: "88 & 95 -> Scholarship",
        stdin: "88\n95",
        expectedLines: ["Scholarship"]
      },
      {
        id: "promotion-b",
        label: "60 & 50 -> Pass",
        stdin: "60\n50",
        expectedLines: ["Pass"]
      },
      {
        id: "promotion-c",
        label: "20 & 90 -> Probation",
        stdin: "20\n90",
        expectedLines: ["Probation"]
      }
    ],
    successMessage: "Excellent. Your boolean decision tree holds up across multiple cases."
  },
  {
    id: "string-banner",
    title: "Challenge 7: String Banner",
    difficulty: "Advanced",
    description:
      "Create a function that reads a name and prints `Hello <name>` using the builtin `jora()` function.",
    hint: "Use a helper function with `ferot`, then print the returned string in `shuru`.",
    starterCode: `kaj banner(name) {
    // jora() diye greeting return koro
}

shuru

dhoro lekha name;
dhoro lekha greeting;

// name input nao, banner() call koro, tarpor greeting print koro

shesh
`,
    requirements: [
      {
        label: "Declare a function",
        nodeType: "FUNCTION_DECL"
      },
      {
        label: "Use ferot",
        nodeType: "RETURN"
      },
      {
        label: "Read string input",
        nodeType: "INPUT"
      }
    ],
    tests: [
      {
        id: "string-banner-a",
        label: "Rahim -> Hello Rahim",
        stdin: "Rahim",
        expectedLines: ["Hello Rahim"]
      },
      {
        id: "string-banner-b",
        label: "Diamond -> Hello Diamond",
        stdin: "Diamond",
        expectedLines: ["Hello Diamond"]
      }
    ],
    successMessage: "Nicely done. The function and string composition both worked."
  }
];

export function evaluateDiamondChallenge(
  challenge: DiamondChallenge,
  compiledResult: DiamondResult
): ChallengeEvaluation {
  const checks: ChallengeCheck[] = [];

  if (!compiledResult.success || compiledResult.errors.length > 0) {
    checks.push({
      label: "Compilation",
      passed: false,
      detail: "Fix all compiler diagnostics before the hidden tests can run."
    });

    return {
      challengeId: challenge.id,
      passed: false,
      checks,
      summary: "Compilation failed, so the challenge tests did not run."
    };
  }

  if (!compiledResult.ast) {
    checks.push({
      label: "AST availability",
      passed: false,
      detail: "The compiler did not return an AST for challenge validation."
    });

    return {
      challengeId: challenge.id,
      passed: false,
      checks,
      summary: "Challenge validation could not start because the AST is missing."
    };
  }

  checks.push({
    label: "Compilation",
    passed: true,
    detail: "The program compiled without syntax or semantic errors."
  });

  challenge.requirements.forEach((requirement) => {
    const passed = hasNodeType(compiledResult.ast, requirement.nodeType);

    checks.push({
      label: requirement.label,
      passed,
      detail: passed
        ? `${requirement.nodeType} detected in the program AST.`
        : `${requirement.nodeType} was not detected in the program AST.`
    });
  });

  challenge.tests.forEach((test) => {
    const runtime = runDiamondProgram(compiledResult.ast, { stdin: test.stdin });

    if (runtime.error) {
      checks.push({
        label: test.label,
        passed: false,
        detail: runtime.error
      });
      return;
    }

    const actual = normalizeLines(runtime.lines);
    const expected = normalizeLines(test.expectedLines);
    const passed = actual.join("\n") === expected.join("\n");

    checks.push({
      label: test.label,
      passed,
      detail: passed
        ? `Output matched: ${formatLines(actual)}`
        : `Expected ${formatLines(expected)}, got ${formatLines(actual)}`
    });
  });

  const passed = checks.every((check) => check.passed);

  return {
    challengeId: challenge.id,
    passed,
    checks,
    summary: passed
      ? challenge.successMessage
      : "Some hidden checks failed. Inspect the test details and run the program again."
  };
}
