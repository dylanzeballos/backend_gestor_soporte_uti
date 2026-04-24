# Skill Registry

Project: backend_gestor_soporte_uti  
Generated: 2026-04-23  
Source: sdd-init

## User Skills

| Skill | Scope | Path | Description |
|---|---|---|---|
| nestjs-best-practices | project | .agents/skills/nestjs-best-practices/SKILL.md | NestJS architecture, DI, security, performance patterns |
| nodejs-backend-patterns | project | .agents/skills/nodejs-backend-patterns/SKILL.md | Production backend patterns (REST, middleware, auth) |
| nodejs-best-practices | project | .agents/skills/nodejs-best-practices/SKILL.md | Node architecture and decision principles |
| prisma-cli | project | .agents/skills/prisma-cli/SKILL.md | Prisma CLI operations and migrations |
| prisma-client-api | project | .agents/skills/prisma-client-api/SKILL.md | Prisma query and transaction API usage |
| prisma-database-setup | project | .agents/skills/prisma-database-setup/SKILL.md | Prisma provider setup and connection guidance |
| prisma-postgres | project | .agents/skills/prisma-postgres/SKILL.md | Prisma Postgres provisioning/management |
| prisma-upgrade-v7 | project | .agents/skills/prisma-upgrade-v7/SKILL.md | Prisma v6->v7 migration guidance |
| typescript-advanced-types | project | .agents/skills/typescript-advanced-types/SKILL.md | Advanced TS types and compile-time safety |

## Project Conventions

| File | Purpose |
|---|---|
| .agents/skills/nestjs-best-practices/AGENTS.md | Primary NestJS implementation conventions |

## Compact Rules

### NestJS Backend Rules
- Organize code by feature modules (`auth`, `users`, `tickets`), not technical layers.
- Keep controllers thin, business logic in services, Prisma access in repositories.
- Use DTO validation (`class-validator`) for all request input.
- Centralize error formatting with a global exception filter.
- Use JWT guard/strategies for route protection; avoid ad hoc token checks in controllers.
- Avoid circular dependencies by exporting only required services from modules.

### Prisma Rules
- Use repository methods for query encapsulation and testability.
- Soft-delete where model supports `deletedAt` instead of hard delete.
- Keep includes/selects explicit to avoid unbounded payloads.

### Quality Rules
- Keep API routes under `/api` global prefix and feature-specific controller prefixes.
- Document endpoints via Swagger decorators.
- Keep environment variables validated at startup.
