# Invoicer (React + Express + Prisma + SQLite)

This is a full-stack invoicing starter app:

- Frontend: React + Vite + TypeScript
- Backend: Express + TypeScript
- Database: SQLite via Prisma ORM

## Features

- Login and registration required to use invoice data
- Google login support (OAuth redirect flow)
- User accounts stored in SQLite (Prisma `User` model)
- Per-user invoice storage (users only see their own invoices)
- UI localization: CZ, EN, GER, RU
- Light and dark theme switching
- Create invoices from the UI
- Persist invoices in SQLite
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

2. Create/apply database migration:

```bash
npx prisma migrate dev --name init
```

3. Start the app:

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
