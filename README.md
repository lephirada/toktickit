# TokTickIT — IT Service Desk Starter

Full-Stack IT Service Desk starter application built with React, Express, Prisma, and PostgreSQL.

## Project Structure

- `client/`: React + TypeScript + Vite + Bootstrap frontend
- `server/`: Node.js + Express + TypeScript + Prisma backend
- `docs/lab-01/`: Lab documentation & evidence

## Setup & Running Locally

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database (v14+ recommended)

---

### 1. PostgreSQL Database Setup & Verification

Before starting the server, ensure PostgreSQL is running and create the local database:

```sql
CREATE DATABASE toktickit;
CREATE USER toktickit WITH PASSWORD 'toktickit';
GRANT ALL PRIVILEGES ON DATABASE toktickit TO toktickit;
```

Or configure your existing PostgreSQL connection in `server/.env` (copy from `server/.env.example`):

```env
DATABASE_URL="postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public"
```

To verify database reachability and Prisma connectivity:

```bash
cd server
npx prisma db pull
```

> Note: Prisma datasource and generator client are initialized in `server/prisma/schema.prisma`. Database models (Category) will be migrated in Issue 3 (`feature/3-category-seed`).

---

### 2. Backend Setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

The Express API backend will run at `http://localhost:3000`.

---

### 3. Frontend Setup

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

The React + Vite + Bootstrap frontend will run at `http://localhost:5173`.

---

### 4. Running Tests

Automated testing is configured using **Vitest** as the test runner, with **Supertest** for testing Express REST API endpoints:

```bash
# Run Client UI Tests (Vitest + React Testing Library)
cd client && npm test

# Run Server API Tests (Vitest + Supertest)
cd server && npm test
```

---

## Verification & Acceptance Criteria (Issue 1 Checklist)

- [x] **Frontend:** React + TypeScript + Vite starts and builds clean.
- [x] **UI Styling:** Bootstrap installed (`bootstrap@5.3.3`) and imported in `main.tsx`.
- [x] **Backend:** Node.js + Express + TypeScript starts successfully on port 3000.
- [x] **Database:** PostgreSQL URL configured in `.env.example` & Prisma client singleton initialized in `server/src/prisma.ts`.
- [x] **Testing:** Vitest and Supertest test suites configured and runnable via `npm test`.
- [x] **Security & Environment:** `.gitignore` excludes `node_modules/`, `.env`, and build outputs; `.env.example` files present.
- [x] **Documentation:** Setup instructions and verification steps documented in `README.md`.