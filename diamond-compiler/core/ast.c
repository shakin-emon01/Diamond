#include "ast.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static char *dup_text(const char *s) {
    if (!s) return NULL;

    size_t len = strlen(s) + 1;
    char *copy = (char *)malloc(len);
    if (!copy) {
        return NULL;
    }

    memcpy(copy, s, len);
    return copy;
}

AstNode *ast_make_typed_node(AstNodeType type, const char *text, int line, DiamondType value_type) {
    AstNode *node = (AstNode *)calloc(1, sizeof(AstNode));
    if (!node) {
        return NULL;
    }

    node->type = type;
    node->text = dup_text(text);
    node->line = line;
    node->value_type = value_type;
    node->array_size = -1;
    return node;
}

AstNode *ast_make_node(AstNodeType type, const char *text, int line) {
    return ast_make_typed_node(type, text, line, TYPE_UNKNOWN);
}

AstNode *ast_make_unary(AstNodeType type, const char *text, AstNode *child, int line) {
    AstNode *node = ast_make_node(type, text, line);
    if (!node) {
        return NULL;
    }

    ast_append_child(node, child);
    return node;
}

AstNode *ast_make_binary(AstNodeType type, const char *text, AstNode *left, AstNode *right) {
    int line = left ? left->line : (right ? right->line : 0);
    AstNode *node = ast_make_node(type, text, line);
    if (!node) {
        return NULL;
    }

    ast_append_child(node, left);
    ast_append_child(node, right);
    return node;
}

AstNode *ast_append_child(AstNode *parent, AstNode *child) {
    AstNode **new_children = NULL;

    if (!parent || !child) {
        return parent;
    }

    new_children = (AstNode **)realloc(parent->children, sizeof(AstNode *) * (parent->child_count + 1));
    if (!new_children) {
        return parent;
    }

    parent->children = new_children;
    parent->children[parent->child_count++] = child;
    return parent;
}

void ast_set_value_type(AstNode *node, DiamondType value_type) {
    if (node) {
        node->value_type = value_type;
    }
}

void ast_free(AstNode *node) {
    int i;

    if (!node) {
        return;
    }

    for (i = 0; i < node->child_count; ++i) {
        ast_free(node->children[i]);
    }

    free(node->children);
    free((char *)node->text);
    free(node);
}

const char *ast_type_name(AstNodeType type) {
    switch (type) {
    case AST_PROGRAM: return "PROGRAM";
    case AST_BLOCK: return "BLOCK";
    case AST_STATEMENT_LIST: return "STATEMENT_LIST";
    case AST_DECLARATION: return "DECLARATION";
    case AST_ASSIGNMENT: return "ASSIGNMENT";
    case AST_IF: return "IF";
    case AST_WHILE: return "WHILE";
    case AST_FOR: return "FOR";
    case AST_PRINT: return "PRINT";
    case AST_INPUT: return "INPUT";
    case AST_RETURN: return "RETURN";
    case AST_FUNC_DECL: return "FUNCTION_DECL";
    case AST_FUNC_CALL: return "FUNCTION_CALL";
    case AST_PARAM_LIST: return "PARAM_LIST";
    case AST_ARGUMENT_LIST: return "ARGUMENT_LIST";
    case AST_BIN_OP: return "BINARY_OP";
    case AST_UNARY_OP: return "UNARY_OP";
    case AST_LITERAL_INT: return "INT_LITERAL";
    case AST_LITERAL_FLOAT: return "FLOAT_LITERAL";
    case AST_LITERAL_STRING: return "STRING_LITERAL";
    case AST_LITERAL_BOOL: return "BOOL_LITERAL";
    case AST_IDENTIFIER: return "IDENTIFIER";
    case AST_ARRAY_REF: return "ARRAY_REF";
    case AST_EMPTY: return "EMPTY";
    default: return "UNKNOWN";
    }
}

void ast_print(const AstNode *node, int indent) {
    int i;

    if (!node) {
        return;
    }

    for (i = 0; i < indent; ++i) {
        printf("  ");
    }

    printf("%s", ast_type_name(node->type));
    if (node->text) {
        printf(" [%s]", node->text);
    }
    printf(" <%s> (line %d)\n", diamond_type_name(node->value_type), node->line);

    for (i = 0; i < node->child_count; ++i) {
        ast_print(node->children[i], indent + 1);
    }
}

