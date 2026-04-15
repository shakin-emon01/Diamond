%{
#include "parser.tab.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

void add_error(const char *type, int line, const char *msg);
extern int g_suppress_lex_errors;

int line_no = 1;
%}

%option noyywrap
%x COMMENT

DIGIT      [0-9]
IDSTART    [A-Za-z_]
IDCHAR     [A-Za-z0-9_]
STRINGCHAR ([^\\\n\"]|\\.)

%%

"shuru"                     { return SHURU; }
"shesh"                     { return SHESH; }
"dhoro"                     { return DHORO; }
"shonkha"                   { return SHONKHA; }
"doshomik"                  { return DOSHOMIK; }
"lekha"                     { return LEKHA; }
"shotto"                    { return SHOTTO; }
"khali"                     { return KHALI; }
"auto"                      { return AUTO; }
"mithya"                    { return MITHYA; }
"jodi"                      { return JODI; }
"naile"                     { return NAILE; }
"jotokhon"                  { return JOTOKHON; }
"ghurao"                    { return GHURAO; }
"kaj"                       { return KAJ; }
"ferot"                     { return FEROT; }
"dekhao"                    { return DEKHAO; }
"nao"                       { return NAO; }
"ebong"                     { return EBONG; }
"ba"                        { return BA; }
"na"                        { return NA; }

"#include"[^\n]*            { /* documentation-only include */ }
"//"[^\n]*                  { /* single-line comment */ }
"/*"                        { BEGIN(COMMENT); }
<COMMENT>"*/"               { BEGIN(INITIAL); }
<COMMENT>\n                 { line_no++; }
<COMMENT>.                  { /* inside multi-line comment */ }

{DIGIT}+"."{DIGIT}+         { yylval.fval = strtod(yytext, NULL); return NUMBER_FLOAT; }
{DIGIT}+                    { yylval.ival = strtol(yytext, NULL, 10); return NUMBER_INT; }
\"{STRINGCHAR}*\"           { yylval.sval = strdup(yytext); return STRING; }
{IDSTART}{IDCHAR}*          { yylval.sval = strdup(yytext); return ID; }

"+"                         { return PLUS; }
"-"                         { return MINUS; }
"*"                         { return MUL; }
"/"                         { return DIV; }
"="                         { return ASSIGN; }
"<="                        { return LE; }
">="                        { return GE; }
"=="                        { return EQ; }
"!="                        { return NE; }
"<"                         { return LT; }
">"                         { return GT; }
"("                         { return LPAREN; }
")"                         { return RPAREN; }
"{"                         { return LBRACE; }
"}"                         { return RBRACE; }
"["                         { return LBRACKET; }
"]"                         { return RBRACKET; }
";"                         { return SEMICOLON; }
","                         { return COMMA; }

[ \t\r]+                    { /* skip whitespace */ }
\n                          { line_no++; }

.                           {
                                if (!g_suppress_lex_errors) {
                                    char buffer[128];
                                    snprintf(buffer, sizeof(buffer), "unexpected character '%s'", yytext);
                                    add_error("lexical", line_no, buffer);
                                }
                            }

%%
