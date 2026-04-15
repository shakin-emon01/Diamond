#include <stdarg.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "ast.h"
#include "parser.tab.h"
#include "preprocess.h"
#include "symtab.h"
#include "tac.h"

typedef struct {
    char type[24];
    int line;
    char message[256];
} DiamondError;

typedef struct {
    char *type;
    char *lexeme;
    int line;
} DiamondToken;

typedef struct {
    char *data;
    size_t length;
    size_t capacity;
} StringBuilder;

typedef void *YY_BUFFER_STATE;

AstNode *root_ast = NULL;
int g_suppress_lex_errors = 0;

extern int yyparse(void);
extern int yylex(void);
extern int line_no;
extern char *yytext;
extern YYSTYPE yylval;
extern int yydebug;
extern YY_BUFFER_STATE yy_scan_string(const char *source);
extern void yy_delete_buffer(YY_BUFFER_STATE buffer);

#define DIAMOND_MAX_ERRORS 200
#define DIAMOND_MAX_FILE_BYTES (1024 * 1024)  /* 1 MB */

static DiamondError *g_errors = NULL;
static int g_error_count = 0;
static int g_error_capacity = 0;
static DiamondToken *g_tokens = NULL;
static int g_token_count = 0;
static int g_token_capacity = 0;
static int g_parse_trace_enabled = 0;
static StringBuilder g_parse_trace = { 0 };
static DiamondPreprocessStats g_preprocess_stats = { 0 };

static char *dup_string(const char *text) {
    size_t len = 0;
    char *copy = NULL;

    if (!text) {
        return NULL;
    }

    len = strlen(text) + 1;
    copy = (char *)malloc(len);
    if (!copy) {
        return NULL;
    }

    memcpy(copy, text, len);
    return copy;
}

static void sb_init(StringBuilder *builder) {
    builder->capacity = 1024;
    builder->length = 0;
    builder->data = (char *)malloc(builder->capacity);
    if (builder->data) {
        builder->data[0] = '\0';
    }
}

static int sb_reserve(StringBuilder *builder, size_t extra) {
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

static int sb_append(StringBuilder *builder, const char *text) {
    size_t len = 0;

    if (!text) {
        return sb_append(builder, "null");
    }

    len = strlen(text);
    if (!sb_reserve(builder, len)) {
        return 0;
    }

    memcpy(builder->data + builder->length, text, len + 1);
    builder->length += len;
    return 1;
}

static int sb_appendf(StringBuilder *builder, const char *format, ...) {
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

    if (needed < 0 || !sb_reserve(builder, (size_t)needed)) {
        va_end(args_copy);
        return 0;
    }

    vsnprintf(builder->data + builder->length, builder->capacity - builder->length, format, args_copy);
    va_end(args_copy);
    builder->length += (size_t)needed;
    return 1;
}

static int sb_append_json_string(StringBuilder *builder, const char *text) {
    const unsigned char *cursor = (const unsigned char *)text;

    if (!text) {
        return sb_append(builder, "null");
    }

    if (!sb_append(builder, "\"")) {
        return 0;
    }

    while (*cursor) {
        switch (*cursor) {
        case '\\': if (!sb_append(builder, "\\\\")) return 0; break;
        case '"': if (!sb_append(builder, "\\\"")) return 0; break;
        case '\n': if (!sb_append(builder, "\\n")) return 0; break;
        case '\r': if (!sb_append(builder, "\\r")) return 0; break;
        case '\t': if (!sb_append(builder, "\\t")) return 0; break;
        default:
            if (*cursor < 0x20) {
                if (!sb_appendf(builder, "\\u%04x", *cursor)) return 0;
            } else {
                if (!sb_reserve(builder, 1)) return 0;
                builder->data[builder->length++] = (char)*cursor;
                builder->data[builder->length] = '\0';
            }
            break;
        }
        cursor++;
    }

    return sb_append(builder, "\"");
}

static void reset_errors(void) {
    free(g_errors);
    g_errors = NULL;
    g_error_count = 0;
    g_error_capacity = 0;
}

static void reset_parse_trace(void) {
    free(g_parse_trace.data);
    g_parse_trace.data = NULL;
    g_parse_trace.length = 0;
    g_parse_trace.capacity = 0;
}

static void ensure_parse_trace_builder(void) {
    if (!g_parse_trace.data) {
        sb_init(&g_parse_trace);
    }
}

static int env_enabled(const char *value) {
    if (!value || !*value) {
        return 0;
    }

    return strcmp(value, "0") != 0 &&
           strcmp(value, "false") != 0 &&
           strcmp(value, "FALSE") != 0;
}

int diamond_parse_trace_enabled(void) {
    return g_parse_trace_enabled;
}

void diamond_parse_trace_log(const char *format, ...) {
    va_list args;
    va_list args_copy;
    int needed = 0;

    if (!g_parse_trace_enabled) {
        return;
    }

    ensure_parse_trace_builder();
    if (!g_parse_trace.data) {
        return;
    }

    va_start(args, format);
    va_copy(args_copy, args);
    needed = vsnprintf(NULL, 0, format, args);
    va_end(args);

    if (needed < 0 || !sb_reserve(&g_parse_trace, (size_t)needed + 1)) {
        va_end(args_copy);
        return;
    }

    vsnprintf(g_parse_trace.data + g_parse_trace.length,
              g_parse_trace.capacity - g_parse_trace.length,
              format,
              args_copy);
    va_end(args_copy);
    g_parse_trace.length += (size_t)needed;
    sb_append(&g_parse_trace, "\n");
}

void add_error(const char *type, int line, const char *msg) {
    DiamondError *error = NULL;
    DiamondError *resized = NULL;

    /* Hard cap: stop collecting errors after DIAMOND_MAX_ERRORS */
    if (g_error_count >= DIAMOND_MAX_ERRORS) {
        if (g_error_count == DIAMOND_MAX_ERRORS) {
            /* Grow once more to fit the sentinel */
            resized = (DiamondError *)realloc(g_errors, sizeof(DiamondError) * (size_t)(g_error_count + 1));
            if (resized) {
                g_errors = resized;
                error = &g_errors[g_error_count++];
                snprintf(error->type, sizeof(error->type), "internal");
                error->line = 0;
                snprintf(error->message, sizeof(error->message),
                         "Too many errors (%d). Further diagnostics suppressed.", DIAMOND_MAX_ERRORS);
            }
        }
        return;
    }

    /* Grow the dynamic array when needed */
    if (g_error_count == g_error_capacity) {
        int next_capacity = g_error_capacity == 0 ? 16 : g_error_capacity * 2;
        resized = (DiamondError *)realloc(g_errors, sizeof(DiamondError) * (size_t)next_capacity);
        if (!resized) {
            return;
        }
        g_errors = resized;
        g_error_capacity = next_capacity;
    }

    error = &g_errors[g_error_count++];
    snprintf(error->type, sizeof(error->type), "%s", type ? type : "error");
    error->line = line;
    snprintf(error->message, sizeof(error->message), "%s", msg ? msg : "Unknown error");
}

static void clear_tokens(void) {
    int i = 0;

    for (i = 0; i < g_token_count; ++i) {
        free(g_tokens[i].type);
        free(g_tokens[i].lexeme);
    }

    free(g_tokens);
    g_tokens = NULL;
    g_token_count = 0;
    g_token_capacity = 0;
}

static int append_token(const char *type, const char *lexeme, int line) {
    DiamondToken *resized = NULL;
    DiamondToken *token = NULL;

    if (g_token_count == g_token_capacity) {
        int next_capacity = g_token_capacity == 0 ? 64 : g_token_capacity * 2;
        resized = (DiamondToken *)realloc(g_tokens, sizeof(DiamondToken) * next_capacity);
        if (!resized) {
            return 0;
        }
        g_tokens = resized;
        g_token_capacity = next_capacity;
    }

    token = &g_tokens[g_token_count++];
    token->type = dup_string(type);
    token->lexeme = dup_string(lexeme);
    token->line = line;
    return token->type != NULL || token->lexeme != NULL;
}

static const char *token_name(int token) {
    switch (token) {
    case SHURU: return "SHURU";
    case SHESH: return "SHESH";
    case DHORO: return "DHORO";
    case SHONKHA: return "SHONKHA";
    case DOSHOMIK: return "DOSHOMIK";
    case LEKHA: return "LEKHA";
    case SHOTTO: return "SHOTTO";
    case KHALI: return "KHALI";
    case AUTO: return "AUTO";
    case MITHYA: return "MITHYA";
    case JODI: return "JODI";
    case NAILE: return "NAILE";
    case JOTOKHON: return "JOTOKHON";
    case GHURAO: return "GHURAO";
    case KAJ: return "KAJ";
    case FEROT: return "FEROT";
    case DEKHAO: return "DEKHAO";
    case NAO: return "NAO";
    case EBONG: return "EBONG";
    case BA: return "BA";
    case NA: return "NA";
    case ID: return "ID";
    case NUMBER_INT: return "NUMBER_INT";
    case NUMBER_FLOAT: return "NUMBER_FLOAT";
    case STRING: return "STRING";
    case PLUS: return "PLUS";
    case MINUS: return "MINUS";
    case MUL: return "MUL";
    case DIV: return "DIV";
    case ASSIGN: return "ASSIGN";
    case LT: return "LT";
    case GT: return "GT";
    case LE: return "LE";
    case GE: return "GE";
    case EQ: return "EQ";
    case NE: return "NE";
    case LPAREN: return "LPAREN";
    case RPAREN: return "RPAREN";
    case LBRACE: return "LBRACE";
    case RBRACE: return "RBRACE";
    case LBRACKET: return "LBRACKET";
    case RBRACKET: return "RBRACKET";
    case SEMICOLON: return "SEMICOLON";
    case COMMA: return "COMMA";
    default: return "UNKNOWN";
    }
}

static void capture_tokens(const char *source_code) {
    YY_BUFFER_STATE buffer = NULL;
    int token = 0;

    clear_tokens();

    if (!source_code || !*source_code) {
        return;
    }

    buffer = yy_scan_string(source_code);
    if (!buffer) {
        return;
    }

    line_no = 1;
    g_suppress_lex_errors = 1;

    while ((token = yylex()) != 0) {
        append_token(token_name(token), yytext, line_no);

        if (token == ID || token == STRING) {
            free(yylval.sval);
            yylval.sval = NULL;
        }
    }

    g_suppress_lex_errors = 0;
    yy_delete_buffer(buffer);
}

static void clear_parse_artifacts(void) {
    if (root_ast) {
        ast_free(root_ast);
        root_ast = NULL;
    }

    clear_tokens();
    symtab_clear();
    tac_clear();
    reset_errors();
    reset_parse_trace();
    memset(&g_preprocess_stats, 0, sizeof(g_preprocess_stats));
}

static void append_ast_json(StringBuilder *builder, const AstNode *node) {
    int i = 0;

    if (!node) {
        sb_append(builder, "null");
        return;
    }

    sb_append(builder, "{");
    sb_append(builder, "\"type\":");
    sb_append_json_string(builder, ast_type_name(node->type));
    sb_append(builder, ",\"text\":");
    sb_append_json_string(builder, node->text);
    sb_appendf(builder, ",\"line\":%d", node->line);
    sb_append(builder, ",\"valueType\":");
    sb_append_json_string(builder, diamond_type_name(node->value_type));
    sb_appendf(builder, ",\"arraySize\":%d", node->array_size);
    sb_append(builder, ",\"children\":[");

    for (i = 0; i < node->child_count; ++i) {
        if (i > 0) {
            sb_append(builder, ",");
        }
        append_ast_json(builder, node->children[i]);
    }

    sb_append(builder, "]}");
}

static void append_errors_json(StringBuilder *builder) {
    int i = 0;

    sb_append(builder, "[");
    for (i = 0; i < g_error_count; ++i) {
        if (i > 0) {
            sb_append(builder, ",");
        }
        sb_append(builder, "{");
        sb_append(builder, "\"type\":");
        sb_append_json_string(builder, g_errors[i].type);
        sb_appendf(builder, ",\"line\":%d", g_errors[i].line);
        sb_append(builder, ",\"message\":");
        sb_append_json_string(builder, g_errors[i].message);
        sb_append(builder, "}");
    }
    sb_append(builder, "]");
}

static void append_tokens_json(StringBuilder *builder) {
    int i = 0;

    sb_append(builder, "[");
    for (i = 0; i < g_token_count; ++i) {
        if (i > 0) {
            sb_append(builder, ",");
        }
        sb_append(builder, "{");
        sb_append(builder, "\"type\":");
        sb_append_json_string(builder, g_tokens[i].type);
        sb_append(builder, ",\"lexeme\":");
        sb_append_json_string(builder, g_tokens[i].lexeme);
        sb_appendf(builder, ",\"line\":%d", g_tokens[i].line);
        sb_append(builder, "}");
    }
    sb_append(builder, "]");
}

static void append_symbol_table_json(StringBuilder *builder) {
    const Symbol *symbol = symtab_all_symbols();
    int first = 1;
    int i = 0;

    sb_append(builder, "[");
    while (symbol) {
        if (!first) {
            sb_append(builder, ",");
        }
        first = 0;
        sb_append(builder, "{");
        sb_append(builder, "\"name\":");
        sb_append_json_string(builder, symbol->name);
        sb_append(builder, ",\"kind\":");
        sb_append_json_string(builder, symbol_kind_name(symbol->kind));
        sb_append(builder, ",\"type\":");
        sb_append_json_string(builder, diamond_type_name(symbol->type));
        sb_appendf(builder, ",\"scope\":%d", symbol->scope_level);
        sb_appendf(builder, ",\"line\":%d", symbol->line_declared);
        sb_appendf(builder, ",\"arraySize\":%d", symbol->array_size);
        sb_appendf(builder, ",\"active\":%s", symbol->is_active ? "true" : "false");
        sb_appendf(builder, ",\"builtin\":%s", symbol->is_builtin ? "true" : "false");
        sb_appendf(builder, ",\"paramCount\":%d", symbol->param_count);
        sb_appendf(builder, ",\"memoryAddress\":%d", symbol->memory_address);
        sb_append(builder, ",\"paramTypes\":[");
        for (i = 0; i < symbol->param_count; ++i) {
            if (i > 0) {
                sb_append(builder, ",");
            }
            sb_append_json_string(builder, diamond_type_name(symbol->param_types[i]));
        }
        sb_append(builder, "]");
        sb_append(builder, "}");
        symbol = symbol->next;
    }
    sb_append(builder, "]");
}

static void append_tac_json_from_list(StringBuilder *builder, const TacInstruction *instruction) {
    int first = 1;

    sb_append(builder, "[");
    while (instruction) {
        if (!first) {
            sb_append(builder, ",");
        }
        first = 0;
        sb_append(builder, "{");
        sb_appendf(builder, "\"index\":%d", instruction->index);
        sb_append(builder, ",\"op\":");
        sb_append_json_string(builder, instruction->op);
        sb_append(builder, ",\"arg1\":");
        sb_append_json_string(builder, instruction->arg1);
        sb_append(builder, ",\"arg2\":");
        sb_append_json_string(builder, instruction->arg2);
        sb_append(builder, ",\"result\":");
        sb_append_json_string(builder, instruction->result);
        sb_append(builder, "}");
        instruction = instruction->next;
    }
    sb_append(builder, "]");
}

static char *build_json_result(int success, const char *output) {
    StringBuilder builder;

    sb_init(&builder);
    if (!builder.data) {
        return NULL;
    }

    sb_append(&builder, "{");
    sb_appendf(&builder, "\"success\":%s", success ? "true" : "false");
    sb_append(&builder, ",\"output\":");
    sb_append_json_string(&builder, output);
    sb_append(&builder, ",\"errors\":");
    append_errors_json(&builder);
    sb_append(&builder, ",\"tokens\":");
    append_tokens_json(&builder);
    sb_append(&builder, ",\"ast\":");
    append_ast_json(&builder, root_ast);
    sb_append(&builder, ",\"symbolTable\":");
    append_symbol_table_json(&builder);
    sb_append(&builder, ",\"rawTac\":");
    append_tac_json_from_list(&builder, tac_raw_head());
    sb_append(&builder, ",\"tac\":");
    append_tac_json_from_list(&builder, tac_head());
    sb_append(&builder, ",\"assembly\":");
    if (tac_assembly()) {
        sb_append_json_string(&builder, tac_assembly());
    } else {
        sb_append(&builder, "null");
    }
    sb_appendf(&builder,
               ",\"optimizations\":{\"constantFolds\":%d,\"strengthReductions\":%d,\"commonSubexpressions\":%d,\"deadCodeEliminated\":%d,\"unreachableRemoved\":%d}",
               tac_stats()->constant_folds,
               tac_stats()->strength_reductions,
               tac_stats()->common_subexpressions,
               tac_stats()->dead_code_eliminated,
               tac_stats()->unreachable_removed);
    sb_append(&builder, ",\"parseTrace\":");
    if (g_parse_trace_enabled && g_parse_trace.data && g_parse_trace.length > 0) {
        sb_append_json_string(&builder, g_parse_trace.data);
    } else {
        sb_append(&builder, "null");
    }
    sb_appendf(&builder,
               ",\"meta\":{\"errorCount\":%d,\"tokenCount\":%d,\"symbolCount\":%d,\"rawTacCount\":%d,\"tacCount\":%d,\"preprocessImports\":%d,\"preprocessRecordTypes\":%d,\"preprocessRecordVariables\":%d}",
               g_error_count,
               g_token_count,
               symtab_symbol_count(),
               tac_raw_count(),
               tac_count(),
               g_preprocess_stats.import_count,
               g_preprocess_stats.record_type_count,
               g_preprocess_stats.record_variable_count);
    sb_append(&builder, "}");

    return builder.data;
}

static char *read_file_to_string(const char *path) {
    FILE *file = NULL;
    long size = 0;
    char *buffer = NULL;

    file = fopen(path, "rb");
    if (!file) {
        return NULL;
    }

    if (fseek(file, 0, SEEK_END) != 0) {
        fclose(file);
        return NULL;
    }

    size = ftell(file);
    if (size < 0 || fseek(file, 0, SEEK_SET) != 0) {
        fclose(file);
        return NULL;
    }

    /* Gap 4.3 — Enforce maximum file size (1 MB) */
    if (size > DIAMOND_MAX_FILE_BYTES) {
        char msg[128];
        snprintf(msg, sizeof(msg),
                 "Input file exceeds the maximum allowed size of %d KB",
                 DIAMOND_MAX_FILE_BYTES / 1024);
        add_error("io", 0, msg);
        fclose(file);
        return NULL;
    }

    buffer = (char *)malloc((size_t)size + 1);
    if (!buffer) {
        fclose(file);
        return NULL;
    }

    if (size > 0 && fread(buffer, 1, (size_t)size, file) != (size_t)size) {
        fclose(file);
        free(buffer);
        return NULL;
    }

    buffer[size] = '\0';
    fclose(file);
    return buffer;
}

static char *compile_preprocessed_source(const char *source_code) {
    YY_BUFFER_STATE buffer = NULL;
    int parse_result = 0;
    int success = 0;
    char summary[320];
    char *json = NULL;
    const char *trace_env = getenv("DIAMOND_PARSE_TRACE");
    g_parse_trace_enabled = env_enabled(trace_env);
    if (g_parse_trace_enabled) {
        ensure_parse_trace_builder();
    }

    if (!source_code || !*source_code) {
        add_error("request", 0, "No source code provided");
        return build_json_result(0, "Compilation failed: no source code provided.");
    }

    capture_tokens(source_code);
    symtab_register_builtins();

    line_no = 1;
    buffer = yy_scan_string(source_code);
    if (!buffer) {
        add_error("internal", 0, "Failed to initialize the lexer buffer");
        return build_json_result(0, "Compilation failed: lexer initialization error.");
    }

    yydebug = g_parse_trace_enabled ? 1 : 0;
    parse_result = yyparse();
    yy_delete_buffer(buffer);

    success = (parse_result == 0 && g_error_count == 0 && root_ast != NULL);
    if (root_ast) {
        tac_generate(root_ast);
    }

    if (success) {
        snprintf(summary, sizeof(summary),
                 "Compilation succeeded. Captured %d tokens, %d symbols, %d raw TAC instruction(s), %d optimized TAC instruction(s), %d import(s), and %d record declaration(s).",
                 g_token_count,
                 symtab_symbol_count(),
                 tac_raw_count(),
                 tac_count(),
                 g_preprocess_stats.import_count,
                 g_preprocess_stats.record_variable_count);
    } else {
        snprintf(summary, sizeof(summary),
                 "Compilation failed with %d issue(s) after scanning %d tokens.",
                 g_error_count, g_token_count);
    }

    json = build_json_result(success, summary);
    if (!json) {
        clear_parse_artifacts();
        return NULL;
    }

    if (root_ast) {
        ast_free(root_ast);
        root_ast = NULL;
    }
    clear_tokens();
    symtab_clear();
    tac_clear();
    reset_errors();

    return json;
}

char *diamond_compile(const char *source_code) {
    char *preprocessed = NULL;
    char *json = NULL;

    clear_parse_artifacts();

    if (!source_code || !*source_code) {
        add_error("request", 0, "No source code provided");
        return build_json_result(0, "Compilation failed: no source code provided.");
    }

    preprocessed = diamond_preprocess_source(source_code, NULL, &g_preprocess_stats);
    if (!preprocessed) {
        return build_json_result(0, "Compilation failed during preprocessing.");
    }

    json = compile_preprocessed_source(preprocessed);
    free(preprocessed);
    return json;
}

char *diamond_compile_file(const char *source_path) {
    char *preprocessed = NULL;
    char *json = NULL;

    if (!source_path) {
        clear_parse_artifacts();
        add_error("request", 0, "No input file path provided");
        return build_json_result(0, "Compilation failed: missing input file.");
    }

    clear_parse_artifacts();
    preprocessed = diamond_preprocess_file(source_path, &g_preprocess_stats);
    if (!preprocessed) {
        if (g_error_count == 0) {
            add_error("io", 0, "Could not open or read the input file");
        }
        return build_json_result(0, "Compilation failed during preprocessing.");
    }

    json = compile_preprocessed_source(preprocessed);
    free(preprocessed);
    return json;
}

void diamond_free(char *ptr) {
    if (ptr) {
        free(ptr);
    }
}

#ifndef DIAMOND_WASM
int main(int argc, char **argv) {
    const char *path = "test.diu";
    char *json = NULL;
    int i = 0;

    for (i = 1; i < argc; ++i) {
        if (strcmp(argv[i], "--trace") == 0) {
#ifdef _WIN32
            _putenv("DIAMOND_PARSE_TRACE=1");
#else
            setenv("DIAMOND_PARSE_TRACE", "1", 1);
#endif
        } else {
            path = argv[i];
        }
    }

    json = diamond_compile_file(path);

    if (!json) {
        fprintf(stderr, "Failed to generate compiler output.\n");
        return 1;
    }

    printf("%s\n", json);
    diamond_free(json);
    return 0;
}
#endif
