# ─────────────────────────────────────────────
# Stage 1 – Builder
# ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# Genera el cliente Prisma apuntando directo al schema
# → evita que prisma.config.ts pida DATABASE_URL en build time
RUN npx prisma generate --schema=./prisma/schema.prisma

RUN pnpm run build

# ─────────────────────────────────────────────
# Stage 2 – Runner
# ─────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    ca-certificates \
  && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

ENV NODE_ENV=production
ENV PORT=7001

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build compilado
COPY --from=builder /app/dist ./dist

# Cliente generado por Prisma (va a src/generated/prisma según schema)
COPY --from=builder /app/src/generated ./src/generated

# Schema y migraciones (necesarios para migrate deploy y seed)
COPY --from=builder /app/prisma ./prisma

# Config de Prisma y seed
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts

EXPOSE 7001

# 1) Corre migraciones
# 2) Corre seed (upsert → idempotente, seguro correrlo siempre)
# 3) Arranca la app
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && node dist/main.js"]