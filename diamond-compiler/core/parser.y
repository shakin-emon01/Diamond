%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "ast.h"
#include "symtab.h"

#if !defined(YYDEBUG)
#define YYDEBUG 1
#endif

#if YYDEBUG
#define YYFPRINTF(Stream, ...) diamond_parse_trace_log(__VA_ARGS__)
#endif

extern int yylex(void);
extern int line_no;
void yyerror(const char *s);

extern AstNode *root_ast;
void add_error(const char *type, int line, const char *msg);
int diamond_parse_trace_enabled(void);
void diamond_parse_trace_log(const char *format, ...);

static int function_depth = 0;
static DiamondType current_function_return_type = TYPE_UNKNOWN;
static const char *current_function_name = NULL;

static int types_compatible(DiamondType target, DiamondType value) {
    if (target == TYPE_UNKNOWN || value == TYPE_UNKNOWN) {
        return 1;
    }

    if (target == value) {
        return 1;
    }

    return target == TYPE_DOSHOMIK && value == TYPE_SHONKHA;
}

static void push_semantic_error(const char *message) {
    add_error("semantic", line_no, message);
}

static void push_semantic_error_at(int line, const char *message) {
    add_error("semantic", line, message);
}

static void push_identifier_error(const char *template_text, const char *name) {
    char buffer[192];
    snprintf(buffer, sizeof(buffer), template_text, name);
    add_error("semantic", line_no, buffer);
}

static AstNode *make_empty_node(void) {
    return ast_make_node(AST_EMPTY, "empty", line_no);
}

static AstNode *make_int_literal(long value) {
    char buffer[32];
    AstNode *node = NULL;

    snprintf(buffer, sizeof(buffer), "%ld", value);
    node = ast_make_typed_node(AST_LITERAL_INT, buffer, line_no, TYPE_SHONKHA);
    return node;
}

static AstNode *make_float_literal(double value) {
    char buffer[64];
    AstNode *node = NULL;

    snprintf(buffer, sizeof(buffer), "%.6g", value);
    node = ast_make_typed_node(AST_LITERAL_FLOAT, buffer, line_no, TYPE_DOSHOMIK);
    return node;
}

static AstNode *make_string_literal(const char *value) {
    return ast_make_typed_node(AST_LITERAL_STRING, value, line_no, TYPE_LEKHA);
}

static AstNode *make_bool_literal(const char *value) {
    return ast_make_typed_node(AST_LITERAL_BOOL, value, line_no, TYPE_SHOTTO);
}

static AstNode *make_parameter_node(const char *name, DiamondType type) {
    return ast_make_typed_node(AST_IDENTIFIER, name, line_no, type);
}

static DiamondType *capture_param_types(const AstNode *params, int *param_count) {
    DiamondType *param_types = NULL;
    int count = 0;
    int i = 0;

    if (param_count) {
        *param_count = 0;
    }

    if (!params || params->child_count == 0) {
        return NULL;
    }

    count = params->child_count;
    param_types = (DiamondType *)malloc(sizeof(DiamondType) * (size_t)count);
    if (!param_types) {
        return NULL;
    }

    for (i = 0; i < count; ++i) {
        param_types[i] = params->children[i]->value_type;
    }

    if (param_count) {
        *param_count = count;
    }

    return param_types;
}

static Symbol *resolve_symbol(const char *name, int require_array, int forbid_array) {
    Symbol *symbol = symtab_lookup(name);

    if (!symbol) {
        push_identifier_error("undeclared identifier '%s'", name);
        return NULL;
    }

    if (require_array && symbol->kind != SYM_ARRAY) {
        push_identifier_error("'%s' is not declared as an array", name);
        return symbol;
    }

    if (forbid_array && symbol->kind == SYM_ARRAY) {
        push_identifier_error("array '%s' must be accessed with an index", name);
        return symbol;
    }

    return symbol;
}

static AstNode *make_identifier_reference(const char *name, int forbid_array) {
    Symbol *symbol = resolve_symbol(name, 0, forbid_array);
    AstNode *node = ast_make_node(AST_IDENTIFIER, name, line_no);

    if (symbol) {
        ast_set_value_type(node, symbol->type);
    }

    return node;
}

static AstNode *make_array_reference(const char *name, AstNode *index_expr) {
    Symbol *symbol = resolve_symbol(name, 1, 0);
    AstNode *node = ast_make_node(AST_ARRAY_REF, name, line_no);

    if (index_expr && index_expr->value_type != TYPE_UNKNOWN && index_expr->value_type != TYPE_SHONKHA) {
        push_identifier_error("array index for '%s' must be a shonkha expression", name);
    }

    if (symbol) {
        ast_set_value_type(node, symbol->type);
    }

    ast_append_child(node, index_expr);
    return node;
}

static AstNode *make_binary_expression(const char *op, AstNode *left, AstNode *right) {
    DiamondType result_type = TYPE_UNKNOWN;
    AstNode *node = ast_make_binary(AST_BIN_OP, op, left, right);

    if (strcmp(op, "+") == 0 &&
        (left->value_type == TYPE_LEKHA || right->value_type == TYPE_LEKHA)) {
        if (diamond_type_is_void(left->value_type) || diamond_type_is_void(right->value_type)) {
            push_semantic_error("string concatenation cannot use khali expressions");
        } else {
            result_type = TYPE_LEKHA;
        }
    } else if (strcmp(op, "+") == 0 || strcmp(op, "-") == 0 ||
               strcmp(op, "*") == 0 || strcmp(op, "/") == 0) {
        if (left->value_type != TYPE_UNKNOWN &&
            right->value_type != TYPE_UNKNOWN &&
            (!diamond_type_is_numeric(left->value_type) || !diamond_type_is_numeric(right->value_type))) {
            push_semantic_error("arithmetic operators require numeric operands");
        } else if (diamond_type_is_numeric(left->value_type) && diamond_type_is_numeric(right->value_type)) {
            result_type = (left->value_type == TYPE_DOSHOMIK || right->value_type == TYPE_DOSHOMIK)
                ? TYPE_DOSHOMIK
                : TYPE_SHONKHA;
        }
    } else if (strcmp(op, "ebong") == 0 || strcmp(op, "ba") == 0) {
        if (left->value_type != TYPE_UNKNOWN &&
            right->value_type != TYPE_UNKNOWN &&
            (!diamond_type_is_boolean(left->value_type) || !diamond_type_is_boolean(right->value_type))) {
            push_semantic_error("logical operators require shotto expressions");
        } else if (diamond_type_is_boolean(left->value_type) && diamond_type_is_boolean(right->value_type)) {
            result_type = TYPE_SHOTTO;
        }
    } else if (strcmp(op, "==") == 0 || strcmp(op, "!=") == 0) {
        if (!(types_compatible(left->value_type, right->value_type) ||
              types_compatible(right->value_type, left->value_type))) {
            push_semantic_error("equality operators require compatible operands");
        }
        result_type = TYPE_SHOTTO;
    } else {
        if (left->value_type != TYPE_UNKNOWN &&
            right->value_type != TYPE_UNKNOWN &&
            (!diamond_type_is_numeric(left->value_type) || !diamond_type_is_numeric(right->value_type))) {
            push_semantic_error("comparison operators require numeric operands");
        }
        result_type = TYPE_SHOTTO;
    }

    ast_set_value_type(node, result_type);
    return node;
}

static AstNode *make_unary_expression(const char *op, AstNode *child) {
    DiamondType result_type = TYPE_UNKNOWN;
    AstNode *node = ast_make_unary(AST_UNARY_OP, op, child, line_no);

    if (strcmp(op, "-") == 0) {
        if (child->value_type != TYPE_UNKNOWN && !diamond_type_is_numeric(child->value_type)) {
            push_semantic_error("unary minus requires a numeric operand");
        } else if (diamond_type_is_numeric(child->value_type)) {
            result_type = child->value_type;
        }
    } else if (strcmp(op, "na") == 0) {
        if (child->value_type != TYPE_UNKNOWN && !diamond_type_is_boolean(child->value_type)) {
            push_semantic_error("logical not requires a shotto operand");
        } else if (diamond_type_is_boolean(child->value_type)) {
            result_type = TYPE_SHOTTO;
        }
    }

    ast_set_value_type(node, result_type);
    return node;
}

static AstNode *make_declaration_node(const char *name, DiamondType type, int array_size, AstNode *initializer) {
    SymbolKind kind = array_size >= 0 ? SYM_ARRAY : SYM_VAR;
    AstNode *node = ast_make_typed_node(AST_DECLARATION, name, line_no, type);

    if (symtab_lookup_current_scope(name)) {
        push_identifier_error("redeclaration of '%s' in the same scope", name);
    } else {
        symtab_insert(name, kind, type, array_size, line_no);
    }

    node->array_size = array_size;

    if (array_size >= 0) {
        ast_append_child(node, make_int_literal(array_size));
    }

    if (initializer) {
        if (!types_compatible(type, initializer->value_type)) {
            push_identifier_error("type mismatch while initializing '%s'", name);
        }
        ast_append_child(node, initializer);
    }

    return node;
}

static AstNode *make_auto_declaration_node(const char *name, AstNode *initializer) {
    DiamondType inferred_type = initializer ? initializer->value_type : TYPE_UNKNOWN;

    if (!initializer) {
        push_identifier_error("auto declaration '%s' requires an initializer", name);
        return make_declaration_node(name, TYPE_UNKNOWN, -1, NULL);
    }

    if (inferred_type == TYPE_UNKNOWN || inferred_type == TYPE_KHALI) {
        push_identifier_error("auto declaration '%s' needs an expression with a concrete type", name);
    }

    return make_declaration_node(name, inferred_type, -1, initializer);
}

static AstNode *make_assignment_node(AstNode *target, AstNode *value) {
    AstNode *node = ast_make_binary(AST_ASSIGNMENT, "=", target, value);
    DiamondType target_type = target ? target->value_type : TYPE_UNKNOWN;

    if (!types_compatible(target_type, value ? value->value_type : TYPE_UNKNOWN)) {
        push_semantic_error("assignment type mismatch");
    }

    ast_set_value_type(node, target_type);
    return node;
}

static void ensure_boolean_condition(const AstNode *expr, const char *context_name) {
    char buffer[160];

    if (!expr) {
        return;
    }

    if (expr->value_type != TYPE_UNKNOWN && expr->value_type != TYPE_SHOTTO) {
        snprintf(buffer, sizeof(buffer), "%s condition must evaluate to shotto", context_name);
        add_error("semantic", expr->line, buffer);
    }
}

static void validate_call_arguments(const Symbol *symbol, const AstNode *args, const char *name) {
    int actual_count = args ? args->child_count : 0;
    int i = 0;
    char buffer[192];

    if (!symbol || symbol->kind != SYM_FUNC) {
        return;
    }

    if (symbol->param_count != actual_count) {
        snprintf(buffer,
                 sizeof(buffer),
                 "function '%s' expects %d argument(s) but received %d",
                 name,
                 symbol->param_count,
                 actual_count);
        push_semantic_error(buffer);
        return;
    }

    for (i = 0; i < actual_count; ++i) {
        DiamondType expected = symbol->param_types ? symbol->param_types[i] : TYPE_UNKNOWN;
        DiamondType actual = args->children[i] ? args->children[i]->value_type : TYPE_UNKNOWN;

        if (!types_compatible(expected, actual)) {
            snprintf(buffer,
                     sizeof(buffer),
                     "argument %d of '%s' expects %s but received %s",
                     i + 1,
                     name,
                     diamond_type_name(expected),
                     diamond_type_name(actual));
            push_semantic_error_at(args->children[i] ? args->children[i]->line : line_no, buffer);
        }
    }
}

static AstNode *make_function_call(const char *name, AstNode *args) {
    Symbol *symbol = symtab_lookup(name);
    AstNode *node = ast_make_node(AST_FUNC_CALL, name, line_no);

    if (!symbol) {
        push_identifier_error("undeclared function '%s'", name);
    } else if (symbol->kind != SYM_FUNC) {
        push_identifier_error("'%s' is not a callable function", name);
    } else {
        ast_set_value_type(node, symbol->type);
        validate_call_arguments(symbol, args, name);
    }

    ast_append_child(node, args);
    return node;
}

static void register_parameter_symbols(const AstNode *params) {
    int i = 0;

    if (!params) {
        return;
    }

    for (i = 0; i < params->child_count; ++i) {
        const AstNode *param = params->children[i];

        if (symtab_lookup_current_scope(param->text)) {
            push_identifier_error("duplicate parameter '%s'", param->text);
        } else {
            symtab_insert(param->text, SYM_PARAM, param->value_type, -1, param->line);
        }
    }
}

static AstNode *make_function_decl_node(const char *name,
                                        DiamondType return_type,
                                        AstNode *params,
                                        AstNode *body) {
    AstNode *node = ast_make_typed_node(AST_FUNC_DECL, name, line_no, return_type);

    ast_append_child(node, params);
    ast_append_child(node, body);
    return node;
}
%}

%define parse.error verbose
%define parse.lac full
%define parse.trace

%code requires {
  #include "ast.h"
}

%union {
    long ival;
    double fval;
    char *sval;
    AstNode *node;
    int typecode;
}

%token SHURU SHESH
%token DHORO
%token SHONKHA DOSHOMIK LEKHA SHOTTO MITHYA KHALI AUTO
%token JODI NAILE
%token JOTOKHON GHURAO
%token KAJ FEROT
%token DEKHAO NAO
%token EBONG BA NA

%token <sval> ID
%token <ival> NUMBER_INT
%token <fval> NUMBER_FLOAT
%token <sval> STRING

%token PLUS MINUS MUL DIV
%token ASSIGN
%token LT GT LE GE EQ NE
%token LPAREN RPAREN
%token LBRACE RBRACE
%token LBRACKET RBRACKET
%token SEMICOLON COMMA

%type <node> program functions_opt functions function_decl parameter_list_opt parameter_list parameter
%type <node> statements_opt statements statement block declaration lvalue assignment_expr assignment
%type <node> print_stmt input_stmt if_stmt while_loop for_loop for_init for_condition for_step
%type <node> return_stmt func_call arg_list_opt arg_list expression logical_or logical_and
%type <node> equality comparison additive multiplicative unary factor
%type <typecode> type return_type function_return_type parameter_type_opt

%left BA
%left EBONG
%left EQ NE
%left LT GT LE GE
%left PLUS MINUS
%left MUL DIV
%right NA
%right UMINUS

%%

program
    : functions_opt SHURU statements_opt SHESH
      {
          AstNode *main_block = ast_make_node(AST_BLOCK, "main", line_no);
          root_ast = ast_make_node(AST_PROGRAM, "program", line_no);

          if ($1 && $1->child_count > 0) {
              ast_append_child(root_ast, $1);
          } else {
              ast_free($1);
          }

          ast_append_child(main_block, $3);
          ast_append_child(root_ast, main_block);
      }
    ;

functions_opt
    : functions
      { $$ = $1; }
    | %empty
      { $$ = ast_make_node(AST_STATEMENT_LIST, "functions", line_no); }
    ;

functions
    : functions function_decl
      {
          $$ = ast_append_child($1, $2);
      }
    | function_decl
      {
          $$ = ast_make_node(AST_STATEMENT_LIST, "functions", line_no);
          ast_append_child($$, $1);
      }
    ;

function_decl
    : KAJ function_return_type ID LPAREN parameter_list_opt RPAREN
      {
          DiamondType *param_types = NULL;
          int param_count = 0;

          if (symtab_lookup_current_scope($3)) {
              push_identifier_error("redeclaration of function '%s'", $3);
          } else {
              param_types = capture_param_types($5, &param_count);
              symtab_insert_function($3, (DiamondType)$2, param_types, param_count, line_no, 0);
              free(param_types);
          }

          symtab_enter_scope();
          register_parameter_symbols($5);
          function_depth++;
          current_function_return_type = (DiamondType)$2;
          current_function_name = $3;
      }
      block
      {
          $$ = make_function_decl_node($3, (DiamondType)$2, $5, $8);

          function_depth--;
          current_function_return_type = TYPE_UNKNOWN;
          current_function_name = NULL;
          symtab_leave_scope();
          free($3);
      }
    ;

parameter_list_opt
    : parameter_list
      { $$ = $1; }
    | %empty
      { $$ = ast_make_node(AST_PARAM_LIST, "params", line_no); }
    ;

parameter_list
    : parameter_list COMMA parameter
      {
          $$ = ast_append_child($1, $3);
      }
    | parameter
      {
          $$ = ast_make_node(AST_PARAM_LIST, "params", line_no);
          ast_append_child($$, $1);
      }
    ;

parameter
    : parameter_type_opt ID
      {
          $$ = make_parameter_node($2, (DiamondType)$1);
          free($2);
      }
    ;

statements_opt
    : statements
      { $$ = $1; }
    | %empty
      { $$ = ast_make_node(AST_STATEMENT_LIST, "stmts", line_no); }
    ;

statements
    : statements statement
      {
          $$ = ast_append_child($1, $2);
      }
    | statement
      {
          $$ = ast_make_node(AST_STATEMENT_LIST, "stmts", line_no);
          ast_append_child($$, $1);
      }
    ;

statement
    : declaration
      { $$ = $1; }
    | assignment
      { $$ = $1; }
    | print_stmt
      { $$ = $1; }
    | input_stmt
      { $$ = $1; }
    | if_stmt
      { $$ = $1; }
    | while_loop
      { $$ = $1; }
    | for_loop
      { $$ = $1; }
    | func_call SEMICOLON
      { $$ = $1; }
    | return_stmt
      { $$ = $1; }
    | block
      { $$ = $1; }
    | error SEMICOLON
      {
          add_error("syntax", line_no, "recovered after an invalid statement");
          yyerrok;
          $$ = make_empty_node();
      }
    ;

type
    : SHONKHA
      { $$ = TYPE_SHONKHA; }
    | DOSHOMIK
      { $$ = TYPE_DOSHOMIK; }
    | LEKHA
      { $$ = TYPE_LEKHA; }
    | SHOTTO
      { $$ = TYPE_SHOTTO; }
    ;

return_type
    : type
      { $$ = $1; }
    | KHALI
      { $$ = TYPE_KHALI; }
    ;

function_return_type
    : return_type
      { $$ = $1; }
    | %empty
      { $$ = TYPE_SHONKHA; }
    ;

parameter_type_opt
    : type
      { $$ = $1; }
    | %empty
      { $$ = TYPE_SHONKHA; }
    ;

declaration
    : DHORO type ID SEMICOLON
      {
          $$ = make_declaration_node($3, (DiamondType)$2, -1, NULL);
          free($3);
      }
    | DHORO type ID ASSIGN expression SEMICOLON
      {
          $$ = make_declaration_node($3, (DiamondType)$2, -1, $5);
          free($3);
      }
    | DHORO type ID LBRACKET NUMBER_INT RBRACKET SEMICOLON
      {
          if ($5 <= 0) {
              push_identifier_error("array '%s' must declare a positive size", $3);
          }

          $$ = make_declaration_node($3, (DiamondType)$2, (int)$5, NULL);
          free($3);
      }
    | DHORO AUTO ID ASSIGN expression SEMICOLON
      {
          $$ = make_auto_declaration_node($3, $5);
          free($3);
      }
    | DHORO error SEMICOLON
      {
          add_error("syntax", line_no, "invalid declaration after dhoro");
          yyerrok;
          $$ = make_empty_node();
      }
    ;

lvalue
    : ID
      {
          $$ = make_identifier_reference($1, 1);
          free($1);
      }
    | ID LBRACKET expression RBRACKET
      {
          $$ = make_array_reference($1, $3);
          free($1);
      }
    ;

assignment_expr
    : lvalue ASSIGN expression
      {
          $$ = make_assignment_node($1, $3);
      }
    ;

assignment
    : assignment_expr SEMICOLON
      { $$ = $1; }
    ;

print_stmt
    : DEKHAO LPAREN expression RPAREN SEMICOLON
      {
          $$ = ast_make_unary(AST_PRINT, "print", $3, line_no);
      }
    ;

input_stmt
    : NAO LPAREN lvalue RPAREN SEMICOLON
      {
          $$ = ast_make_unary(AST_INPUT, "input", $3, line_no);
      }
    ;

block
    : LBRACE
      {
          symtab_enter_scope();
      }
      statements_opt RBRACE
      {
          $$ = ast_make_node(AST_BLOCK, "block", line_no);
          ast_append_child($$, $3);
          symtab_leave_scope();
      }
    | LBRACE
      {
          symtab_enter_scope();
      }
      error RBRACE
      {
          AstNode *empty_statements = ast_make_node(AST_STATEMENT_LIST, "stmts", line_no);
          add_error("syntax", line_no, "recovered after an invalid block");
          yyerrok;
          $$ = ast_make_node(AST_BLOCK, "block", line_no);
          ast_append_child($$, empty_statements);
          symtab_leave_scope();
      }
    ;

if_stmt
    : JODI LPAREN expression RPAREN block
      {
          ensure_boolean_condition($3, "if");
          $$ = ast_make_node(AST_IF, "if", line_no);
          ast_append_child($$, $3);
          ast_append_child($$, $5);
      }
    | JODI LPAREN expression RPAREN block NAILE block
      {
          ensure_boolean_condition($3, "if");
          $$ = ast_make_node(AST_IF, "if", line_no);
          ast_append_child($$, $3);
          ast_append_child($$, $5);
          ast_append_child($$, $7);
      }
    ;

while_loop
    : JOTOKHON LPAREN expression RPAREN block
      {
          ensure_boolean_condition($3, "while");
          $$ = ast_make_node(AST_WHILE, "while", line_no);
          ast_append_child($$, $3);
          ast_append_child($$, $5);
      }
    ;

for_loop
    : GHURAO LPAREN for_init SEMICOLON for_condition SEMICOLON for_step RPAREN block
      {
          $$ = ast_make_node(AST_FOR, "for", line_no);
          ast_append_child($$, $3);
          ast_append_child($$, $5);
          ast_append_child($$, $7);
          ast_append_child($$, $9);
      }
    ;

for_init
    : assignment_expr
      { $$ = $1; }
    | %empty
      { $$ = make_empty_node(); }
    ;

for_condition
    : expression
      {
          ensure_boolean_condition($1, "for");
          $$ = $1;
      }
    | %empty
      {
          $$ = make_empty_node();
          ast_set_value_type($$, TYPE_SHOTTO);
      }
    ;

for_step
    : assignment_expr
      { $$ = $1; }
    | %empty
      { $$ = make_empty_node(); }
    ;

return_stmt
    : FEROT expression SEMICOLON
      {
          char buffer[192];

          if (function_depth == 0) {
              push_semantic_error("ferot can only be used inside a function");
          } else if (current_function_return_type == TYPE_KHALI) {
              snprintf(buffer,
                       sizeof(buffer),
                       "function '%s' returns khali and cannot return a value",
                       current_function_name ? current_function_name : "<anonymous>");
              push_semantic_error(buffer);
          } else if (!types_compatible(current_function_return_type, $2->value_type)) {
              snprintf(buffer,
                       sizeof(buffer),
                       "function '%s' must return %s but received %s",
                       current_function_name ? current_function_name : "<anonymous>",
                       diamond_type_name(current_function_return_type),
                       diamond_type_name($2->value_type));
              push_semantic_error_at($2->line, buffer);
          }

          $$ = ast_make_unary(AST_RETURN, "return", $2, line_no);
          ast_set_value_type($$, $2->value_type);
      }
    | FEROT SEMICOLON
      {
          char buffer[192];

          if (function_depth == 0) {
              push_semantic_error("ferot can only be used inside a function");
          } else if (current_function_return_type != TYPE_KHALI) {
              snprintf(buffer,
                       sizeof(buffer),
                       "function '%s' must return %s before reaching ferot;",
                       current_function_name ? current_function_name : "<anonymous>",
                       diamond_type_name(current_function_return_type));
              push_semantic_error(buffer);
          }

          $$ = ast_make_node(AST_RETURN, "return", line_no);
          ast_set_value_type($$, TYPE_KHALI);
      }
    ;

func_call
    : ID LPAREN arg_list_opt RPAREN
      {
          $$ = make_function_call($1, $3);
          free($1);
      }
    ;

arg_list_opt
    : arg_list
      { $$ = $1; }
    | %empty
      { $$ = ast_make_node(AST_ARGUMENT_LIST, "args", line_no); }
    ;

arg_list
    : arg_list COMMA expression
      {
          $$ = ast_append_child($1, $3);
      }
    | expression
      {
          $$ = ast_make_node(AST_ARGUMENT_LIST, "args", line_no);
          ast_append_child($$, $1);
      }
    ;

expression
    : logical_or
      { $$ = $1; }
    ;

logical_or
    : logical_or BA logical_and
      { $$ = make_binary_expression("ba", $1, $3); }
    | logical_and
      { $$ = $1; }
    ;

logical_and
    : logical_and EBONG equality
      { $$ = make_binary_expression("ebong", $1, $3); }
    | equality
      { $$ = $1; }
    ;

equality
    : equality EQ comparison
      { $$ = make_binary_expression("==", $1, $3); }
    | equality NE comparison
      { $$ = make_binary_expression("!=", $1, $3); }
    | comparison
      { $$ = $1; }
    ;

comparison
    : comparison LT additive
      { $$ = make_binary_expression("<", $1, $3); }
    | comparison GT additive
      { $$ = make_binary_expression(">", $1, $3); }
    | comparison LE additive
      { $$ = make_binary_expression("<=", $1, $3); }
    | comparison GE additive
      { $$ = make_binary_expression(">=", $1, $3); }
    | additive
      { $$ = $1; }
    ;

additive
    : additive PLUS multiplicative
      { $$ = make_binary_expression("+", $1, $3); }
    | additive MINUS multiplicative
      { $$ = make_binary_expression("-", $1, $3); }
    | multiplicative
      { $$ = $1; }
    ;

multiplicative
    : multiplicative MUL unary
      { $$ = make_binary_expression("*", $1, $3); }
    | multiplicative DIV unary
      { $$ = make_binary_expression("/", $1, $3); }
    | unary
      { $$ = $1; }
    ;

unary
    : MINUS unary %prec UMINUS
      { $$ = make_unary_expression("-", $2); }
    | NA unary
      { $$ = make_unary_expression("na", $2); }
    | factor
      { $$ = $1; }
    ;

factor
    : NUMBER_INT
      { $$ = make_int_literal($1); }
    | NUMBER_FLOAT
      { $$ = make_float_literal($1); }
    | STRING
      {
          $$ = make_string_literal($1);
          free($1);
      }
    | SHOTTO
      { $$ = make_bool_literal("shotto"); }
    | MITHYA
      { $$ = make_bool_literal("mithya"); }
    | ID
      {
          $$ = make_identifier_reference($1, 1);
          free($1);
      }
    | ID LBRACKET expression RBRACKET
      {
          $$ = make_array_reference($1, $3);
          free($1);
      }
    | func_call
      {
          if ($1 && $1->value_type == TYPE_KHALI) {
              push_semantic_error("khali-returning function calls cannot be used as expressions");
          }
          $$ = $1;
      }
    | LPAREN expression RPAREN
      { $$ = $2; }
    ;

%%

void yyerror(const char *s) {
    add_error("syntax", line_no, s);
}
