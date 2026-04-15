#include "tac.h"

#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

typedef struct {
    char *data;
    size_t length;
    size_t capacity;
} TextBuilder;

typedef struct {
    char *op;
    char *arg1;
    char *arg2;
    char *result;
} ExprBinding;

static TacInstruction *raw_first = NULL;
static TacInstruction *raw_last = NULL;
static TacInstruction *opt_first = NULL;
static TacInstruction *opt_last = NULL;
static int raw_instruction_count = 0;
static int optimized_instruction_count = 0;
static int temp_counter = 0;
static int label_counter = 0;
static char *assembly_listing = NULL;
static TacStats stats = { 0 };

static char *dup_string(const char *s);
static void free_string(char *value);
static char *make_temp(void);
static char *make_label(void);
static TacInstruction *tac_append_to(TacInstruction **first,
                                     TacInstruction **last,
                                     int *count,
                                     const char *op,
                                     const char *arg1,
                                     const char *arg2,
                                     const char *result);
static void free_instruction_list(TacInstruction **first, TacInstruction **last);
static void clone_raw_to_optimized(void);
static char *emit_expression(const AstNode *node);
static void emit_statement(const AstNode *node);
static void pass_constant_fold_and_strength(void);
static void pass_common_subexpression(void);
static void pass_dead_code(void);
static void build_assembly_listing(void);

static char *dup_string(const char *s) {
    size_t len = 0;
    char *copy = NULL;

    if (!s) {
        return NULL;
    }

    len = strlen(s) + 1;
    copy = (char *)malloc(len);
    if (!copy) {
        return NULL;
    }

    memcpy(copy, s, len);
    return copy;
}

static void free_string(char *value) {
    if (value) {
        free(value);
    }
}

static char *make_name(const char *prefix, int value) {
    char buffer[32];

    snprintf(buffer, sizeof(buffer), "%s%d", prefix, value);
    return dup_string(buffer);
}

static char *make_temp(void) {
    temp_counter++;
    return make_name("t", temp_counter);
}

static char *make_label(void) {
    label_counter++;
    return make_name("L", label_counter);
}

static TacInstruction *tac_append_to(TacInstruction **first,
                                     TacInstruction **last,
                                     int *count,
                                     const char *op,
                                     const char *arg1,
                                     const char *arg2,
                                     const char *result) {
    TacInstruction *instruction = (TacInstruction *)calloc(1, sizeof(TacInstruction));
    if (!instruction) {
        return NULL;
    }

    instruction->index = (*count)++;
    instruction->op = dup_string(op);
    instruction->arg1 = dup_string(arg1);
    instruction->arg2 = dup_string(arg2);
    instruction->result = dup_string(result);

    if (!*first) {
        *first = instruction;
        *last = instruction;
        return instruction;
    }

    (*last)->next = instruction;
    *last = instruction;
    return instruction;
}

static void free_instruction(TacInstruction *instruction) {
    if (!instruction) {
        return;
    }

    free_string(instruction->op);
    free_string(instruction->arg1);
    free_string(instruction->arg2);
    free_string(instruction->result);
    free(instruction);
}

static void free_instruction_list(TacInstruction **first, TacInstruction **last) {
    TacInstruction *instruction = NULL;

    if (!first) {
        return;
    }

    instruction = *first;
    while (instruction) {
        TacInstruction *next = instruction->next;
        free_instruction(instruction);
        instruction = next;
    }

    *first = NULL;
    if (last) {
        *last = NULL;
    }
}

static void clone_raw_to_optimized(void) {
    const TacInstruction *cursor = raw_first;

    free_instruction_list(&opt_first, &opt_last);
    optimized_instruction_count = 0;

    while (cursor) {
        tac_append_to(&opt_first,
                      &opt_last,
                      &optimized_instruction_count,
                      cursor->op,
                      cursor->arg1,
                      cursor->arg2,
                      cursor->result);
        cursor = cursor->next;
    }
}

static void emit_raw(const char *op, const char *arg1, const char *arg2, const char *result) {
    tac_append_to(&raw_first, &raw_last, &raw_instruction_count, op, arg1, arg2, result);
}

static char *emit_expression(const AstNode *node) {
    char *left = NULL;
    char *right = NULL;
    char *temp = NULL;
    char arg_count_text[16];
    int i = 0;

    if (!node) {
        return NULL;
    }

    switch (node->type) {
    case AST_LITERAL_INT:
    case AST_LITERAL_FLOAT:
    case AST_LITERAL_STRING:
    case AST_LITERAL_BOOL:
    case AST_IDENTIFIER:
        return dup_string(node->text ? node->text : "");

    case AST_ARRAY_REF:
        left = emit_expression(node->child_count > 0 ? node->children[0] : NULL);
        temp = make_temp();
        emit_raw("load_index", node->text, left, temp);
        free_string(left);
        return temp;

    case AST_UNARY_OP:
        left = emit_expression(node->child_count > 0 ? node->children[0] : NULL);
        temp = make_temp();
        emit_raw(node->text ? node->text : "unary", left, NULL, temp);
        free_string(left);
        return temp;

    case AST_BIN_OP:
        left = emit_expression(node->child_count > 0 ? node->children[0] : NULL);
        right = emit_expression(node->child_count > 1 ? node->children[1] : NULL);
        temp = make_temp();
        emit_raw(node->text ? node->text : "binop", left, right, temp);
        free_string(left);
        free_string(right);
        return temp;

    case AST_FUNC_CALL:
        if (node->child_count > 0 && node->children[0]) {
            for (i = 0; i < node->children[0]->child_count; ++i) {
                char *arg_value = emit_expression(node->children[0]->children[i]);
                emit_raw("param", arg_value, NULL, NULL);
                free_string(arg_value);
            }
            snprintf(arg_count_text, sizeof(arg_count_text), "%d", node->children[0]->child_count);
        } else {
            snprintf(arg_count_text, sizeof(arg_count_text), "%d", 0);
        }

        temp = make_temp();
        emit_raw("call", node->text, arg_count_text, temp);
        return temp;

    default:
        return dup_string(node->text ? node->text : "");
    }
}

static void emit_block_children(const AstNode *node) {
    int i = 0;
    if (!node) {
        return;
    }

    for (i = 0; i < node->child_count; ++i) {
        emit_statement(node->children[i]);
    }
}

static void emit_statement(const AstNode *node) {
    char *value = NULL;
    char *index_value = NULL;
    char *start_label = NULL;
    char *else_label = NULL;
    char *end_label = NULL;
    char *condition = NULL;
    char count_text[16];

    if (!node) {
        return;
    }

    switch (node->type) {
    case AST_PROGRAM:
    case AST_BLOCK:
    case AST_STATEMENT_LIST:
        emit_block_children(node);
        return;

    case AST_DECLARATION:
        if (node->array_size >= 0) {
            emit_raw("decl_array",
                     diamond_type_name(node->value_type),
                     node->child_count > 0 ? node->children[0]->text : NULL,
                     node->text);
        } else {
            emit_raw("decl", diamond_type_name(node->value_type), NULL, node->text);
        }
        if (node->array_size < 0 && node->child_count > 0) {
            value = emit_expression(node->children[node->child_count - 1]);
            emit_raw("=", value, NULL, node->text);
            free_string(value);
        }
        return;

    case AST_ASSIGNMENT:
        if (node->child_count < 2) {
            return;
        }
        value = emit_expression(node->children[1]);
        if (node->children[0]->type == AST_ARRAY_REF && node->children[0]->child_count > 0) {
            index_value = emit_expression(node->children[0]->children[0]);
            emit_raw("store_index", value, index_value, node->children[0]->text);
            free_string(index_value);
        } else {
            emit_raw("=", value, NULL, node->children[0]->text);
        }
        free_string(value);
        return;

    case AST_PRINT:
        value = emit_expression(node->child_count > 0 ? node->children[0] : NULL);
        emit_raw("print", value, NULL, NULL);
        free_string(value);
        return;

    case AST_INPUT:
        emit_raw("input", NULL, NULL, node->child_count > 0 ? node->children[0]->text : node->text);
        return;

    case AST_RETURN:
        if (node->child_count > 0) {
            value = emit_expression(node->children[0]);
            emit_raw("return", value, NULL, NULL);
            free_string(value);
        } else {
            emit_raw("return", NULL, NULL, NULL);
        }
        return;

    case AST_IF:
        condition = emit_expression(node->child_count > 0 ? node->children[0] : NULL);
        else_label = make_label();
        end_label = make_label();
        emit_raw("ifFalse", condition, NULL, else_label);
        emit_statement(node->child_count > 1 ? node->children[1] : NULL);
        if (node->child_count > 2) {
            emit_raw("goto", NULL, NULL, end_label);
            emit_raw("label", NULL, NULL, else_label);
            emit_statement(node->children[2]);
            emit_raw("label", NULL, NULL, end_label);
        } else {
            emit_raw("label", NULL, NULL, else_label);
        }
        free_string(condition);
        free_string(else_label);
        free_string(end_label);
        return;

    case AST_WHILE:
        start_label = make_label();
        end_label = make_label();
        emit_raw("label", NULL, NULL, start_label);
        condition = emit_expression(node->child_count > 0 ? node->children[0] : NULL);
        emit_raw("ifFalse", condition, NULL, end_label);
        emit_statement(node->child_count > 1 ? node->children[1] : NULL);
        emit_raw("goto", NULL, NULL, start_label);
        emit_raw("label", NULL, NULL, end_label);
        free_string(start_label);
        free_string(end_label);
        free_string(condition);
        return;

    case AST_FOR:
        emit_statement(node->child_count > 0 ? node->children[0] : NULL);
        start_label = make_label();
        end_label = make_label();
        emit_raw("label", NULL, NULL, start_label);
        if (node->child_count > 1 && node->children[1]->type != AST_EMPTY) {
            condition = emit_expression(node->children[1]);
            emit_raw("ifFalse", condition, NULL, end_label);
            free_string(condition);
        }
        emit_statement(node->child_count > 3 ? node->children[3] : NULL);
        emit_statement(node->child_count > 2 ? node->children[2] : NULL);
        emit_raw("goto", NULL, NULL, start_label);
        emit_raw("label", NULL, NULL, end_label);
        free_string(start_label);
        free_string(end_label);
        return;

    case AST_FUNC_DECL:
        snprintf(count_text,
                 sizeof(count_text),
                 "%d",
                 (node->child_count > 0 && node->children[0]) ? node->children[0]->child_count : 0);
        emit_raw("func", node->text, count_text, NULL);
        if (node->child_count > 1) {
            emit_statement(node->children[1]);
        }
        emit_raw("endfunc", node->text, NULL, NULL);
        return;

    case AST_FUNC_CALL:
        value = emit_expression(node);
        free_string(value);
        return;

    case AST_EMPTY:
        return;

    default:
        return;
    }
}

void tac_generate(const AstNode *root) {
    tac_clear();
    emit_statement(root);
    clone_raw_to_optimized();
    pass_constant_fold_and_strength();
    pass_common_subexpression();
    pass_dead_code();
    build_assembly_listing();
}

void tac_clear(void) {
    free_instruction_list(&raw_first, &raw_last);
    free_instruction_list(&opt_first, &opt_last);
    free_string(assembly_listing);
    assembly_listing = NULL;
    raw_instruction_count = 0;
    optimized_instruction_count = 0;
    temp_counter = 0;
    label_counter = 0;
    memset(&stats, 0, sizeof(stats));
}

const TacInstruction *tac_head(void) {
    return opt_first;
}

const TacInstruction *tac_raw_head(void) {
    return raw_first;
}

int tac_count(void) {
    return optimized_instruction_count;
}

int tac_raw_count(void) {
    return raw_instruction_count;
}

const char *tac_assembly(void) {
    return assembly_listing;
}

const TacStats *tac_stats(void) {
    return &stats;
}

static int tb_reserve(TextBuilder *builder, size_t extra) {
    size_t required = builder->length + extra + 1;
    char *resized = NULL;

    if (!builder->data) {
        return 0;
    }

    if (required <= builder->capacity) {
        return 1;
    }

    while (builder->capacity < required) {
        builder->capacity *= 2;
    }

    resized = (char *)realloc(builder->data, builder->capacity);
    if (!resized) {
        free(builder->data);
        builder->data = NULL;
        builder->length = 0;
        builder->capacity = 0;
        return 0;
    }

    builder->data = resized;
    return 1;
}

static void tb_init(TextBuilder *builder) {
    builder->capacity = 256;
    builder->length = 0;
    builder->data = (char *)malloc(builder->capacity);
    if (builder->data) {
        builder->data[0] = '\0';
    }
}

static int tb_append(TextBuilder *builder, const char *text) {
    size_t len = 0;

    if (!text) {
        return 1;
    }

    len = strlen(text);
    if (!tb_reserve(builder, len)) {
        return 0;
    }

    memcpy(builder->data + builder->length, text, len + 1);
    builder->length += len;
    return 1;
}

static int tb_appendf(TextBuilder *builder, const char *format, ...) {
    va_list args;
    va_list args_copy;
    int needed = 0;

    if (!builder->data) {
        return 0;
    }

    va_start(args, format);
    va_copy(args_copy, args);
    needed = vsnprintf(NULL, 0, format, args);
    va_end(args);

    if (needed < 0 || !tb_reserve(builder, (size_t)needed)) {
        va_end(args_copy);
        return 0;
    }

    vsnprintf(builder->data + builder->length, builder->capacity - builder->length, format, args_copy);
    va_end(args_copy);
    builder->length += (size_t)needed;
    return 1;
}

static int is_temp_name(const char *name) {
    const char *cursor = NULL;

    if (!name || name[0] != 't' || name[1] == '\0') {
        return 0;
    }

    cursor = name + 1;
    while (*cursor) {
        if (*cursor < '0' || *cursor > '9') {
            return 0;
        }
        cursor++;
    }

    return 1;
}

static int is_string_literal(const char *text) {
    size_t len = 0;

    if (!text) {
        return 0;
    }

    len = strlen(text);
    return len >= 2 && text[0] == '"' && text[len - 1] == '"';
}

static int is_bool_literal(const char *text) {
    return text && (strcmp(text, "shotto") == 0 || strcmp(text, "mithya") == 0);
}

static int parse_number(const char *text, double *value) {
    char *end = NULL;

    if (!text || is_string_literal(text) || is_bool_literal(text)) {
        return 0;
    }

    *value = strtod(text, &end);
    return end != text && end && *end == '\0';
}

static int is_literal(const char *text) {
    double ignored = 0.0;
    return is_string_literal(text) || is_bool_literal(text) || parse_number(text, &ignored);
}

static int is_zero_literal(const char *text) {
    double value = 0.0;
    return parse_number(text, &value) && value == 0.0;
}

static int is_one_literal(const char *text) {
    double value = 0.0;
    return parse_number(text, &value) && value == 1.0;
}

static int is_two_literal(const char *text) {
    double value = 0.0;
    return parse_number(text, &value) && value == 2.0;
}

static void replace_instruction(TacInstruction *instruction,
                                const char *op,
                                const char *arg1,
                                const char *arg2,
                                const char *result) {
    if (!instruction) {
        return;
    }

    free_string(instruction->op);
    free_string(instruction->arg1);
    free_string(instruction->arg2);
    free_string(instruction->result);
    instruction->op = dup_string(op);
    instruction->arg1 = dup_string(arg1);
    instruction->arg2 = dup_string(arg2);
    instruction->result = dup_string(result);
}

static char *make_numeric_literal(double value, int prefer_int) {
    char buffer[64];

    if (prefer_int) {
        snprintf(buffer, sizeof(buffer), "%ld", (long)value);
    } else {
        snprintf(buffer, sizeof(buffer), "%.6g", value);
    }

    return dup_string(buffer);
}

static char *literal_text_without_quotes(const char *text) {
    size_t len = 0;
    char *copy = NULL;

    if (!text) {
        return NULL;
    }

    if (!is_string_literal(text)) {
        return dup_string(text);
    }

    len = strlen(text);
    copy = (char *)malloc(len > 1 ? len - 1 : 1);
    if (!copy) {
        return NULL;
    }

    memcpy(copy, text + 1, len - 2);
    copy[len - 2] = '\0';
    return copy;
}

static char *quote_text(const char *text) {
    TextBuilder builder;
    const char *cursor = text;

    tb_init(&builder);
    if (!builder.data) {
        return NULL;
    }

    tb_append(&builder, "\"");
    while (cursor && *cursor) {
        if (*cursor == '"' || *cursor == '\\') {
            tb_appendf(&builder, "\\%c", *cursor);
        } else {
            tb_reserve(&builder, 1);
            builder.data[builder.length++] = *cursor;
            builder.data[builder.length] = '\0';
        }
        cursor++;
    }
    tb_append(&builder, "\"");
    return builder.data;
}

static int bool_value_of(const char *text, int *value) {
    if (!text) {
        return 0;
    }

    if (strcmp(text, "shotto") == 0) {
        *value = 1;
        return 1;
    }

    if (strcmp(text, "mithya") == 0) {
        *value = 0;
        return 1;
    }

    return 0;
}

static char *fold_instruction(const TacInstruction *instruction) {
    double left = 0.0;
    double right = 0.0;
    int left_bool = 0;
    int right_bool = 0;
    char *left_text = NULL;
    char *right_text = NULL;
    char *result = NULL;

    if (!instruction || !instruction->op) {
        return NULL;
    }

    if (strcmp(instruction->op, "na") == 0 && instruction->arg1 && !instruction->arg2) {
        if (bool_value_of(instruction->arg1, &left_bool)) {
            return dup_string(left_bool ? "mithya" : "shotto");
        }
        return NULL;
    }

    if (strcmp(instruction->op, "-") == 0 && instruction->arg1 && !instruction->arg2) {
        if (parse_number(instruction->arg1, &left)) {
            return make_numeric_literal(-left, strchr(instruction->arg1, '.') == NULL);
        }
        return NULL;
    }

    if (!instruction->arg1 || !instruction->arg2 || !is_literal(instruction->arg1) || !is_literal(instruction->arg2)) {
        return NULL;
    }

    if (strcmp(instruction->op, "+") == 0 &&
        parse_number(instruction->arg1, &left) &&
        parse_number(instruction->arg2, &right)) {
        return make_numeric_literal(left + right,
                                    strchr(instruction->arg1, '.') == NULL &&
                                    strchr(instruction->arg2, '.') == NULL);
    }

    if (parse_number(instruction->arg1, &left) && parse_number(instruction->arg2, &right)) {
        if (strcmp(instruction->op, "-") == 0) return make_numeric_literal(left - right, strchr(instruction->arg1, '.') == NULL && strchr(instruction->arg2, '.') == NULL);
        if (strcmp(instruction->op, "*") == 0) return make_numeric_literal(left * right, strchr(instruction->arg1, '.') == NULL && strchr(instruction->arg2, '.') == NULL);
        if (strcmp(instruction->op, "/") == 0 && right != 0.0) return make_numeric_literal(left / right, 0);
        if (strcmp(instruction->op, "<") == 0) return dup_string(left < right ? "shotto" : "mithya");
        if (strcmp(instruction->op, ">") == 0) return dup_string(left > right ? "shotto" : "mithya");
        if (strcmp(instruction->op, "<=") == 0) return dup_string(left <= right ? "shotto" : "mithya");
        if (strcmp(instruction->op, ">=") == 0) return dup_string(left >= right ? "shotto" : "mithya");
        if (strcmp(instruction->op, "==") == 0) return dup_string(left == right ? "shotto" : "mithya");
        if (strcmp(instruction->op, "!=") == 0) return dup_string(left != right ? "shotto" : "mithya");
    }

    if (bool_value_of(instruction->arg1, &left_bool) && bool_value_of(instruction->arg2, &right_bool)) {
        if (strcmp(instruction->op, "ebong") == 0) {
            return dup_string((left_bool && right_bool) ? "shotto" : "mithya");
        }
        if (strcmp(instruction->op, "ba") == 0) {
            return dup_string((left_bool || right_bool) ? "shotto" : "mithya");
        }
    }

    left_text = literal_text_without_quotes(instruction->arg1);
    right_text = literal_text_without_quotes(instruction->arg2);
    if (left_text && right_text && strcmp(instruction->op, "+") == 0) {
        TextBuilder builder;
        tb_init(&builder);
        if (builder.data) {
            tb_append(&builder, left_text);
            tb_append(&builder, right_text);
            result = quote_text(builder.data);
        }
        free(builder.data);
    } else if (left_text && right_text && strcmp(instruction->op, "==") == 0) {
        result = dup_string(strcmp(left_text, right_text) == 0 ? "shotto" : "mithya");
    } else if (left_text && right_text && strcmp(instruction->op, "!=") == 0) {
        result = dup_string(strcmp(left_text, right_text) != 0 ? "shotto" : "mithya");
    }

    free_string(left_text);
    free_string(right_text);
    return result;
}

static int apply_strength_reduction(TacInstruction *instruction) {
    if (!instruction || !instruction->op) {
        return 0;
    }

    if (strcmp(instruction->op, "*") == 0) {
        if (is_zero_literal(instruction->arg1) || is_zero_literal(instruction->arg2)) {
            replace_instruction(instruction, "=", "0", NULL, instruction->result);
            return 1;
        }
        if (is_one_literal(instruction->arg1)) {
            replace_instruction(instruction, "=", instruction->arg2, NULL, instruction->result);
            return 1;
        }
        if (is_one_literal(instruction->arg2)) {
            replace_instruction(instruction, "=", instruction->arg1, NULL, instruction->result);
            return 1;
        }
        if (is_two_literal(instruction->arg1)) {
            replace_instruction(instruction, "+", instruction->arg2, instruction->arg2, instruction->result);
            return 1;
        }
        if (is_two_literal(instruction->arg2)) {
            replace_instruction(instruction, "+", instruction->arg1, instruction->arg1, instruction->result);
            return 1;
        }
    }

    if (strcmp(instruction->op, "/") == 0 && is_one_literal(instruction->arg2)) {
        replace_instruction(instruction, "=", instruction->arg1, NULL, instruction->result);
        return 1;
    }

    if (strcmp(instruction->op, "+") == 0) {
        if (is_zero_literal(instruction->arg1)) {
            replace_instruction(instruction, "=", instruction->arg2, NULL, instruction->result);
            return 1;
        }
        if (is_zero_literal(instruction->arg2)) {
            replace_instruction(instruction, "=", instruction->arg1, NULL, instruction->result);
            return 1;
        }
    }

    if (strcmp(instruction->op, "-") == 0 && instruction->arg2 && is_zero_literal(instruction->arg2)) {
        replace_instruction(instruction, "=", instruction->arg1, NULL, instruction->result);
        return 1;
    }

    return 0;
}

static int is_commutative(const char *op) {
    return op &&
           (strcmp(op, "+") == 0 ||
            strcmp(op, "*") == 0 ||
            strcmp(op, "==") == 0 ||
            strcmp(op, "!=") == 0 ||
            strcmp(op, "ebong") == 0 ||
            strcmp(op, "ba") == 0);
}

static int is_expression_instruction(const TacInstruction *instruction) {
    const char *op = instruction ? instruction->op : NULL;

    return op &&
           (strcmp(op, "+") == 0 ||
            strcmp(op, "-") == 0 ||
            strcmp(op, "*") == 0 ||
            strcmp(op, "/") == 0 ||
            strcmp(op, "<") == 0 ||
            strcmp(op, ">") == 0 ||
            strcmp(op, "<=") == 0 ||
            strcmp(op, ">=") == 0 ||
            strcmp(op, "==") == 0 ||
            strcmp(op, "!=") == 0 ||
            strcmp(op, "ebong") == 0 ||
            strcmp(op, "ba") == 0 ||
            strcmp(op, "na") == 0);
}

static void pass_constant_fold_and_strength(void) {
    TacInstruction *instruction = opt_first;

    while (instruction) {
        char *folded = NULL;

        if (apply_strength_reduction(instruction)) {
            stats.strength_reductions++;
        }

        folded = fold_instruction(instruction);
        if (folded) {
            replace_instruction(instruction, "=", folded, NULL, instruction->result);
            free_string(folded);
            stats.constant_folds++;
        }

        instruction = instruction->next;
    }
}

static int instruction_breaks_block(const TacInstruction *instruction) {
    const char *op = instruction ? instruction->op : NULL;

    return op &&
           (strcmp(op, "label") == 0 ||
            strcmp(op, "goto") == 0 ||
            strcmp(op, "ifFalse") == 0 ||
            strcmp(op, "call") == 0 ||
            strcmp(op, "return") == 0 ||
            strcmp(op, "func") == 0 ||
            strcmp(op, "endfunc") == 0 ||
            strcmp(op, "print") == 0 ||
            strcmp(op, "param") == 0 ||
            strcmp(op, "input") == 0 ||
            strcmp(op, "store_index") == 0 ||
            strcmp(op, "load_index") == 0);
}

static void free_expr_bindings(ExprBinding *bindings, int count) {
    int i = 0;

    for (i = 0; i < count; ++i) {
        free_string(bindings[i].op);
        free_string(bindings[i].arg1);
        free_string(bindings[i].arg2);
        free_string(bindings[i].result);
    }

    free(bindings);
}

static void expr_kill_name(ExprBinding *bindings, int *count, const char *name) {
    int i = 0;

    if (!bindings || !count || !name) {
        return;
    }

    for (i = 0; i < *count;) {
        if ((bindings[i].result && strcmp(bindings[i].result, name) == 0) ||
            (bindings[i].arg1 && strcmp(bindings[i].arg1, name) == 0) ||
            (bindings[i].arg2 && strcmp(bindings[i].arg2, name) == 0)) {
            free_string(bindings[i].op);
            free_string(bindings[i].arg1);
            free_string(bindings[i].arg2);
            free_string(bindings[i].result);
            memmove(&bindings[i], &bindings[i + 1], sizeof(ExprBinding) * (size_t)(*count - i - 1));
            (*count)--;
        } else {
            ++i;
        }
    }
}

static void pass_common_subexpression(void) {
    TacInstruction *instruction = opt_first;
    ExprBinding *bindings = NULL;
    int binding_count = 0;
    int binding_capacity = 0;

    while (instruction) {
        if (instruction_breaks_block(instruction)) {
            while (binding_count > 0) {
                expr_kill_name(bindings, &binding_count, bindings[0].result);
            }
        }

        if (instruction->result) {
            expr_kill_name(bindings, &binding_count, instruction->result);
        }

        if (is_expression_instruction(instruction) && instruction->result) {
            const char *arg1 = instruction->arg1;
            const char *arg2 = instruction->arg2;
            int i = 0;

            if (is_commutative(instruction->op) && arg1 && arg2 && strcmp(arg1, arg2) > 0) {
                const char *tmp = arg1;
                arg1 = arg2;
                arg2 = tmp;
            }

            for (i = 0; i < binding_count; ++i) {
                if (strcmp(bindings[i].op, instruction->op) == 0 &&
                    strcmp(bindings[i].arg1 ? bindings[i].arg1 : "", arg1 ? arg1 : "") == 0 &&
                    strcmp(bindings[i].arg2 ? bindings[i].arg2 : "", arg2 ? arg2 : "") == 0) {
                    replace_instruction(instruction, "=", bindings[i].result, NULL, instruction->result);
                    stats.common_subexpressions++;
                    break;
                }
            }

            if (i == binding_count) {
                ExprBinding *resized = NULL;

                if (binding_count == binding_capacity) {
                    int next_capacity = binding_capacity == 0 ? 16 : binding_capacity * 2;
                    resized = (ExprBinding *)realloc(bindings, sizeof(ExprBinding) * (size_t)next_capacity);
                    if (resized) {
                        bindings = resized;
                        binding_capacity = next_capacity;
                    }
                }

                if (binding_count < binding_capacity) {
                    bindings[binding_count].op = dup_string(instruction->op);
                    bindings[binding_count].arg1 = dup_string(arg1);
                    bindings[binding_count].arg2 = dup_string(arg2);
                    bindings[binding_count].result = dup_string(instruction->result);
                    binding_count++;
                }
            }
        }

        instruction = instruction->next;
    }

    free_expr_bindings(bindings, binding_count);
}

static int instruction_uses_name(const TacInstruction *instruction, const char *name) {
    if (!instruction || !name || !instruction->op) {
        return 0;
    }

    if (instruction->arg1 && strcmp(instruction->arg1, name) == 0 &&
        (strcmp(instruction->op, "=") == 0 ||
         is_expression_instruction(instruction) ||
         strcmp(instruction->op, "ifFalse") == 0 ||
         strcmp(instruction->op, "print") == 0 ||
         strcmp(instruction->op, "param") == 0 ||
         strcmp(instruction->op, "return") == 0 ||
         strcmp(instruction->op, "store_index") == 0)) {
        return 1;
    }

    if (instruction->arg2 && strcmp(instruction->arg2, name) == 0 &&
        (is_expression_instruction(instruction) ||
         strcmp(instruction->op, "store_index") == 0 ||
         strcmp(instruction->op, "load_index") == 0)) {
        return 1;
    }

    if (instruction->op && strcmp(instruction->op, "load_index") == 0 &&
        instruction->arg1 && strcmp(instruction->arg1, name) == 0) {
        return 1;
    }

    return 0;
}

static int is_side_effect_free_instruction(const TacInstruction *instruction) {
    return instruction &&
           (is_expression_instruction(instruction) ||
            (instruction->op && strcmp(instruction->op, "=") == 0) ||
            (instruction->op && strcmp(instruction->op, "load_index") == 0));
}

static void remove_opt_instruction(TacInstruction *previous, TacInstruction *instruction) {
    TacInstruction *next = instruction ? instruction->next : NULL;

    if (!instruction) {
        return;
    }

    if (previous) {
        previous->next = next;
    } else {
        opt_first = next;
    }

    if (opt_last == instruction) {
        opt_last = previous;
    }

    free_instruction(instruction);
    optimized_instruction_count--;
}

static void pass_dead_code(void) {
    int changed = 1;

    while (changed) {
        TacInstruction *previous = NULL;
        TacInstruction *instruction = opt_first;
        int unreachable = 0;
        changed = 0;

        while (instruction) {
            TacInstruction *next = instruction->next;

            if (unreachable) {
                if (instruction->op &&
                    (strcmp(instruction->op, "label") == 0 || strcmp(instruction->op, "endfunc") == 0)) {
                    unreachable = 0;
                } else {
                    remove_opt_instruction(previous, instruction);
                    stats.unreachable_removed++;
                    instruction = next;
                    changed = 1;
                    continue;
                }
            }

            if (instruction->op &&
                (strcmp(instruction->op, "goto") == 0 || strcmp(instruction->op, "return") == 0)) {
                unreachable = 1;
            }

            if (instruction->result &&
                is_temp_name(instruction->result) &&
                is_side_effect_free_instruction(instruction)) {
                TacInstruction *cursor = next;
                int used = 0;

                while (cursor) {
                    if (instruction_uses_name(cursor, instruction->result)) {
                        used = 1;
                        break;
                    }
                    if (cursor->result && strcmp(cursor->result, instruction->result) == 0) {
                        break;
                    }
                    cursor = cursor->next;
                }

                if (!used) {
                    remove_opt_instruction(previous, instruction);
                    stats.dead_code_eliminated++;
                    instruction = next;
                    changed = 1;
                    continue;
                }
            }

            previous = instruction;
            instruction = next;
        }
    }

    {
        TacInstruction *cursor = opt_first;
        int index = 0;
        while (cursor) {
            cursor->index = index++;
            cursor = cursor->next;
        }
        optimized_instruction_count = index;
    }
}

static const char *opcode_for(const char *op) {
    if (!op) return "NOP";
    if (strcmp(op, "+") == 0) return "ADD";
    if (strcmp(op, "-") == 0) return "SUB";
    if (strcmp(op, "*") == 0) return "MUL";
    if (strcmp(op, "/") == 0) return "DIV";
    if (strcmp(op, "<") == 0) return "CMP_LT";
    if (strcmp(op, ">") == 0) return "CMP_GT";
    if (strcmp(op, "<=") == 0) return "CMP_LE";
    if (strcmp(op, ">=") == 0) return "CMP_GE";
    if (strcmp(op, "==") == 0) return "CMP_EQ";
    if (strcmp(op, "!=") == 0) return "CMP_NE";
    if (strcmp(op, "ebong") == 0) return "AND";
    if (strcmp(op, "ba") == 0) return "OR";
    if (strcmp(op, "na") == 0) return "NOT";
    return op;
}

static void build_assembly_listing(void) {
    TextBuilder builder;
    const TacInstruction *instruction = opt_first;

    free_string(assembly_listing);
    assembly_listing = NULL;

    tb_init(&builder);
    if (!builder.data) {
        return;
    }

    while (instruction) {
        if (instruction->op && strcmp(instruction->op, "label") == 0) {
            tb_appendf(&builder, "%s:\n", instruction->result ? instruction->result : "L?");
        } else if (instruction->op && strcmp(instruction->op, "func") == 0) {
            tb_appendf(&builder, "FUNC %s ; params=%s\n",
                       instruction->arg1 ? instruction->arg1 : "<anon>",
                       instruction->arg2 ? instruction->arg2 : "0");
        } else if (instruction->op && strcmp(instruction->op, "endfunc") == 0) {
            tb_appendf(&builder, "ENDFUNC %s\n", instruction->arg1 ? instruction->arg1 : "<anon>");
        } else if (instruction->op && strcmp(instruction->op, "decl") == 0) {
            tb_appendf(&builder, "ALLOC %s ; type=%s\n",
                       instruction->result ? instruction->result : "_",
                       instruction->arg1 ? instruction->arg1 : "unknown");
        } else if (instruction->op && strcmp(instruction->op, "decl_array") == 0) {
            tb_appendf(&builder, "ALLOC_ARRAY %s, %s ; type=%s\n",
                       instruction->result ? instruction->result : "_",
                       instruction->arg2 ? instruction->arg2 : "0",
                       instruction->arg1 ? instruction->arg1 : "unknown");
        } else if (instruction->op && strcmp(instruction->op, "=") == 0) {
            tb_appendf(&builder, "MOV %s, %s\n",
                       instruction->result ? instruction->result : "_",
                       instruction->arg1 ? instruction->arg1 : "0");
        } else if (instruction->op && strcmp(instruction->op, "goto") == 0) {
            tb_appendf(&builder, "JMP %s\n", instruction->result ? instruction->result : "L?");
        } else if (instruction->op && strcmp(instruction->op, "ifFalse") == 0) {
            tb_appendf(&builder, "JZ %s, %s\n",
                       instruction->arg1 ? instruction->arg1 : "0",
                       instruction->result ? instruction->result : "L?");
        } else if (instruction->op && strcmp(instruction->op, "print") == 0) {
            tb_appendf(&builder, "PRINT %s\n", instruction->arg1 ? instruction->arg1 : "0");
        } else if (instruction->op && strcmp(instruction->op, "input") == 0) {
            tb_appendf(&builder, "INPUT %s\n", instruction->result ? instruction->result : "_");
        } else if (instruction->op && strcmp(instruction->op, "param") == 0) {
            tb_appendf(&builder, "PARAM %s\n", instruction->arg1 ? instruction->arg1 : "0");
        } else if (instruction->op && strcmp(instruction->op, "call") == 0) {
            tb_appendf(&builder, "CALL %s, %s -> %s\n",
                       instruction->arg1 ? instruction->arg1 : "<anon>",
                       instruction->arg2 ? instruction->arg2 : "0",
                       instruction->result ? instruction->result : "_");
        } else if (instruction->op && strcmp(instruction->op, "return") == 0) {
            if (instruction->arg1) {
                tb_appendf(&builder, "RET %s\n", instruction->arg1);
            } else {
                tb_append(&builder, "RET\n");
            }
        } else if (instruction->op && strcmp(instruction->op, "load_index") == 0) {
            tb_appendf(&builder, "LOADIDX %s, %s, %s\n",
                       instruction->result ? instruction->result : "_",
                       instruction->arg1 ? instruction->arg1 : "_",
                       instruction->arg2 ? instruction->arg2 : "0");
        } else if (instruction->op && strcmp(instruction->op, "store_index") == 0) {
            tb_appendf(&builder, "STOREIDX %s, %s, %s\n",
                       instruction->result ? instruction->result : "_",
                       instruction->arg2 ? instruction->arg2 : "0",
                       instruction->arg1 ? instruction->arg1 : "0");
        } else if (instruction->result && instruction->arg2) {
            tb_appendf(&builder, "%s %s, %s, %s\n",
                       opcode_for(instruction->op),
                       instruction->result,
                       instruction->arg1 ? instruction->arg1 : "0",
                       instruction->arg2);
        } else if (instruction->result) {
            tb_appendf(&builder, "%s %s, %s\n",
                       opcode_for(instruction->op),
                       instruction->result,
                       instruction->arg1 ? instruction->arg1 : "0");
        } else {
            tb_appendf(&builder, "%s\n", opcode_for(instruction->op));
        }

        instruction = instruction->next;
    }

    assembly_listing = builder.data;
}
