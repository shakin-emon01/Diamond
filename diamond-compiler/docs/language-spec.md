# Diamond Language Specification

## 1. Purpose

Diamond is a beginner-friendly educational programming language built for compiler design learning. It uses Bengali-inspired keywords while keeping the structure familiar to students who have seen C-style syntax.

Source files use the extension `.diu`.

## 2. Design Goals

- keep syntax easy to read and easy to parse
- connect language features directly to compiler concepts
- support classroom examples for declarations, conditions, loops, functions, arrays, and input/output
- expose compiler artifacts such as tokens, AST, symbol tables, and TAC in a teachable way

## 3. Keywords

### Program structure

- `shuru` : program start
- `shesh` : program end

### Declarations and types

- `dhoro` : declare a variable
- `shonkha` : integer
- `doshomik` : floating-point number
- `lekha` : string
- `shotto` : boolean type
- `mithya` : boolean false literal
- `khali` : function-only void-like return type
- `auto` : inferred type from initializer

### Control flow

- `jodi` : if
- `naile` : else
- `jotokhon` : while loop
- `ghurao` : for loop

### Functions and I/O

- `kaj` : function declaration
- `ferot` : return
- `dekhao` : print output
- `nao` : read input

### Logic and preprocessing

- `ebong` : logical and
- `ba` : logical or
- `na` : logical not
- `amdani` : import another `.diu` file
- `gothon` : record-style declaration handled by preprocessing

## 4. Data Types

| Type | Meaning | Example |
|---|---|---|
| `shonkha` | integer | `5`, `-2` |
| `doshomik` | floating-point number | `3.14`, `7.5` |
| `lekha` | string | `"Diamond"` |
| `shotto` | boolean | `shotto`, `mithya` |
| `khali` | function return only | `kaj khali show() { ferot; }` |

### Type behavior

- exact type matches are accepted
- `shonkha` can be promoted to `doshomik`
- string, boolean, and numeric values do not convert implicitly between each other
- `auto` requires an initializer with a concrete type
- `khali` values cannot be used inside normal expressions

## 5. Program Structure

A normal Diamond program starts with `shuru` and ends with `shesh`.

```text
shuru

dekhao("Hello Diamond");

shesh
```

Functions appear before the main program block.

## 6. Declarations

### Variables

```text
dhoro shonkha a;
dhoro doshomik price;
dhoro lekha name;
dhoro shotto ready;
```

### Arrays

```text
dhoro shonkha marks[5];
marks[0] = 90;
```

### Type inference with `auto`

```text
dhoro auto total = 5 + 7;
```

`auto` is useful for short examples, but explicit types remain better for teaching and readability.

## 7. Expressions And Operators

### Arithmetic

- `+`
- `-`
- `*`
- `/`

### Comparison

- `<`
- `>`
- `<=`
- `>=`
- `==`
- `!=`

### Logical

- `ebong`
- `ba`
- `na`

### Simplified precedence

1. parentheses
2. unary minus and `na`
3. `*` and `/`
4. `+` and `-`
5. comparison operators
6. `ebong`, `ba`

## 8. Assignment

```text
a = 10;
name = "Rahim";
ready = shotto;
marks[2] = 75;
```

Assignments must respect type compatibility rules.

## 9. Input And Output

### Output

```text
dekhao("Hello");
dekhao(a);
```

### Input

```text
nao(a);
nao(name);
```

The IDE provides a separate input area for programs that use `nao()`.

## 10. Conditional Statements

```text
jodi (a > 10) {
    dekhao("Large");
}
```

```text
jodi (a > 10) {
    dekhao("Large");
} naile {
    dekhao("Small");
}
```

Conditions are expected to evaluate to `shotto`.

## 11. Loops

### While loop

```text
jotokhon (a < 5) {
    dekhao(a);
    a = a + 1;
}
```

### For loop

```text
ghurao (i = 0; i < 5; i = i + 1) {
    dekhao(i);
}
```

## 12. Functions

### Basic function

```text
kaj jog(a, b) {
    ferot a + b;
}
```

### Typed function

```text
kaj shonkha jog(shonkha a, shonkha b) {
    ferot a + b;
}
```

### Void-like function

```text
kaj khali shagotom(lekha name) {
    dekhao(name);
    ferot;
}
```

### Function rules

- functions are declared before the main block
- if a return type is omitted, legacy behavior defaults to `shonkha`
- untyped parameters remain supported for backward compatibility and default to `shonkha`
- `ferot` is only valid inside function bodies
- `khali` functions may use `ferot;` but cannot return a value
- function calls are checked for argument count and type compatibility

## 13. Built-In Helper Functions

Diamond predeclares a small helper library.

| Function | Return type | Purpose |
|---|---|---|
| `jora(lekha, lekha)` | `lekha` | join two strings |
| `dairgho(lekha)` | `shonkha` | string length |
| `ongsho(lekha, shonkha, shonkha)` | `lekha` | substring |
| `tulona(lekha, lekha)` | `shonkha` | string comparison |
| `boro(doshomik, doshomik)` | `doshomik` | maximum |
| `chhoto(doshomik, doshomik)` | `doshomik` | minimum |
| `porom(doshomik)` | `doshomik` | absolute value |
| `ulto(lekha)` | `lekha` | reverse string |
| `vagshesh(shonkha, shonkha)` | `shonkha` | remainder |
| `gol(doshomik)` | `shonkha` | round |
| `shonkhakor(lekha)` | `shonkha` | convert string to integer |
| `lekhakor(doshomik)` | `lekha` | convert number to string |

## 14. Imports And Records

### Imports

Diamond supports preprocessing-based imports:

```text
amdani "modules/math-utils.diu";
```

Imported files are expanded before normal lexing and parsing.

### Record-style declarations

Diamond also supports `gothon` declarations that are lowered by preprocessing:

```text
gothon Person {
    shonkha age;
    lekha name;
}
```

The current implementation treats this as a preprocessing feature rather than a full runtime record system.

Current limitation:

- record-typed values cannot yet be passed directly as function parameters or returns

## 15. Comments

- single-line comments: `// comment`
- multi-line comments: `/* comment */`

## 16. Example Program

```text
kaj shonkha jog(shonkha a, shonkha b) {
    ferot a + b;
}

shuru

dhoro shonkha result;
dhoro lekha title;

result = jog(5, 3);
title = "Diamond Result";

dekhao(title);
dekhao(result);

shesh
```

## 17. Observable Compiler Outputs

The current project can expose the following learning artifacts:

- token stream
- AST
- symbol table
- scope information
- diagnostics
- raw TAC
- optimized TAC
- educational pseudo-assembly
- preprocessing statistics

These outputs are available through the compiler JSON result and are visualized in the web IDE.
