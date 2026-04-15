#ifndef DIAMOND_PREPROCESS_H
#define DIAMOND_PREPROCESS_H

typedef struct {
    int import_count;
    int record_type_count;
    int record_variable_count;
} DiamondPreprocessStats;

char *diamond_preprocess_source(const char *source,
                                const char *source_path,
                                DiamondPreprocessStats *stats);
char *diamond_preprocess_file(const char *source_path, DiamondPreprocessStats *stats);

#endif /* DIAMOND_PREPROCESS_H */
