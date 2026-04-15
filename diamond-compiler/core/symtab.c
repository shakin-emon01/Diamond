#include "symtab.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static Symbol *symtab_head = NULL;
static int current_scope = 0;
static int symbol_count = 0;
static int next_memory_address = 4096;
static int scope_address_stack[16] = {0};

typedef struct {
    const char *name;
    DiamondType return_type;
    int param_count;
    DiamondType param_types[3];
} BuiltinSignature;

static const BuiltinSignature builtin_signatures[] = {
    { "jora", TYPE_LEKHA, 2, { TYPE_LEKHA, TYPE_LEKHA, TYPE_UNKNOWN } },
    { "dairgho", TYPE_SHONKHA, 1, { TYPE_LEKHA, TYPE_UNKNOWN, TYPE_UNKNOWN } },
    { "ongsho", TYPE_LEKHA, 3, { TYPE_LEKHA, TYPE_SHONKHA, TYPE_SHONKHA } },
    { "tulona", TYPE_SHONKHA, 2, { TYPE_LEKHA, TYPE_LEKHA, TYPE_UNKNOWN } },
    { "boro", TYPE_DOSHOMIK, 2, { TYPE_DOSHOMIK, TYPE_DOSHOMIK, TYPE_UNKNOWN } },
    { "chhoto", TYPE_DOSHOMIK, 2, { TYPE_DOSHOMIK, TYPE_DOSHOMIK, TYPE_UNKNOWN } },
    { "porom", TYPE_DOSHOMIK, 1, { TYPE_DOSHOMIK, TYPE_UNKNOWN, TYPE_UNKNOWN } },
    { "ulto", TYPE_LEKHA, 1, { TYPE_LEKHA, TYPE_UNKNOWN, TYPE_UNKNOWN } },
    { "vagshesh", TYPE_SHONKHA, 2, { TYPE_SHONKHA, TYPE_SHONKHA, TYPE_UNKNOWN } },
    { "gol", TYPE_SHONKHA, 1, { TYPE_DOSHOMIK, TYPE_UNKNOWN, TYPE_UNKNOWN } },
    { "shonkhakor", TYPE_SHONKHA, 1, { TYPE_LEKHA, TYPE_UNKNOWN, TYPE_UNKNOWN } },
    { "lekhakor", TYPE_LEKHA, 1, { TYPE_DOSHOMIK, TYPE_UNKNOWN, TYPE_UNKNOWN } }
};

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

static DiamondType *copy_param_types(const DiamondType *param_types, int param_count) {
    DiamondType *copy = NULL;

    if (!param_types || param_count <= 0) {
        return NULL;
    }

    copy = (DiamondType *)malloc(sizeof(DiamondType) * (size_t)param_count);
    if (!copy) {
        return NULL;
    }

    memcpy(copy, param_types, sizeof(DiamondType) * (size_t)param_count);
    return copy;
}

int diamond_type_is_numeric(DiamondType type) {
    return type == TYPE_SHONKHA || type == TYPE_DOSHOMIK;
}

int diamond_type_is_boolean(DiamondType type) {
    return type == TYPE_SHOTTO;
}

int diamond_type_is_string(DiamondType type) {
    return type == TYPE_LEKHA;
}

int diamond_type_is_void(DiamondType type) {
    return type == TYPE_KHALI;
}

void symtab_enter_scope(void) {
    if (current_scope < 15) {
        scope_address_stack[current_scope + 1] = next_memory_address;
    }
    current_scope++;
}

void symtab_leave_scope(void) {
    Symbol *symbol = symtab_head;

    while (symbol) {
        if (symbol->scope_level == current_scope) {
            symbol->is_active = 0;
        }
        symbol = symbol->next;
    }

    if (current_scope > 0) {
        if (current_scope <= 15) {
            next_memory_address = scope_address_stack[current_scope];
        }
        current_scope--;
    }
}

int symtab_current_scope(void) {
    return current_scope;
}

Symbol *symtab_insert(const char *name, SymbolKind kind, DiamondType type, int array_size, int line) {
    Symbol *symbol = (Symbol *)calloc(1, sizeof(Symbol));
    if (!symbol) {
        return NULL;
    }

    symbol->name = dup_string(name);
    symbol->kind = kind;
    symbol->type = type;
    symbol->scope_level = current_scope;
    symbol->line_declared = line;
    symbol->array_size = array_size;
    symbol->is_active = 1;
    symbol->is_builtin = 0;
    symbol->param_count = 0;
    
    if (kind == SYM_VAR || kind == SYM_PARAM) {
        symbol->memory_address = next_memory_address;
        next_memory_address += 4;
    } else if (kind == SYM_ARRAY) {
        symbol->memory_address = next_memory_address;
        next_memory_address += 4 * (array_size > 0 ? array_size : 1);
    } else {
        symbol->memory_address = 0;
    }
    
    symbol->param_types = NULL;
    symbol->next = symtab_head;

    symtab_head = symbol;
    symbol_count++;
    return symbol;
}

Symbol *symtab_insert_function(const char *name,
                               DiamondType return_type,
                               const DiamondType *param_types,
                               int param_count,
                               int line,
                               int is_builtin) {
    Symbol *symbol = symtab_insert(name, SYM_FUNC, return_type, -1, line);

    if (!symbol) {
        return NULL;
    }

    symbol->is_builtin = is_builtin;
    symbol->param_count = param_count;
    symbol->param_types = copy_param_types(param_types, param_count);
    return symbol;
}

Symbol *symtab_lookup(const char *name) {
    Symbol *symbol = symtab_head;

    while (symbol) {
        if (symbol->is_active && strcmp(symbol->name, name) == 0) {
            return symbol;
        }
        symbol = symbol->next;
    }

    return NULL;
}

Symbol *symtab_lookup_current_scope(const char *name) {
    Symbol *symbol = symtab_head;

    while (symbol) {
        if (symbol->is_active &&
            symbol->scope_level == current_scope &&
            strcmp(symbol->name, name) == 0) {
            return symbol;
        }
        symbol = symbol->next;
    }

    return NULL;
}

const Symbol *symtab_all_symbols(void) {
    return symtab_head;
}

int symtab_symbol_count(void) {
    return symbol_count;
}

const char *diamond_type_name(DiamondType type) {
    switch (type) {
    case TYPE_SHONKHA: return "shonkha";
    case TYPE_DOSHOMIK: return "doshomik";
    case TYPE_LEKHA: return "lekha";
    case TYPE_SHOTTO: return "shotto";
    case TYPE_KHALI: return "khali";
    case TYPE_UNKNOWN: return "unknown";
    default: return "unknown";
    }
}

const char *symbol_kind_name(SymbolKind kind) {
    switch (kind) {
    case SYM_VAR: return "variable";
    case SYM_FUNC: return "function";
    case SYM_PARAM: return "parameter";
    case SYM_ARRAY: return "array";
    default: return "unknown";
    }
}

void symtab_print(void) {
    const Symbol *symbol = symtab_head;

    printf("Symbol table:\n");
    while (symbol) {
        printf("  %s (kind=%s, type=%s, scope=%d, line=%d, size=%d, active=%d",
               symbol->name,
               symbol_kind_name(symbol->kind),
               diamond_type_name(symbol->type),
               symbol->scope_level,
               symbol->line_declared,
               symbol->array_size,
               symbol->is_active);
        if (symbol->kind == SYM_FUNC) {
            int i = 0;
            printf(", params=(");
            for (i = 0; i < symbol->param_count; ++i) {
                if (i > 0) {
                    printf(", ");
                }
                printf("%s", diamond_type_name(symbol->param_types[i]));
            }
            printf(")");
        }
        printf(")\n");
        symbol = symbol->next;
    }
}

void symtab_register_builtins(void) {
    int i = 0;

    for (i = 0; i < (int)(sizeof(builtin_signatures) / sizeof(builtin_signatures[0])); ++i) {
        const BuiltinSignature *signature = &builtin_signatures[i];

        if (!symtab_lookup_current_scope(signature->name)) {
            symtab_insert_function(signature->name,
                                   signature->return_type,
                                   signature->param_types,
                                   signature->param_count,
                                   0,
                                   1);
        }
    }
}

void symtab_clear(void) {
    Symbol *symbol = symtab_head;

    while (symbol) {
        Symbol *next = symbol->next;
        free(symbol->name);
        free(symbol->param_types);
        free(symbol);
        symbol = next;
    }

    symtab_head = NULL;
    current_scope = 0;
    symbol_count = 0;
    next_memory_address = 4096;
}

