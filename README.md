# TokTickIT — IT Service Desk Starter

Full-Stack IT Service Desk starter application built with React, Express, Prisma, and PostgreSQL.

## Project Structure

- `client/`: React + TypeScript + Vite + Bootstrap frontend
- `server/`: Node.js + Express + TypeScript + Prisma backend
- `docs/lab-01/`: Lab documentation & evidence

## Setup & Running Locally

### Prerequisites

- Node.js (v18+ recommended)
- PostgreSQL database

### 1. Backend Setup

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

The backend server will run at `http://localhost:3000`.

### 2. Frontend Setup

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

The frontend application will run at `http://localhost:5173`.

### 3. Database Migration & Seeding

```bash
cd server
npm run prisma:migrate
npm run prisma:seed
```

### 4. Running Tests

```bash
# Run Client UI Tests (Vitest)
cd client && npm test

# Run Server API Tests (Vitest & Supertest)
cd server && npm test
```