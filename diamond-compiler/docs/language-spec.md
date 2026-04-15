## Diamond Language Specification (Draft)

### 1. Overview

Diamond is a beginner-friendly, Bengali-flavoured educational programming language.
It is designed to teach core programming and compiler concepts using a clean,
consistent syntax that is easy to parse with Flex and Bison.

Source files use the extension: `.diu`.

### 2. Design Goals

- Simple, readable syntax.
- Bengali-inspired keywords with English-style operators.
- Clear mapping from syntax to tokens, AST, symbol table entries, and TAC.
- Support for:
  - Variables and basic types.
  - Arithmetic and boolean expressions.
  - Conditionals and loops.
  - Functions.
  - Arrays and strings (basic operations).

### 3. Lexical Structure

#### 3.1. Keywords

The following reserved keywords cannot be used as identifiers:

`shuru`, `shesh`,
`dhoro`,
`shonkha`, `doshomik`, `lekha`, `shotto`, `khali`, `auto`, `mithya`,
`jodi`, `naile`,
`jotokhon`, `ghurao`,
`kaj`, `ferot`,
`dekhao`, `nao`,
`ebong`, `ba`, `na`,
`amdani`, `gothon`.

#### 3.2. Identifiers

Pattern: `[A-Za-z_][A-Za-z0-9_]*`

Examples: `a`, `total_sum`, `result1`.

#### 3.3. Literals

- Integer: `[0-9]+` (e.g., `0`, `42`).
- Float: `[0-9]+\.[0-9]+` (e.g., `3.14`).
- String: double-quoted text without newlines, e.g. `"Hello World"`.
- Boolean: `shotto` (true), `mithya` (false).

#### 3.4. Operators and Delimiters

- Arithmetic: `+`, `-`, `*`, `/`
- Assignment: `=`
- Comparison: `<`, `>`, `<=`, `>=`, `==`, `!=`
- Logical: `ebong` (and), `ba` (or), `na` (not)
- Delimiters: `(`, `)`, `{`, `}`, `[`, `]`, `;`, `,`

#### 3.5. Comments

- Single-line: `// ...` until end of line.
- Multi-line: `/* ... */`.

#### 3.6. Token Stream Support

The compiler front-end may expose the lexer output as a token stream for
teaching and debugging purposes.

Example:

```text
dhoro shonkha a;
```

Possible token output:

```text
DHORO SHONKHA ID(a) SEMICOLON
```

### 4. Types

Diamond has the following built-in types:

- `shonkha` — integer (whole numbers).
- `doshomik` — floating-point numbers.
- `lekha` — strings (text).
- `shotto` — boolean values (`shotto` or `mithya`).
- `khali` — function-only return type for procedures that do not return a value.

Diamond also supports user-defined record-style composite types through
`gothon`. These are currently lowered during preprocessing into flattened
native declarations.

Example:

```text
gothon Person {
    shonkha age;
    lekha name;
}
```

#### 4.1. Type compatibility and conversions

The compiler currently accepts:

- exact type matches
- implicit promotion from `shonkha` to `doshomik`

The compiler currently rejects:

- implicit numeric-to-string conversion
- implicit string-to-numeric conversion
- implicit boolean-to-numeric conversion
- implicit use of `khali` values inside expressions

Explicit conversion helpers are exposed through built-in library functions:

- `shonkhakor(lekha) -> shonkha`
- `lekhakor(doshomik) -> lekha`

These rules are enforced in declarations, assignments, function arguments,
return statements, and equality checks.

### 5. Program Structure

Every program:

- May import other `.diu` source files using `amdani "relative/path.diu";`.
- May start with a virtual include line (for documentation only):
  `#include <daffodil.h>` (treated as a comment by the compiler front-end).
- Must start with `shuru` and end with `shesh`.

Example:

```text
shuru

dekhao("Hello World");

shesh
```

### 6. Declarations and Variables

Variables are declared using `dhoro` followed by a type and identifier.
Diamond also supports `auto` for declaration-time type inference when an
initializer is present.

Syntax:

```text
dhoro <type> <id>;
dhoro <type> <id>[<size>];    // array
dhoro auto <id> = <expression>;
dhoro <RecordType> <id>;      // lowered by the preprocessor
```

Examples:

```text
dhoro shonkha a;
dhoro doshomik price;
dhoro lekha name;
dhoro shonkha arr[10];
dhoro auto total = 5 + 7;
dhoro Person user;
```

Record fields are accessed with dot syntax and lowered before parsing:

```text
user.name = "Rahim";
dekhao(user.name);
```

#### 6.1. Scope rules

Diamond uses lexical scoping.

- The main program body (`shuru ... shesh`) behaves as the top-level executable scope.
- Each `{ ... }` block introduces a nested scope.
- Function parameters belong to the function scope.
- Redeclaration in the same scope is rejected.
- Shadowing from an outer scope into an inner scope is allowed.
- Symbols become inactive after leaving a scope, but remain visible in exported analysis views.

### 7. Assignment

Assignment uses `=` with compatible types.

Examples:

```text
a = 10;
name = "Rahim";
flag = shotto;
arr[0] = 5;
```

### 8. Expressions

Expressions support arithmetic, comparison, logical operations, and string
concatenation.

Operator precedence (from high to low):

1. Parentheses: `( expr )`
2. Unary minus: `-expr`, logical not: `na expr`
3. Multiplication and division: `*`, `/`
4. Addition and subtraction: `+`, `-`
5. Comparisons: `<`, `>`, `<=`, `>=`, `==`, `!=`
6. Logical and/or: `ebong`, `ba`

Examples:

```text
a = 5 + 3 * 2;
jodi (a > 5 ebong a < 20) { ... }
name = "Diamond " + "Compiler";
```

### 9. Input / Output

#### 9.1. Output

Keyword: `dekhao`

```text
dekhao(a);
dekhao("Hello");
```

#### 9.2. Input

Keyword: `nao`

```text
nao(a);
```

### 10. Conditionals

#### 10.1. If

```text
jodi (condition) {
    // statements
}
```

#### 10.2. If–Else

```text
jodi (condition) {
    // statements
}
naile {
    // statements
}
```

### 11. Loops

#### 11.1. While loop — `jotokhon`

```text
jotokhon (condition) {
    // statements
}
```

#### 11.2. For loop — `ghurao`

```text
ghurao (init; condition; step) {
    // statements
}
```

Example:

```text
ghurao (i = 0; i < 5; i = i + 1) {
    dekhao(i);
}
```

### 12. Functions

Function declaration uses `kaj` and return with `ferot`. Functions may declare
an explicit return type. If omitted, the compiler keeps the legacy default of
`shonkha`.

Basic idea:

```text
kaj shonkha jog(shonkha a, shonkha b) {
    ferot a + b;
}

kaj khali shagotom(lekha name) {
    dekhao("Hello " + name);
    ferot;
}

shuru

dhoro shonkha result;
result = jog(5, 3);
dekhao(result);

shesh
```

Untyped parameters remain valid for backwards compatibility and default to
`shonkha`, but typed parameters are recommended for new code.

#### 12.2. Function and return semantics

- Functions must be declared before the `shuru ... shesh` main block.
- If the return type is omitted, the current default is `shonkha`.
- If a parameter type is omitted, the current default is `shonkha`.
- `ferot` can only appear inside a function body.
- `khali` functions may use `ferot;` but may not return an expression.
- Non-`khali` functions must return a value compatible with the declared type.
- Function calls are checked for both argument count and argument type compatibility.
- Record-typed function parameters are not supported yet by the preprocessing/lowering stage.

### 12.1. Built-in Library

The compiler predeclares a small standard library of string and math helpers:

- `jora(lekha, lekha) -> lekha`
- `dairgho(lekha) -> shonkha`
- `ongsho(lekha, shonkha, shonkha) -> lekha`
- `tulona(lekha, lekha) -> shonkha`
- `boro(doshomik, doshomik) -> doshomik`
- `chhoto(doshomik, doshomik) -> doshomik`
- `porom(doshomik) -> doshomik`
- `ulto(lekha) -> lekha`
- `vagshesh(shonkha, shonkha) -> shonkha`
- `gol(doshomik) -> shonkha`
- `shonkhakor(lekha) -> shonkha`
- `lekhakor(doshomik) -> lekha`

### 13. Compiler Outputs

The current Diamond compiler project may expose the following intermediate
artifacts in the web IDE or CLI JSON output:

- Token stream
- AST (Abstract Syntax Tree)
- Symbol table
- Diagnostics with line number and error type
- Raw TAC (Three Address Code)
- Optimized TAC
- Educational pseudo-assembly listing
- Optional Bison parse trace when trace mode is enabled
- Optimization counters for constant folding, strength reduction, common subexpression elimination, dead code elimination, and unreachable code removal

These outputs are intended to make the compiler front-end observable during lab
presentation and viva.

#### 13.1. Diagnostic classes

The implementation distinguishes the following compile-time diagnostic families:

- `preprocess`
- `lexical`
- `syntax`
- `semantic`
- `io`
- `request`
- `internal`

The IDE may additionally surface runtime errors separately while interpreting the
AST for classroom demonstrations.

#### 13.2. Code generation target

Diamond currently emits an educational pseudo-assembly listing after the TAC
optimization stage. This is separate from the WebAssembly build of the compiler
itself, which is used to run the front-end inside the browser.

### 14. Sample Program

```text
shuru

dhoro shonkha a;
dhoro shonkha b;

a = 5;
b = 10;

jodi (a < b) {
    dekhao("a is smaller");
}

ghurao (i = 0; i < 5; i = i + 1) {
    dekhao(i);
}

shesh
```

### 15. High-level Grammar Sketch

This is a simplified context-free grammar outline (details will be finalized
in the Bison file):

```text
program       → functions_opt SHURU statements SHESH

functions_opt → functions
              | ε

functions     → functions function_decl
              | function_decl

function_decl → KAJ return_type_opt ID '(' params_opt ')' block
params_opt    → params
              | ε
params        → params ',' param
              | param
param         → type ID
              | ID

statements    → statements statement
              | statement

statement     → declaration
              | assignment
              | if_stmt
              | while_loop
              | for_loop
              | func_call ';'
              | print_stmt
              | input_stmt
              | return_stmt
              | block

declaration   → DHORO type ID ';'
              | DHORO type ID '=' expression ';'
              | DHORO type ID '[' NUMBER ']' ';'
              | DHORO AUTO ID '=' expression ';'

type          → SHONKHA
              | DOSHOMIK
              | LEKHA
              | SHOTTO

return_type   → type
              | KHALI

return_type_opt → return_type
                | ε

assignment    → ID '=' expression ';'
              | ID '[' expression ']' '=' expression ';'

print_stmt    → DEKHAO '(' expression ')' ';'
input_stmt    → NAO '(' ID ')' ';'
return_stmt   → FEROT expression ';'
              | FEROT ';'

if_stmt       → JODI '(' condition ')' block
              | JODI '(' condition ')' block NAILE block

while_loop    → JOTOKHON '(' condition ')' block

for_loop      → GHURAO '(' init ';' condition ';' step ')' block

block         → '{' statements '}'

condition     → expression relop expression
              | expression

relop         → '<' | '>' | LE | GE | EQ | NE

expression    → expression PLUS term
              | expression MINUS term
              | term

term          → term MUL factor
              | term DIV factor
              | factor

factor        → NUMBER
              | STRING
              | ID
              | ID '[' expression ']'
              | func_call
              | '(' expression ')'
```

This document will guide the Flex and Bison implementations and will be
extended as we add arrays, strings, functions, and semantic analysis.

