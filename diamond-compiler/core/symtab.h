#ifndef DIAMOND_SYMTAB_H
#define DIAMOND_SYMTAB_H

typedef enum {
    SYM_VAR,
    SYM_FUNC,
    SYM_PARAM,
    SYM_ARRAY
} SymbolKind;

typedef enum {
    TYPE_SHONKHA,
    TYPE_DOSHOMIK,
    TYPE_LEKHA,
    TYPE_SHOTTO,
    TYPE_KHALI,
    TYPE_UNKNOWN
} DiamondType;

typedef struct Symbol {
    char       *name;
    SymbolKind  kind;
    DiamondType type;
    int         scope_level;
    int         line_declared;
    int         array_size;    /* -1 if not an array */
    int         is_active;
    int         is_builtin;
    int         param_count;
    int         memory_address; /* simulated memory offset */
    DiamondType *param_types;
    struct Symbol *next;
} Symbol;

void          symtab_enter_scope(void);
void          symtab_leave_scope(void);
int           symtab_current_scope(void);
Symbol       *symtab_insert(const char *name, SymbolKind kind, DiamondType type, int array_size, int line);
Symbol       *symtab_insert_function(const char *name,
                                     DiamondType return_type,
                                     const DiamondType *param_types,
                                     int param_count,
                                     int line,
                                     int is_builtin);
Symbol       *symtab_lookup(const char *name);
Symbol       *symtab_lookup_current_scope(const char *name);
const Symbol *symtab_all_symbols(void);
int           symtab_symbol_count(void);
void          symtab_print(void);
void          symtab_clear(void);
void          symtab_register_builtins(void);
int           diamond_type_is_numeric(DiamondType type);
int           diamond_type_is_boolean(DiamondType type);
int           diamond_type_is_string(DiamondType type);
int           diamond_type_is_void(DiamondType type);
const char   *diamond_type_name(DiamondType type);
const char   *symbol_kind_name(SymbolKind kind);

#endif /* DIAMOND_SYMTAB_H */

