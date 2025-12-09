# Marketplace Backend (NestJS + Prisma)

## Quick start
1) Install deps:
```bash
npm install
```

2) Start Postgres via Docker:
```bash
docker-compose up -d postgres
```

3) Create `.env` from sample and adjust if needed:
```bash
cp env.example .env
```
`DATABASE_URL` in the sample points to the dockerized Postgres (`postgres/postgres@localhost:5432/marketplace`).

4) Run Prisma migrations (and generate client):
```bash
npx prisma migrate dev --name init
```

5) Start the app:
```bash
npm run start:dev
```

Swagger docs: http://localhost:3000/docs

## Notes
- Docker Compose includes only Postgres; the app runs locally via `npm run start:dev`. Add an app service if you want to containerize Nest as well.
- Default Postgres credentials: user `postgres`, password `postgres`, db `marketplace`. Data is persisted in the `pgdata` named volume.

