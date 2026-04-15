#include "preprocess.h"

#include <ctype.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

extern void add_error(const char *type, int line, const char *msg);

typedef struct {
    char *data;
    size_t length;
    size_t capacity;
} TextBuilder;

typedef struct {
    char *name;
    char *type_name;
} RecordField;

typedef struct {
    char *name;
    RecordField *fields;
    int field_count;
    int field_capacity;
} RecordType;

typedef struct {
    char *name;
    char *type_name; /* NULL means "shadowed as non-record in this scope". */
} ScopeBinding;

typedef struct {
    ScopeBinding *bindings;
    int binding_count;
    int binding_capacity;
} ScopeFrame;

typedef struct {
    RecordType *record_types;
    int record_type_count;
    int record_type_capacity;
    char **imported_paths;
    int imported_path_count;
    int imported_path_capacity;
    int had_error;
    DiamondPreprocessStats *stats;
} PreprocessContext;

static char *dup_string(const char *text) {
    size_t length = 0;
    char *copy = NULL;

    if (!text) {
        return NULL;
    }

    length = strlen(text) + 1;
    copy = (char *)malloc(length);
    if (!copy) {
        return NULL;
    }

    memcpy(copy, text, length);
    return copy;
}

static char *dup_substring(const char *start, size_t length) {
    char *copy = (char *)malloc(length + 1);

    if (!copy) {
        return NULL;
    }

    memcpy(copy, start, length);
    copy[length] = '\0';
    return copy;
}

static void tb_init(TextBuilder *builder) {
    builder->capacity = 1024;
    builder->length = 0;
    builder->data = (char *)malloc(builder->capacity);
    if (builder->data) {
        builder->data[0] = '\0';
    }
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

static int tb_append_n(TextBuilder *builder, const char *text, size_t length) {
    if (!builder->data) {
        return 0;
    }

    if (!tb_reserve(builder, length)) {
        return 0;
    }

    memcpy(builder->data + builder->length, text, length);
    builder->length += length;
    builder->data[builder->length] = '\0';
    return 1;
}

static int tb_append(TextBuilder *builder, const char *text) {
    if (!text) {
        return 1;
    }

    return tb_append_n(builder, text, strlen(text));
}

static int tb_append_char(TextBuilder *builder, char ch) {
    return tb_append_n(builder, &ch, 1);
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

static const char *skip_spaces(const char *cursor) {
    while (*cursor && isspace((unsigned char)*cursor)) {
        cursor++;
    }

    return cursor;
}

static char *trim_copy(const char *text) {
    const char *start = text;
    const char *end = text + strlen(text);

    while (*start && isspace((unsigned char)*start)) {
        start++;
    }

    while (end > start && isspace((unsigned char)*(end - 1))) {
        end--;
    }

    return dup_substring(start, (size_t)(end - start));
}

static int starts_with_word(const char *text, const char *word) {
    size_t length = strlen(word);

    if (strncmp(text, word, length) != 0) {
        return 0;
    }

    return text[length] == '\0' ||
           isspace((unsigned char)text[length]) ||
           text[length] == '"' ||
           text[length] == '{';
}

static int is_identifier_start(char ch) {
    return isalpha((unsigned char)ch) || ch == '_';
}

static int is_identifier_char(char ch) {
    return isalnum((unsigned char)ch) || ch == '_';
}

static char *read_identifier(const char *cursor, size_t *consumed) {
    const char *original = cursor;
    size_t length = 0;

    cursor = skip_spaces(cursor);
    if (!is_identifier_start(*cursor)) {
        if (consumed) {
            *consumed = 0;
        }
        return NULL;
    }

    while (is_identifier_char(cursor[length])) {
        length++;
    }

    if (consumed) {
        *consumed = (size_t)(cursor - original) + length;
    }

    return dup_substring(cursor, length);
}

static int is_builtin_type_name(const char *name) {
    return name &&
           (strcmp(name, "shonkha") == 0 ||
            strcmp(name, "doshomik") == 0 ||
            strcmp(name, "lekha") == 0 ||
            strcmp(name, "shotto") == 0 ||
            strcmp(name, "khali") == 0 ||
            strcmp(name, "auto") == 0);
}

static void add_preprocess_error(PreprocessContext *ctx, int line, const char *message) {
    if (!ctx) {
        return;
    }

    ctx->had_error = 1;
    add_error("preprocess", line, message);
}

static RecordType *lookup_record_type(PreprocessContext *ctx, const char *name) {
    int i = 0;

    if (!ctx || !name) {
        return NULL;
    }

    for (i = 0; i < ctx->record_type_count; ++i) {
        if (strcmp(ctx->record_types[i].name, name) == 0) {
            return &ctx->record_types[i];
        }
    }

    return NULL;
}

static RecordField *lookup_record_field(const RecordType *record_type, const char *field_name) {
    int i = 0;

    if (!record_type || !field_name) {
        return NULL;
    }

    for (i = 0; i < record_type->field_count; ++i) {
        if (strcmp(record_type->fields[i].name, field_name) == 0) {
            return &record_type->fields[i];
        }
    }

    return NULL;
}

static int ensure_record_capacity(PreprocessContext *ctx) {
    RecordType *resized = NULL;
    int next_capacity = 0;

    if (ctx->record_type_count < ctx->record_type_capacity) {
        return 1;
    }

    next_capacity = ctx->record_type_capacity == 0 ? 8 : ctx->record_type_capacity * 2;
    resized = (RecordType *)realloc(ctx->record_types, sizeof(RecordType) * (size_t)next_capacity);
    if (!resized) {
        return 0;
    }

    ctx->record_types = resized;
    ctx->record_type_capacity = next_capacity;
    return 1;
}

static int ensure_field_capacity(RecordType *record_type) {
    RecordField *resized = NULL;
    int next_capacity = 0;

    if (record_type->field_count < record_type->field_capacity) {
        return 1;
    }

    next_capacity = record_type->field_capacity == 0 ? 4 : record_type->field_capacity * 2;
    resized = (RecordField *)realloc(record_type->fields, sizeof(RecordField) * (size_t)next_capacity);
    if (!resized) {
        return 0;
    }

    record_type->fields = resized;
    record_type->field_capacity = next_capacity;
    return 1;
}

static RecordType *create_record_type(PreprocessContext *ctx, const char *name) {
    RecordType *record_type = NULL;

    if (!ctx || !name || !ensure_record_capacity(ctx)) {
        return NULL;
    }

    record_type = &ctx->record_types[ctx->record_type_count++];
    memset(record_type, 0, sizeof(*record_type));
    record_type->name = dup_string(name);
    if (!record_type->name) {
        return NULL;
    }

    if (ctx->stats) {
        ctx->stats->record_type_count++;
    }

    return record_type;
}

static int add_record_field(RecordType *record_type, const char *type_name, const char *field_name) {
    RecordField *field = NULL;

    if (!record_type || !type_name || !field_name || !ensure_field_capacity(record_type)) {
        return 0;
    }

    field = &record_type->fields[record_type->field_count++];
    field->name = dup_string(field_name);
    field->type_name = dup_string(type_name);
    return field->name != NULL && field->type_name != NULL;
}

static int ensure_import_capacity(PreprocessContext *ctx) {
    char **resized = NULL;
    int next_capacity = 0;

    if (ctx->imported_path_count < ctx->imported_path_capacity) {
        return 1;
    }

    next_capacity = ctx->imported_path_capacity == 0 ? 8 : ctx->imported_path_capacity * 2;
    resized = (char **)realloc(ctx->imported_paths, sizeof(char *) * (size_t)next_capacity);
    if (!resized) {
        return 0;
    }

    ctx->imported_paths = resized;
    ctx->imported_path_capacity = next_capacity;
    return 1;
}

static int has_imported_path(PreprocessContext *ctx, const char *path) {
    int i = 0;

    for (i = 0; i < ctx->imported_path_count; ++i) {
        if (strcmp(ctx->imported_paths[i], path) == 0) {
            return 1;
        }
    }

    return 0;
}

static int remember_imported_path(PreprocessContext *ctx, const char *path) {
    if (!ctx || !path || !ensure_import_capacity(ctx)) {
        return 0;
    }

    ctx->imported_paths[ctx->imported_path_count] = dup_string(path);
    if (!ctx->imported_paths[ctx->imported_path_count]) {
        return 0;
    }

    ctx->imported_path_count++;
    return 1;
}

static char *path_dirname(const char *path) {
    const char *last_slash = NULL;

    if (!path) {
        return NULL;
    }

    last_slash = strrchr(path, '/');
#ifdef _WIN32
    {
        const char *last_backslash = strrchr(path, '\\');
        if (!last_slash || (last_backslash && last_backslash > last_slash)) {
            last_slash = last_backslash;
        }
    }
#endif

    if (!last_slash) {
        return dup_string(".");
    }

    return dup_substring(path, (size_t)(last_slash - path));
}

static int path_is_absolute(const char *path) {
    if (!path || !*path) {
        return 0;
    }

    if (path[0] == '/' || path[0] == '\\') {
        return 1;
    }

    return isalpha((unsigned char)path[0]) && path[1] == ':';
}

static char *path_join(const char *base_dir, const char *relative_path) {
    TextBuilder builder;

    if (!relative_path) {
        return NULL;
    }

    if (!base_dir || path_is_absolute(relative_path)) {
        return dup_string(relative_path);
    }

    tb_init(&builder);
    if (!builder.data) {
        return NULL;
    }

    tb_append(&builder, base_dir);
    if (builder.length > 0 &&
        builder.data[builder.length - 1] != '/' &&
        builder.data[builder.length - 1] != '\\') {
        tb_append_char(&builder, '/');
    }
    tb_append(&builder, relative_path);
    return builder.data;
}

static void free_scope_frames(ScopeFrame *frames, int frame_count) {
    int i = 0;
    int j = 0;

    for (i = 0; i < frame_count; ++i) {
        for (j = 0; j < frames[i].binding_count; ++j) {
            free(frames[i].bindings[j].name);
            free(frames[i].bindings[j].type_name);
        }
        free(frames[i].bindings);
    }

    free(frames);
}

static int scope_push(ScopeFrame **frames, int *frame_count, int *frame_capacity) {
    ScopeFrame *resized = NULL;
    int next_capacity = 0;

    if (*frame_count == *frame_capacity) {
        next_capacity = *frame_capacity == 0 ? 8 : *frame_capacity * 2;
        resized = (ScopeFrame *)realloc(*frames, sizeof(ScopeFrame) * (size_t)next_capacity);
        if (!resized) {
            return 0;
        }
        *frames = resized;
        *frame_capacity = next_capacity;
    }

    memset(&(*frames)[*frame_count], 0, sizeof(ScopeFrame));
    (*frame_count)++;
    return 1;
}

static void scope_pop(ScopeFrame *frames, int *frame_count) {
    ScopeFrame *frame = NULL;
    int i = 0;

    if (!frames || !frame_count || *frame_count <= 1) {
        return;
    }

    frame = &frames[*frame_count - 1];
    for (i = 0; i < frame->binding_count; ++i) {
        free(frame->bindings[i].name);
        free(frame->bindings[i].type_name);
    }
    free(frame->bindings);
    memset(frame, 0, sizeof(*frame));
    (*frame_count)--;
}

static int scope_bind(ScopeFrame *frames, int frame_count, const char *name, const char *type_name) {
    ScopeFrame *frame = NULL;
    ScopeBinding *resized = NULL;
    int next_capacity = 0;

    if (!frames || frame_count <= 0 || !name) {
        return 0;
    }

    frame = &frames[frame_count - 1];
    if (frame->binding_count == frame->binding_capacity) {
        next_capacity = frame->binding_capacity == 0 ? 8 : frame->binding_capacity * 2;
        resized = (ScopeBinding *)realloc(frame->bindings, sizeof(ScopeBinding) * (size_t)next_capacity);
        if (!resized) {
            return 0;
        }
        frame->bindings = resized;
        frame->binding_capacity = next_capacity;
    }

    frame->bindings[frame->binding_count].name = dup_string(name);
    frame->bindings[frame->binding_count].type_name = dup_string(type_name);
    if (!frame->bindings[frame->binding_count].name) {
        return 0;
    }

    frame->binding_count++;
    return 1;
}

static int scope_lookup_record_type_name(ScopeFrame *frames,
                                         int frame_count,
                                         const char *name,
                                         size_t name_length,
                                         const char **type_name_out) {
    int i = 0;

    if (type_name_out) {
        *type_name_out = NULL;
    }

    for (i = frame_count - 1; i >= 0; --i) {
        int j = 0;
        for (j = frames[i].binding_count - 1; j >= 0; --j) {
            if (strlen(frames[i].bindings[j].name) == name_length &&
                strncmp(frames[i].bindings[j].name, name, name_length) == 0) {
                if (type_name_out) {
                    *type_name_out = frames[i].bindings[j].type_name;
                }
                return 1;
            }
        }
    }

    return 0;
}

static int parse_import_path(const char *trimmed, char **path_out) {
    const char *start = NULL;
    const char *end = NULL;

    if (path_out) {
        *path_out = NULL;
    }

    if (!trimmed || !starts_with_word(trimmed, "amdani")) {
        return 0;
    }

    start = strchr(trimmed, '"');
    if (!start) {
        return 0;
    }

    start++;
    end = strchr(start, '"');
    if (!end) {
        return 0;
    }

    if (path_out) {
        *path_out = dup_substring(start, (size_t)(end - start));
    }

    return 1;
}

static int parse_record_header(const char *trimmed, char **name_out) {
    const char *cursor = NULL;
    size_t consumed = 0;

    if (name_out) {
        *name_out = NULL;
    }

    if (!trimmed || !starts_with_word(trimmed, "gothon")) {
        return 0;
    }

    cursor = trimmed + strlen("gothon");
    cursor = skip_spaces(cursor);
    if (name_out) {
        *name_out = read_identifier(cursor, &consumed);
    }

    return name_out && *name_out != NULL;
}

static int parse_record_field_line(const char *trimmed, char **type_name_out, char **field_name_out) {
    const char *cursor = NULL;
    size_t consumed = 0;
    char *type_name = NULL;
    char *field_name = NULL;

    if (type_name_out) {
        *type_name_out = NULL;
    }
    if (field_name_out) {
        *field_name_out = NULL;
    }

    if (!trimmed || !*trimmed || trimmed[0] == '/' || trimmed[0] == '}') {
        return 0;
    }

    cursor = skip_spaces(trimmed);
    type_name = read_identifier(cursor, &consumed);
    if (!type_name) {
        return 0;
    }

    cursor = skip_spaces(cursor + consumed);
    field_name = read_identifier(cursor, &consumed);
    if (!field_name) {
        free(type_name);
        return 0;
    }

    if (type_name_out) {
        *type_name_out = type_name;
    } else {
        free(type_name);
    }

    if (field_name_out) {
        *field_name_out = field_name;
    } else {
        free(field_name);
    }

    return 1;
}

static int parse_declaration(const char *trimmed, char **type_name_out, char **var_name_out, char **remainder_out) {
    const char *cursor = NULL;
    size_t consumed = 0;
    char *type_name = NULL;
    char *var_name = NULL;

    if (type_name_out) {
        *type_name_out = NULL;
    }
    if (var_name_out) {
        *var_name_out = NULL;
    }
    if (remainder_out) {
        *remainder_out = NULL;
    }

    if (!trimmed || !starts_with_word(trimmed, "dhoro")) {
        return 0;
    }

    cursor = trimmed + strlen("dhoro");
    type_name = read_identifier(cursor, &consumed);
    if (!type_name) {
        return 0;
    }

    cursor = skip_spaces(cursor + consumed);
    var_name = read_identifier(cursor, &consumed);
    if (!var_name) {
        free(type_name);
        return 0;
    }

    cursor = skip_spaces(cursor + consumed);
    if (type_name_out) {
        *type_name_out = type_name;
    } else {
        free(type_name);
    }
    if (var_name_out) {
        *var_name_out = var_name;
    } else {
        free(var_name);
    }
    if (remainder_out) {
        *remainder_out = dup_string(cursor);
    }

    return 1;
}

static int collect_function_param_names(const char *trimmed,
                                        PreprocessContext *ctx,
                                        char ***param_names_out,
                                        int *param_count_out,
                                        int line_no) {
    const char *paren_open = NULL;
    const char *paren_close = NULL;
    const char *signature_cursor = NULL;
    char *signature = NULL;
    char *trimmed_signature = NULL;
    char *params_text = NULL;
    char *params_cursor = NULL;
    char **param_names = NULL;
    int param_count = 0;
    int param_capacity = 0;

    if (param_names_out) {
        *param_names_out = NULL;
    }
    if (param_count_out) {
        *param_count_out = 0;
    }

    if (!trimmed || !starts_with_word(trimmed, "kaj")) {
        return 0;
    }

    paren_open = strchr(trimmed, '(');
    paren_close = paren_open ? strrchr(paren_open, ')') : NULL;
    if (!paren_open || !paren_close || paren_close < paren_open) {
        add_preprocess_error(ctx, line_no, "function declarations must keep parameters on the same line");
        return 1;
    }

    signature_cursor = trimmed + strlen("kaj");
    signature = dup_substring(signature_cursor, (size_t)(paren_open - signature_cursor));
    trimmed_signature = trim_copy(signature ? signature : "");
    if (trimmed_signature && *trimmed_signature) {
        size_t consumed = 0;
        char *first = read_identifier(trimmed_signature, &consumed);
        char *second = NULL;

        if (first) {
            second = read_identifier(skip_spaces(trimmed_signature + consumed), &consumed);
        }

        if (first && second && lookup_record_type(ctx, first)) {
            add_preprocess_error(ctx, line_no, "record return types are not supported yet");
        }

        free(first);
        free(second);
    }

    params_text = dup_substring(paren_open + 1, (size_t)(paren_close - paren_open - 1));
    params_cursor = params_text;

    while (params_cursor && *params_cursor) {
        char *segment = params_cursor;
        char *comma = NULL;
        char *segment_trimmed = NULL;
        size_t consumed = 0;
        char *first = NULL;
        char *second = NULL;

        comma = strchr(segment, ',');
        if (comma) {
            *comma = '\0';
        }

        segment_trimmed = trim_copy(segment);
        if (segment_trimmed && *segment_trimmed) {
            first = read_identifier(segment_trimmed, &consumed);
            second = first ? read_identifier(skip_spaces(segment_trimmed + consumed), &consumed) : NULL;

            if (first && second && lookup_record_type(ctx, first)) {
                add_preprocess_error(ctx, line_no, "record-typed function parameters are not supported yet");
            } else {
                const char *param_name = second ? second : first;
                char **resized = NULL;
                int next_capacity = 0;

                if (param_name) {
                    if (param_count == param_capacity) {
                        next_capacity = param_capacity == 0 ? 4 : param_capacity * 2;
                        resized = (char **)realloc(param_names, sizeof(char *) * (size_t)next_capacity);
                        if (!resized) {
                            free(first);
                            free(second);
                            free(segment_trimmed);
                            free(params_text);
                            free(trimmed_signature);
                            free(signature);
                            return 1;
                        }
                        param_names = resized;
                        param_capacity = next_capacity;
                    }

                    param_names[param_count] = dup_string(param_name);
                    if (param_names[param_count]) {
                        param_count++;
                    }
                }
            }
        }

        free(first);
        free(second);
        free(segment_trimmed);

        if (!comma) {
            break;
        }
        params_cursor = comma + 1;
    }

    free(params_text);
    free(trimmed_signature);
    free(signature);

    if (param_names_out) {
        *param_names_out = param_names;
    }
    if (param_count_out) {
        *param_count_out = param_count;
    }

    return 1;
}

static char *expand_imports_recursive(PreprocessContext *ctx, const char *source, const char *source_path);

static char *process_import_line(PreprocessContext *ctx,
                                 const char *import_path,
                                 const char *source_path,
                                 int line_no) {
    char *base_dir = NULL;
    char *resolved_path = NULL;
    char *import_source = NULL;
    char *expanded_source = NULL;
    char message[256];

    if (!source_path) {
        add_preprocess_error(ctx, line_no, "amdani imports require a real source file path");
        return NULL;
    }

    base_dir = path_dirname(source_path);
    resolved_path = path_join(base_dir, import_path);
    free(base_dir);

    if (!resolved_path) {
        add_preprocess_error(ctx, line_no, "failed to resolve the import path");
        return NULL;
    }

    if (has_imported_path(ctx, resolved_path)) {
        free(resolved_path);
        return dup_string("");
    }

    if (!remember_imported_path(ctx, resolved_path)) {
        free(resolved_path);
        add_preprocess_error(ctx, line_no, "failed to track imported modules");
        return NULL;
    }

    if (ctx->stats) {
        ctx->stats->import_count++;
    }

    import_source = read_file_to_string(resolved_path);
    if (!import_source) {
        snprintf(message, sizeof(message), "could not read imported module '%s'", import_path);
        add_preprocess_error(ctx, line_no, message);
        free(resolved_path);
        return NULL;
    }

    expanded_source = expand_imports_recursive(ctx, import_source, resolved_path);
    free(import_source);
    free(resolved_path);
    return expanded_source;
}

static char *expand_imports_recursive(PreprocessContext *ctx, const char *source, const char *source_path) {
    const char *cursor = source;
    TextBuilder builder;
    int line_no = 1;

    tb_init(&builder);
    if (!builder.data) {
        return NULL;
    }

    while (cursor && *cursor) {
        const char *line_start = cursor;
        const char *line_end = cursor;
        char *line = NULL;
        char *trimmed = NULL;
        char *import_path = NULL;

        while (*line_end && *line_end != '\n') {
            line_end++;
        }

        line = dup_substring(line_start, (size_t)(line_end - line_start));
        trimmed = trim_copy(line ? line : "");

        if (trimmed && parse_import_path(trimmed, &import_path)) {
            char *expanded_import = process_import_line(ctx, import_path, source_path, line_no);
            if (expanded_import) {
                tb_append(&builder, expanded_import);
                if (expanded_import[0] != '\0' &&
                    expanded_import[strlen(expanded_import) - 1] != '\n') {
                    tb_append_char(&builder, '\n');
                }
            }
            free(expanded_import);
        } else {
            tb_append(&builder, line ? line : "");
            tb_append_char(&builder, '\n');
        }

        free(import_path);
        free(trimmed);
        free(line);

        if (*line_end == '\n') {
            cursor = line_end + 1;
        } else {
            cursor = line_end;
        }
        line_no++;
    }

    return builder.data;
}

static char *collect_record_types(PreprocessContext *ctx, const char *source) {
    const char *cursor = source;
    TextBuilder builder;
    RecordType *current_type = NULL;
    int line_no = 1;

    tb_init(&builder);
    if (!builder.data) {
        return NULL;
    }

    while (cursor && *cursor) {
        const char *line_start = cursor;
        const char *line_end = cursor;
        char *line = NULL;
        char *trimmed = NULL;

        while (*line_end && *line_end != '\n') {
            line_end++;
        }

        line = dup_substring(line_start, (size_t)(line_end - line_start));
        trimmed = trim_copy(line ? line : "");

        if (!current_type) {
            char *record_name = NULL;

            if (trimmed && parse_record_header(trimmed, &record_name)) {
                if (lookup_record_type(ctx, record_name)) {
                    add_preprocess_error(ctx, line_no, "record type already defined");
                } else {
                    current_type = create_record_type(ctx, record_name);
                    if (!current_type) {
                        add_preprocess_error(ctx, line_no, "failed to create record type");
                    }
                }
                tb_append_char(&builder, '\n');
                free(record_name);
            } else {
                tb_append(&builder, line ? line : "");
                tb_append_char(&builder, '\n');
            }
        } else {
            if (trimmed && strchr(trimmed, '}')) {
                current_type = NULL;
                tb_append_char(&builder, '\n');
            } else if (trimmed && *trimmed && strncmp(trimmed, "//", 2) != 0) {
                char *type_name = NULL;
                char *field_name = NULL;

                if (!parse_record_field_line(trimmed, &type_name, &field_name)) {
                    add_preprocess_error(ctx, line_no, "invalid field declaration inside gothon block");
                } else if (!add_record_field(current_type, type_name, field_name)) {
                    add_preprocess_error(ctx, line_no, "failed to store record field");
                }

                free(type_name);
                free(field_name);
                tb_append_char(&builder, '\n');
            } else {
                tb_append_char(&builder, '\n');
            }
        }

        free(trimmed);
        free(line);

        if (*line_end == '\n') {
            cursor = line_end + 1;
        } else {
            cursor = line_end;
        }
        line_no++;
    }

    if (current_type) {
        add_preprocess_error(ctx, line_no, "unterminated gothon block");
    }

    return builder.data;
}

static void validate_record_types(PreprocessContext *ctx) {
    int i = 0;
    int j = 0;

    for (i = 0; i < ctx->record_type_count; ++i) {
        RecordType *record_type = &ctx->record_types[i];

        if (record_type->field_count == 0) {
            add_preprocess_error(ctx, 0, "record types must declare at least one field");
        }

        for (j = 0; j < record_type->field_count; ++j) {
            if (!is_builtin_type_name(record_type->fields[j].type_name) &&
                !lookup_record_type(ctx, record_type->fields[j].type_name)) {
                add_preprocess_error(ctx, 0, "record field type is not defined");
            }
        }
    }
}

static int append_flattened_record_decls(TextBuilder *builder,
                                         PreprocessContext *ctx,
                                         const char *type_name,
                                         const char *var_name,
                                         int line_no,
                                         int depth) {
    RecordType *record_type = lookup_record_type(ctx, type_name);
    int i = 0;

    if (!record_type) {
        add_preprocess_error(ctx, line_no, "unknown record type in declaration");
        return 0;
    }

    if (depth > ctx->record_type_count + 2) {
        add_preprocess_error(ctx, line_no, "cyclic record definitions are not supported");
        return 0;
    }

    for (i = 0; i < record_type->field_count; ++i) {
        TextBuilder nested_name;

        tb_init(&nested_name);
        if (!nested_name.data) {
            return 0;
        }

        tb_append(&nested_name, var_name);
        tb_append(&nested_name, "__");
        tb_append(&nested_name, record_type->fields[i].name);

        if (lookup_record_type(ctx, record_type->fields[i].type_name)) {
            append_flattened_record_decls(builder,
                                          ctx,
                                          record_type->fields[i].type_name,
                                          nested_name.data,
                                          line_no,
                                          depth + 1);
        } else {
            tb_append(builder, "dhoro ");
            tb_append(builder, record_type->fields[i].type_name);
            tb_append_char(builder, ' ');
            tb_append(builder, nested_name.data);
            tb_append(builder, "; ");
        }

        free(nested_name.data);
    }

    return 1;
}

static char *rewrite_record_field_accesses(PreprocessContext *ctx,
                                           ScopeFrame *frames,
                                           int frame_count,
                                           const char *line,
                                           int line_no) {
    const char *cursor = line;
    TextBuilder builder;

    tb_init(&builder);
    if (!builder.data) {
        return NULL;
    }

    while (*cursor) {
        if (cursor[0] == '/' && cursor[1] == '/') {
            tb_append(&builder, cursor);
            break;
        }

        if (*cursor == '"') {
            tb_append_char(&builder, *cursor++);
            while (*cursor) {
                tb_append_char(&builder, *cursor);
                if (*cursor == '"' && (cursor == line || cursor[-1] != '\\')) {
                    cursor++;
                    break;
                }
                cursor++;
            }
            continue;
        }

        if (is_identifier_start(*cursor)) {
            const char *type_name = NULL;
            const char *identifier_start = cursor;
            const char *identifier_end = cursor + 1;

            while (is_identifier_char(*identifier_end)) {
                identifier_end++;
            }

            if (scope_lookup_record_type_name(frames,
                                              frame_count,
                                              identifier_start,
                                              (size_t)(identifier_end - identifier_start),
                                              &type_name) &&
                type_name != NULL &&
                *identifier_end == '.') {
                TextBuilder flattened;
                const char *chain_cursor = identifier_end;
                const char *current_type_name = type_name;

                tb_init(&flattened);
                if (!flattened.data) {
                    free(builder.data);
                    return NULL;
                }

                tb_append_n(&flattened, identifier_start, (size_t)(identifier_end - identifier_start));
                while (*chain_cursor == '.') {
                    RecordType *record_type = lookup_record_type(ctx, current_type_name);
                    RecordField *field = NULL;
                    const char *field_start = NULL;
                    const char *field_end = NULL;
                    char *field_name = NULL;

                    if (!record_type) {
                        add_preprocess_error(ctx, line_no, "invalid record access target");
                        break;
                    }

                    chain_cursor++;
                    field_start = chain_cursor;
                    if (!is_identifier_start(*field_start)) {
                        add_preprocess_error(ctx, line_no, "invalid record field access");
                        break;
                    }

                    field_end = field_start + 1;
                    while (is_identifier_char(*field_end)) {
                        field_end++;
                    }

                    field_name = dup_substring(field_start, (size_t)(field_end - field_start));
                    field = lookup_record_field(record_type, field_name);
                    if (!field) {
                        add_preprocess_error(ctx, line_no, "unknown record field in access chain");
                        free(field_name);
                        break;
                    }

                    tb_append(&flattened, "__");
                    tb_append(&flattened, field_name);
                    current_type_name = lookup_record_type(ctx, field->type_name)
                        ? field->type_name
                        : NULL;
                    free(field_name);
                    chain_cursor = field_end;

                    if (*chain_cursor == '.' && !current_type_name) {
                        add_preprocess_error(ctx, line_no, "scalar record fields do not have nested members");
                        break;
                    }
                }

                tb_append(&builder, flattened.data);
                free(flattened.data);
                cursor = chain_cursor;
                continue;
            }

            tb_append_n(&builder, identifier_start, (size_t)(identifier_end - identifier_start));
            cursor = identifier_end;
            continue;
        }

        tb_append_char(&builder, *cursor);
        cursor++;
    }

    return builder.data;
}

static void apply_brace_transitions(ScopeFrame **frames,
                                    int *frame_count,
                                    int *frame_capacity,
                                    const char *line,
                                    char **param_names,
                                    int param_count) {
    const char *cursor = line;
    int seeded_params = 0;

    while (*cursor) {
        if (cursor[0] == '/' && cursor[1] == '/') {
            break;
        }

        if (*cursor == '"') {
            cursor++;
            while (*cursor) {
                if (*cursor == '"' && cursor[-1] != '\\') {
                    cursor++;
                    break;
                }
                cursor++;
            }
            continue;
        }

        if (*cursor == '{') {
            int i = 0;
            if (scope_push(frames, frame_count, frame_capacity) && !seeded_params) {
                for (i = 0; i < param_count; ++i) {
                    scope_bind(*frames, *frame_count, param_names[i], NULL);
                }
                seeded_params = 1;
            }
        } else if (*cursor == '}') {
            scope_pop(*frames, frame_count);
        }

        cursor++;
    }
}

static char *rewrite_source(PreprocessContext *ctx, const char *source) {
    const char *cursor = source;
    TextBuilder builder;
    ScopeFrame *frames = NULL;
    int frame_count = 0;
    int frame_capacity = 0;
    int line_no = 1;

    if (!scope_push(&frames, &frame_count, &frame_capacity)) {
        return NULL;
    }

    tb_init(&builder);
    if (!builder.data) {
        free_scope_frames(frames, frame_count);
        return NULL;
    }

    while (cursor && *cursor) {
        const char *line_start = cursor;
        const char *line_end = cursor;
        char *line = NULL;
        char *trimmed = NULL;
        char *type_name = NULL;
        char *var_name = NULL;
        char *remainder = NULL;
        char **param_names = NULL;
        int param_count = 0;

        while (*line_end && *line_end != '\n') {
            line_end++;
        }

        line = dup_substring(line_start, (size_t)(line_end - line_start));
        trimmed = trim_copy(line ? line : "");

        collect_function_param_names(trimmed, ctx, &param_names, &param_count, line_no);

        if (trimmed && parse_declaration(trimmed, &type_name, &var_name, &remainder)) {
            RecordType *record_type = lookup_record_type(ctx, type_name);

            if (record_type) {
                char *trimmed_remainder = trim_copy(remainder ? remainder : "");

                if (!trimmed_remainder || strcmp(trimmed_remainder, ";") != 0) {
                    add_preprocess_error(ctx,
                                         line_no,
                                         "record declarations currently support only 'dhoro Type name;'");
                    tb_append_char(&builder, '\n');
                } else {
                    append_flattened_record_decls(&builder, ctx, type_name, var_name, line_no, 0);
                    scope_bind(frames, frame_count, var_name, type_name);
                    if (ctx->stats) {
                        ctx->stats->record_variable_count++;
                    }
                    tb_append_char(&builder, '\n');
                }

                free(trimmed_remainder);
            } else {
                char *rewritten = rewrite_record_field_accesses(ctx, frames, frame_count, line ? line : "", line_no);
                if (var_name) {
                    scope_bind(frames, frame_count, var_name, NULL);
                }
                tb_append(&builder, rewritten ? rewritten : "");
                tb_append_char(&builder, '\n');
                free(rewritten);
            }
        } else {
            char *rewritten = rewrite_record_field_accesses(ctx, frames, frame_count, line ? line : "", line_no);
            tb_append(&builder, rewritten ? rewritten : "");
            tb_append_char(&builder, '\n');
            free(rewritten);
        }

        apply_brace_transitions(&frames, &frame_count, &frame_capacity, line ? line : "", param_names, param_count);

        {
            int i = 0;
            for (i = 0; i < param_count; ++i) {
                free(param_names[i]);
            }
            free(param_names);
        }

        free(type_name);
        free(var_name);
        free(remainder);
        free(trimmed);
        free(line);

        if (*line_end == '\n') {
            cursor = line_end + 1;
        } else {
            cursor = line_end;
        }
        line_no++;
    }

    free_scope_frames(frames, frame_count);
    return builder.data;
}

static void free_context(PreprocessContext *ctx) {
    int i = 0;
    int j = 0;

    if (!ctx) {
        return;
    }

    for (i = 0; i < ctx->record_type_count; ++i) {
        free(ctx->record_types[i].name);
        for (j = 0; j < ctx->record_types[i].field_count; ++j) {
            free(ctx->record_types[i].fields[j].name);
            free(ctx->record_types[i].fields[j].type_name);
        }
        free(ctx->record_types[i].fields);
    }

    for (i = 0; i < ctx->imported_path_count; ++i) {
        free(ctx->imported_paths[i]);
    }

    free(ctx->record_types);
    free(ctx->imported_paths);
}

char *diamond_preprocess_source(const char *source,
                                const char *source_path,
                                DiamondPreprocessStats *stats) {
    PreprocessContext ctx;
    char *expanded = NULL;
    char *without_records = NULL;
    char *rewritten = NULL;

    memset(&ctx, 0, sizeof(ctx));
    ctx.stats = stats;

    if (stats) {
        memset(stats, 0, sizeof(*stats));
    }

    if (!source) {
        return NULL;
    }

    expanded = expand_imports_recursive(&ctx, source, source_path);
    if (ctx.had_error || !expanded) {
        free_context(&ctx);
        free(expanded);
        return NULL;
    }

    without_records = collect_record_types(&ctx, expanded);
    free(expanded);
    if (ctx.had_error || !without_records) {
        free_context(&ctx);
        free(without_records);
        return NULL;
    }

    validate_record_types(&ctx);
    if (ctx.had_error) {
        free_context(&ctx);
        free(without_records);
        return NULL;
    }

    rewritten = rewrite_source(&ctx, without_records);
    free(without_records);

    if (ctx.had_error || !rewritten) {
        free_context(&ctx);
        free(rewritten);
        return NULL;
    }

    free_context(&ctx);
    return rewritten;
}

char *diamond_preprocess_file(const char *source_path, DiamondPreprocessStats *stats) {
    char *source = NULL;
    char *preprocessed = NULL;

    if (!source_path) {
        return NULL;
    }

    source = read_file_to_string(source_path);
    if (!source) {
        return NULL;
    }

    preprocessed = diamond_preprocess_source(source, source_path, stats);
    free(source);
    return preprocessed;
}
