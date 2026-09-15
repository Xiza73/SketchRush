---
paths:
  - 'backend/src/migrations/**'
  - 'backend/src/config/typeorm.config.ts'
---

# Migrations (TypeORM, PostgreSQL)

v1 of this game has **no database** (rooms live in memory). These rules apply
the day persistence is added; do not add TypeORM before that decision is
recorded in `docs/context/04-decisions-and-pending.md`.

- `synchronize` is never enabled; every schema change is a migration run at
  boot (`migrationsRun: true`).
- Schema changes: `pnpm migration:generate src/migrations/Name` and then
  **read the generated file**. Delete any `DROP INDEX` for indexes created
  with raw SQL or already dropped by an earlier migration, and any churn that
  only re-orders columns.
- Data changes (seeds, backfills, raw SQL): `pnpm migration:create`.
- `down()` must undo `up()` exactly; test with `migration:run` then
  `migration:revert` against the docker database.
- Adding a column that the domain reads immediately needs a default or a
  backfill in the same migration; the app boots with the new code.
- Indexes declared on an ORM entity must match the database; a declared
  index that a migration dropped makes the next `migration:generate` try
  to re-create it.
