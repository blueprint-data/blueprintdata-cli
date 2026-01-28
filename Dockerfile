# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM oven/bun:1 AS deps
WORKDIR /app

# Copy workspace configuration
COPY package.json bun.lockb ./
COPY apps/cli/package.json ./apps/cli/
COPY apps/web/package.json ./apps/web/
COPY packages/@blueprintdata/models/package.json ./packages/@blueprintdata/models/
COPY packages/@blueprintdata/errors/package.json ./packages/@blueprintdata/errors/
COPY packages/@blueprintdata/config/package.json ./packages/@blueprintdata/config/
COPY packages/@blueprintdata/warehouse/package.json ./packages/@blueprintdata/warehouse/
COPY packages/@blueprintdata/analytics/package.json ./packages/@blueprintdata/analytics/
COPY packages/@blueprintdata/gateway/package.json ./packages/@blueprintdata/gateway/

# Install all dependencies
RUN bun install --frozen-lockfile

# ==========================================
# Stage 2: Build
# ==========================================
FROM oven/bun:1 AS builder
WORKDIR /app

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps ./apps
COPY --from=deps /app/packages ./packages

# Copy source code
COPY . .

# Build packages (in dependency order)
RUN bun run build:packages

# Build CLI
RUN bun run build:cli

# Build web app
RUN bun run build:web

# ==========================================
# Stage 3: CLI Runtime
# ==========================================
FROM oven/bun:1-slim AS cli
WORKDIR /app

# Copy built CLI and packages
COPY --from=builder /app/apps/cli/dist ./dist
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

# Entry point
ENTRYPOINT ["bun", "./dist/index.js"]

# ==========================================
# Stage 4: Web Runtime (Combined)
# ==========================================
FROM oven/bun:1-slim AS web
WORKDIR /app

# Copy built web app and packages
COPY --from=builder /app/apps/web/dist ./web
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules

# Environment
ENV NODE_ENV=production

# Expose ports
EXPOSE 3000 8080

# Start web server
CMD ["bun", "./web/server.js"]
