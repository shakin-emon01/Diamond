#ifndef DIAMOND_AST_H
#define DIAMOND_AST_H

#include "symtab.h"

typedef enum {
    AST_PROGRAM,
    AST_BLOCK,
    AST_STATEMENT_LIST,
    AST_DECLARATION,
    AST_ASSIGNMENT,
    AST_IF,
    AST_WHILE,
    AST_FOR,
    AST_PRINT,
    AST_INPUT,
    AST_RETURN,
    AST_FUNC_DECL,
    AST_FUNC_CALL,
    AST_PARAM_LIST,
    AST_ARGUMENT_LIST,
    AST_BIN_OP,
    AST_UNARY_OP,
    AST_LITERAL_INT,
    AST_LITERAL_FLOAT,
    AST_LITERAL_STRING,
    AST_LITERAL_BOOL,
    AST_IDENTIFIER,
    AST_ARRAY_REF,
    AST_EMPTY
} AstNodeType;

typedef struct AstNode {
    AstNodeType type;
    const char *text;
    struct AstNode **children;
    int child_count;
    int line;
    DiamondType value_type;
    int array_size;
} AstNode;

AstNode    *ast_make_node(AstNodeType type, const char *text, int line);
AstNode    *ast_make_typed_node(AstNodeType type, const char *text, int line, DiamondType value_type);
AstNode    *ast_make_unary(AstNodeType type, const char *text, AstNode *child, int line);
AstNode    *ast_make_binary(AstNodeType type, const char *text, AstNode *left, AstNode *right);
AstNode    *ast_append_child(AstNode *parent, AstNode *child);
void        ast_set_value_type(AstNode *node, DiamondType value_type);
void        ast_free(AstNode *node);
void        ast_print(const AstNode *node, int indent);
const char *ast_type_name(AstNodeType type);

#endif /* DIAMOND_AST_H */

