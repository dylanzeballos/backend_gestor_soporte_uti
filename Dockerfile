FROM node:22-alpine AS base
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile

COPY . .
RUN pnpm exec nest build

EXPOSE 3000
CMD ["node", "dist/main"]
