# Invoicer (React + Express + Prisma)

This is a full-stack invoicing starter app:

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Database: PostgreSQL via Prisma ORM

## Features

- Login and registration required to use invoice data
- Google login support (OAuth redirect flow)
- User accounts stored in PostgreSQL (Prisma `User` model)
- Per-user invoice storage (users only see their own invoices)
- UI localization: CZ, EN, GER, RU
- Light and dark theme switching
- Create invoices from the UI
- Persist invoices in PostgreSQL
- List all invoices from the database
- Local API proxy from Vite to Express

## Project Scripts

- `npm run dev` starts frontend and backend together
- `npm run build` builds frontend and backend
- `npm run lint` runs ESLint
- `npm run db:generate` regenerates Prisma Client
- `npm run db:migrate -- --name <migration-name>` creates/applies Prisma migrations
- `npm run start` runs compiled backend from `dist-server`

## First Run

1. Install dependencies:

```bash
npm install
```

2. Set `DATABASE_URL` in `.env` to your PostgreSQL database.

3. Sync the schema:

```bash
npx prisma db push
```

4. Start the app:

```bash
npm run dev
```

Frontend runs on `http://localhost:5174` (or next free Vite port), API on `http://localhost:3001`.

## Google Login Setup

Add these variables to `.env` (you can fill real credentials later):

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3011/api/auth/google/callback
```

Also add the same callback URL to your Google OAuth app configuration.

## Render + Supabase Production Setup

If your API runs on Render and PostgreSQL runs on Supabase, this setup is supported.

Required environment variables in Render:

```bash
DATABASE_URL=...
DIRECT_URL=...
```

- `DATABASE_URL`: your normal Prisma connection string.
- `DIRECT_URL`: direct PostgreSQL connection (for migrations). If omitted, deploy scripts now fallback to `DATABASE_URL`.

Recommended Render Start Command:

```bash
npm run deploy
```

`npm run deploy` will:

1. Baseline historical migrations (safe to repeat)
2. Run `prisma migrate deploy`
3. Start the API server

This prevents runtime errors like missing columns after new releases.

## API Endpoints

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/google/start`
- `GET /api/auth/google/callback`
- `GET /api/auth/me`
- `GET /api/invoices`
- `POST /api/invoices`

`/api/invoices` and `/api/auth/me` require `Authorization: Bearer <token>`.

Example body for `POST /api/invoices`:

```json
{
  "customer": "Acme Corp",
  "amount": 1200,
  "status": "draft"
}
```
