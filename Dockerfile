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
# pnpm-workspace.yaml no tiene "packages" (no es monorepo), usamos npm
RUN npm install --legacy-peer-deps

COPY . .

# Genera el cliente Prisma apuntando directo al schema
# → evita que prisma.config.ts pida DATABASE_URL en build time
RUN npx prisma generate --schema=./prisma/schema.prisma

RUN npm run build

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

# Copiar node_modules COMPLETO del builder
# (prisma, tsx y otros devDeps son necesarios en runtime para migrate y seed)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Build compilado
COPY --from=builder /app/dist ./dist

# Cliente generado por Prisma (src/generated/prisma según schema)
COPY --from=builder /app/src/generated ./src/generated

# Schema, migraciones y seed
COPY --from=builder /app/prisma ./prisma

EXPOSE 7001

# 1) Migraciones  2) Seed (upsert = idempotente)  3) App
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema=prisma/schema.prisma && node_modules/.bin/tsx prisma/seed.ts && node dist/main.js"]