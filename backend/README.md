# Backend API

Node.js, Express 5, TypeScript, and PostgreSQL API for the Wellnest assessment.

## Run

From the repository root, start PostgreSQL with `docker compose up -d postgres`, copy `backend/.env.example` to `backend/.env`, then run:

```powershell
cd backend
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

The API runs on port `3001`; `/api/health` checks the PostgreSQL connection. Set `MISTRAL_API_KEY` in the backend environment to enable the real provider; without it, chat uses the deterministic fallback. The provider key must never be exposed to the frontend.

## Boundaries

- `routes/` handles auth, appointments, and chat HTTP contracts.
- `middleware/` contains JWT identity, Zod body validation, rate limiting, and error responses.
- `services/ai.ts` handles Mistral calls, response validation, context bounds, and fallback behavior.
- `db/` owns PostgreSQL pooling, idempotent schema setup, and development seed data.
- `database/schema.sql` is the DDL; `database/sample-data.sql` contains repeatable example inserts.

See the root [README](../README.md) for the architecture diagram, endpoint table, security decisions, database indexing strategy, full setup, and known limitations.
