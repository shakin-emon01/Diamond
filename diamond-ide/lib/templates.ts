export type DiamondTemplate = {
  id: string;
  label: string;
  description: string;
  code: string;
};

export const DIAMOND_TEMPLATES: DiamondTemplate[] = [
  {
    id: "hello-world",
    label: "Hello World",
    description: "Minimal program with a declaration and print statement.",
    code: `shuru

dhoro lekha message;
message = "Hello Diamond";
dekhao(message);

shesh
`
  },
  {
    id: "branching",
    label: "If Else",
    description: "Boolean logic, comparisons, and conditional branches.",
    code: `shuru

dhoro shonkha marks;
dhoro shotto passed;

marks = 82;
passed = marks >= 40;

jodi (passed ebong marks > 79) {
    dekhao("Distinction");
} naile {
    dekhao("Keep practicing");
}

shesh
`
  },
  {
    id: "simple-print",
    label: "Simple Print",
    description: "Smallest possible output example for getting started.",
    code: `shuru

dekhao("Welcome to Diamond");

shesh
`
  },
  {
    id: "sum-two",
    label: "Add Two Numbers",
    description: "Reads two numbers and prints their sum.",
    code: `shuru

dhoro shonkha a;
dhoro shonkha b;

nao(a);
nao(b);

dekhao("Sum:");
dekhao(a + b);

shesh
`
  },
  {
    id: "even-odd",
    label: "Even Or Odd",
    description: "Checks whether a given number is even or odd.",
    code: `shuru

dhoro shonkha number;

nao(number);

jodi (vagshesh(number, 2) == 0) {
    dekhao("Even");
} naile {
    dekhao("Odd");
}

shesh
`
  },
  {
    id: "compare-two",
    label: "Compare Two",
    description: "Compares two input numbers and prints the larger one.",
    code: `shuru

dhoro shonkha left;
dhoro shonkha right;

nao(left);
nao(right);

jodi (left > right) {
    dekhao("Largest:");
    dekhao(left);
} naile {
    dekhao("Largest:");
    dekhao(right);
}

shesh
`
  },
  {
    id: "countdown",
    label: "Countdown",
    description: "Counts down from a number to 1 using a loop.",
    code: `shuru

dhoro shonkha count;

nao(count);

jotokhon (count > 0) {
    dekhao(count);
    count = count - 1;
}

dekhao("Done");

shesh
`
  },
  {
    id: "arrays-loops",
    label: "Arrays & Loops",
    description: "Array declaration, index assignment, while loop, and for loop.",
    code: `shuru

dhoro shonkha i;
dhoro shonkha total;
dhoro shonkha nums[4];

i = 0;
total = 0;

jotokhon (i < 4) {
    nums[i] = i + 1;
    total = total + nums[i];
    i = i + 1;
}

ghurao (i = 0; i < 4; i = i + 1) {
    dekhao(nums[i]);
}

dekhao(total);

shesh
`
  },
  {
    id: "input-output",
    label: "Input Flow",
    description: "Reads values with nao(), then prints computed and raw output in the terminal.",
    code: `shuru

dhoro shonkha number;
dhoro lekha name;

nao(number);
nao(name);

dekhao("Square:");
dekhao(number * number);
dekhao("Name:");
dekhao(name);

shesh
`
  },
  {
    id: "functions",
    label: "Functions",
    description: "Function declaration, return statement, function call, and strings.",
    code: `kaj jog(a, b) {
    dhoro shonkha total;
    total = a + b;
    ferot total;
}

shuru

dhoro shonkha result;
dhoro lekha title;

result = jog(5, 3);
title = "Computation done";

dekhao(title);
dekhao(result);

shesh
`
  },
  {
    id: "fibonacci",
    label: "Fibonacci",
    description: "Recursive function to compute the nth Fibonacci number.",
    code: `kaj fibonacci(n) {
    jodi (n <= 0) {
        ferot 0;
    }
    jodi (n == 1) {
        ferot 1;
    }
    dhoro shonkha result;
    result = fibonacci(n - 1) + fibonacci(n - 2);
    ferot result;
}

shuru

dhoro shonkha i;
dhoro shonkha n;
n = 10;

dekhao("Fibonacci sequence:");
ghurao (i = 0; i < n; i = i + 1) {
    dekhao(fibonacci(i));
}

shesh
`
  },
  {
    id: "while-loop",
    label: "While Loop",
    description: "Counting with a while loop and accumulator pattern.",
    code: `shuru

dhoro shonkha count;
dhoro shonkha sum;

count = 1;
sum = 0;

jotokhon (count <= 10) {
    sum = sum + count;
    dekhao(count);
    count = count + 1;
}

dekhao("Sum of 1 to 10:");
dekhao(sum);

shesh
`
  },
  {
    id: "nested-conditionals",
    label: "Nested Conditions",
    description: "Multi-level if-else chain for grade classification.",
    code: `shuru

dhoro shonkha score;
dhoro lekha grade;

score = 87;

jodi (score >= 90) {
    grade = "A+ (Outstanding)";
} naile {
    jodi (score >= 80) {
        grade = "A (Excellent)";
    } naile {
        jodi (score >= 70) {
            grade = "B (Good)";
        } naile {
            jodi (score >= 60) {
                grade = "C (Average)";
            } naile {
                grade = "F (Needs Improvement)";
            }
        }
    }
}

dekhao("Score:");
dekhao(score);
dekhao("Grade:");
dekhao(grade);

shesh
`
  }
];

export const DEFAULT_TEMPLATE =
  DIAMOND_TEMPLATES.find((template) => template.id === "input-output") ?? DIAMOND_TEMPLATES[0];
