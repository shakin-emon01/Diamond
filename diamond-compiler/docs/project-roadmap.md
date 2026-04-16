# Diamond Project Roadmap

## 1. Current Position

Diamond is already beyond the idea stage. The repository currently contains:

- a working custom language specification
- a real compiler core in C with Flex and Bison
- WebAssembly integration for browser-based compilation
- a student-friendly Next.js IDE with analysis panels
- runtime execution and debugging support in the browser
- automated testing across native, frontend, backend, and end-to-end layers

This means the project is already suitable for university demonstration, lab defense, and portfolio presentation.

## 2. Delivered Milestones

### Language and compiler

- Bengali-inspired keyword design
- declarations, arrays, expressions, conditionals, loops, and functions
- preprocessing support for imports and record-style declarations
- AST generation and semantic validation
- TAC generation and pseudo-assembly output
- structured JSON export for IDE integration

### IDE and learning tools

- Monaco-based editing environment
- starter templates for common beginner problems
- AST and flowchart visualization
- token, symbol, scope, type, diagnostics, and codegen views
- run, debug, challenge, and test-suite workflows
- exportable HTML report

### Deployment and verification

- live hosted IDE
- backend API fallback
- CI pipeline
- native regression reporting

## 3. Short-Term Next Steps

- improve documentation around deployment and demo setup
- expand negative test coverage for more semantic edge cases
- make the academic report and user guide easier for first-time students to follow
- strengthen examples for `amdani` imports and `gothon` record usage

## 4. Medium-Term Improvements

- support record values as direct function parameters and return values
- improve multi-file workflow inside the IDE
- add historical comparison of regression results instead of only the latest report
- separate more semantic analysis logic from parser actions for cleaner teaching structure

## 5. Long-Term Direction

- richer standard-library support
- stronger project-level module system
- more advanced optimization reporting
- optional executable backend target beyond educational pseudo-assembly
- improved classroom analytics or guided lab exercises

## 6. Presentation Checklist

For a lab demo or viva, the recommended flow is:

1. open the live IDE
2. load a simple template
3. compile and show diagnostics, tokens, and AST
4. show symbol table, scopes, and TAC
5. run the program with sample input
6. step through debugging and memory snapshots
7. finish with challenges, test-suite results, or report export

## 7. Outcome

The roadmap now focuses less on proving that Diamond can exist and more on refining it into a polished academic teaching tool.
