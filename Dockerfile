# ─────────────────────────────────────────────
# Stage 1 – Builder
# ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN npm install --legacy-peer-deps

COPY . .

# Genera el cliente Prisma apuntando directo al schema
# → no necesita DATABASE_URL en build time
RUN npx prisma generate --schema=./prisma/schema.prisma

# Build con nest-cli local
RUN node_modules/.bin/nest build

# Mostrar estructura del dist para debug
RUN find dist -name "main.js" | head -5

# ─────────────────────────────────────────────
# Stage 2 – Runner
# ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV PORT=7001

# node_modules completo (prisma, tsx necesarios en runtime)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Build compilado completo
COPY --from=builder /app/dist ./dist

# Cliente generado por Prisma
COPY --from=builder /app/src/generated ./src/generated

# Schema, migraciones y seed
COPY --from=builder /app/prisma ./prisma

# Config de Prisma (necesario para migrate deploy en runtime)
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 7001

# tsconfig sin rootDir → nest compila src/main.ts a dist/src/main.js
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node_modules/.bin/tsx prisma/seed.ts && node dist/main.js"]