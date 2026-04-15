# ── Stage 1: Build the Diamond compiler binary ────────────────────────
FROM debian:bookworm-slim AS compiler-build

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      flex bison gcc libc6-dev make && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY core/ core/

RUN cd core && \
    bison -d parser.y && \
    flex lexer.l && \
    gcc -O2 -o /build/diamond \
      lex.yy.c parser.tab.c ast.c symtab.c tac.c driver.c preprocess.c \
      -lfl -lm

# ── Stage 2: Production Node.js server ────────────────────────────────
FROM node:20-slim AS production

LABEL maintainer="Diamond Compiler Project"
LABEL description="Diamond backend API with embedded compiler binary"

# Create a least-privilege user for the compiler process
RUN groupadd --system diamond && \
    useradd --system --gid diamond --create-home --shell /bin/false diamond

WORKDIR /app

# Copy the compiler binary
COPY --from=compiler-build /build/diamond /app/diamond
RUN chmod 555 /app/diamond

# Install Node.js dependencies
COPY backend/package.json backend/package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy the backend source
COPY backend/src/ src/

# Set production defaults
ENV NODE_ENV=production
ENV PORT=4000
ENV DIAMOND_COMPILER_BIN=/app/diamond

EXPOSE 4000

# Switch to least-privilege user
USER diamond

# Health check for orchestrators
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:4000/api/v1/health/live').then(r=>{if(!r.ok)throw r})" || exit 1

CMD ["node", "src/server.js"]
