#ifndef DIAMOND_TAC_H
#define DIAMOND_TAC_H

#include "ast.h"

typedef struct TacInstruction {
    int index;
    char *op;
    char *arg1;
    char *arg2;
    char *result;
    struct TacInstruction *next;
} TacInstruction;

typedef struct {
    int constant_folds;
    int strength_reductions;
    int common_subexpressions;
    int dead_code_eliminated;
    int unreachable_removed;
} TacStats;

void                  tac_generate(const AstNode *root);
void                  tac_clear(void);
const TacInstruction *tac_head(void);
const TacInstruction *tac_raw_head(void);
int                   tac_count(void);
int                   tac_raw_count(void);
const char           *tac_assembly(void);
const TacStats       *tac_stats(void);

#endif /* DIAMOND_TAC_H */
