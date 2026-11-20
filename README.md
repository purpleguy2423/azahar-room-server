# azahar-room-server

Self-hosted multiplayer master server for the **Azahar** 3DS emulator (Citra fork).
A Node.js/TypeScript API + a React admin dashboard.

## Tech stack

- API: Node.js, Express, TypeScript, PostgreSQL
- Dashboard: React, Vite, TailwindCSS
- Real-time: WebSocket (`ws`)

## Quick start

```bash
cd api
npm install
cp .env.local.example .env.local
# Set DATABASE_URL to a PostgreSQL connection string
npm run dev
```

In another terminal:

```bash
cd dashboard
npm install
npm run dev
```

Dashboard: http://localhost:5173

API: http://localhost:3000

## Database configuration

Set `DATABASE_URL` to a PostgreSQL connection string, for example:

```text
postgresql://USER:PASSWORD@HOST:5432/DATABASE
```

Set `PGSSLMODE=require` when your PostgreSQL provider requires SSL. Database tables are initialized automatically when the API starts.

## Security

Never commit `.env.local`, `.env.production`, database passwords, or private tokens.
