export const DIAMOND_CHEATSHEET = [
  {
    title: "Program Skeleton",
    example: `shuru

// tomar statement ekhane

shesh`
  },
  {
    title: "Declarations",
    example: `dhoro shonkha total;
dhoro doshomik average;
dhoro lekha name;
dhoro shotto active;
dhoro shonkha nums[5];`
  },
  {
    title: "Assignments",
    example: `total   = 10;
average = 82.5;
name    = "Rahim";
active  = shotto;
nums[0] = 5;`
  },
  {
    title: "Input / Output",
    example: `dhoro shonkha marks;
dhoro lekha student;

nao(marks);
nao(student);

dekhao(student);
dekhao(marks);`
  },
  {
    title: "Boolean Expressions",
    example: `dhoro shotto eligible;

eligible = marks >= 40 ebong attendance > 80;

jodi (na eligible ba marks < 0) {
    dekhao("Check input");
}`
  },
  {
    title: "If / Else",
    example: `jodi (marks >= 80) {
    dekhao("A+");
} naile {
    dekhao("Keep practicing");
}`
  },
  {
    title: "Nested Conditions",
    example: `jodi (marks >= 40) {
    jodi (marks >= 80) {
        dekhao("Distinction");
    } naile {
        dekhao("Pass");
    }
} naile {
    dekhao("Fail");
}`
  },
  {
    title: "While Loop",
    example: `dhoro shonkha i;
i = 0;

jotokhon (i < 5) {
    dekhao(i);
    i = i + 1;
}`
  },
  {
    title: "For Loop",
    example: `dhoro shonkha i;

ghurao (i = 0; i < 5; i = i + 1) {
    dekhao(i);
}`
  },
  {
    title: "Arrays",
    example: `dhoro shonkha i;
dhoro shonkha nums[4];

ghurao (i = 0; i < 4; i = i + 1) {
    nums[i] = i + 1;
}

dekhao(nums[2]);`
  },
  {
    title: "Functions",
    example: `kaj jog(a, b) {
    ferot a + b;
}

shuru
dhoro shonkha result;
result = jog(5, 7);
dekhao(result);
shesh`
  },
  {
    title: "Multiple Functions",
    example: `kaj boro(a, b) {
    jodi (a > b) {
        ferot a;
    }
    ferot b;
}

kaj banner(name) {
    ferot jora("Hello ", name);
}`
  },
  {
    title: "Strings and Builtins",
    example: `dhoro lekha title;
title = jora("Diamond ", "Compiler");

dekhao(title);
dekhao(dairgho(title));
dekhao(ongsho(title, 0, 7));`
  },
  {
    title: "Comments",
    example: `// eta holo single-line comment
dhoro shonkha x;  // inline comment

/*
eta multi-line
comment block
*/`
  },
  {
    title: "Error-Handling Pattern",
    example: `dhoro shonkha age;
nao(age);

jodi (age < 0) {
    dekhao("Invalid input");
} naile {
    dekhao("Accepted");
}`
  }
];
