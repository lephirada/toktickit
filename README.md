# TokTickIT — IT Service Desk Application (Lab 1 Starter)

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)

> **TokTickIT** is a full-stack IT Service Desk web application for Account & Access, Hardware, Software, and Network requests.
> **Lab 1 Goal:** Build a complete vertical slice proving integration across **React + Bootstrap UI -> Express REST API -> Prisma ORM -> PostgreSQL Database**.

---

## Tech Stack Architecture

| Layer | Technology | Description |
| --- | --- | --- |
| **Frontend** | React 18 + TypeScript + Vite | Responsive Single Page Application |
| **UI Framework** | Bootstrap 5 | Modern, accessible styling and layout components |
| **Backend** | Node.js + Express + TypeScript | RESTful API architecture |
| **Database & ORM** | PostgreSQL + Prisma ORM | Relational database schema with type-safe client |
| **Testing** | Vitest + Supertest + React Testing Library | Unit, Integration API, and UI component testing |
| **CI/CD** | GitHub Actions | Automated build, test execution, and database migration checks |

---

## Repository Structure

```text
toktickit/
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── client/
│   ├── src/
│   │   ├── api.ts
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── tests/
│   │   └── lab-01/
│   │       ├── App.test.tsx
│   │       └── setup.ts
│   ├── .env.example
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/
│   ├── prisma/
│   │   ├── migrations/
│   │   ├── schema.prisma
│   │   └── seed.ts
│   ├── src/
│   │   ├── app.ts
│   │   ├── index.ts
│   │   └── prisma.ts
│   ├── tests/
│   │   └── lab-01/
│   │       ├── categories.test.ts
│   │       └── health.test.ts
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── docs/
│   └── lab-01/
│       ├── ai_use.md
│       ├── reviewer.md
│       └── tests.md
│
├── .gitignore
└── README.md
```

---

## API Endpoints (Lab 1)

### 1. Health Check
* **Endpoint:** `GET /api/health`
* **Response (200 OK):**
  ```json
  {
    "status": "ok",
    "service": "TokTickIT API"
  }
  ```

### 2. Category List
* **Endpoint:** `GET /api/categories`
* **Response (200 OK):**
  ```json
  [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
  ```

---

## Setup & Running Locally

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **PostgreSQL**: `v14.0` or higher

---

### 1. Database Setup & Migration

Ensure PostgreSQL service is running on your machine, then create the database and user:

```sql
CREATE DATABASE toktickit;
CREATE USER toktickit WITH PASSWORD 'toktickit';
GRANT ALL PRIVILEGES ON DATABASE toktickit TO toktickit;
```

Navigate to `server/`, create environment configuration, and run migrations/seeds:

```bash
cd server
cp .env.example .env

# Run Prisma migrations & seed default categories
npx prisma migrate dev --name init
npm run prisma:seed
```

---

### 2. Backend Server Setup

```bash
cd server
npm install
npm run dev
```
* Express API Server will run at: **`http://localhost:3000`**

---

### 3. Frontend Client Setup

```bash
cd client
npm install
cp .env.example .env
npm run dev
```
* React Web Application will run at: **`http://localhost:5173`**

---

## Running Automated Tests

Testing is powered by **Vitest**, utilizing **Supertest** for Express API integration testing and **React Testing Library** for frontend component verification.

```bash
# Run Frontend UI Tests (Vitest)
cd client
npm test

# Run Backend API Tests (Vitest + Supertest)
cd server
npm test
```

---

## Git Branch Discipline & Workflow

This project enforces a structured **Git Flow** strategy to maintain code quality and integration stability:

```text
main (Production / Stable Release)
 ^
 |-- lab1-staging (Integration Branch)
      ^
      |-- feature/1-project-foundation  (Issue 1)
      |-- feature/2-health-check        (Issue 2)
      |-- feature/3-category-seed       (Issue 3)
      `-- feature/4-category-list       (Issue 4)
```

### Branching Strategy Guidelines
- `main`: Protected release branch containing production-ready code.
- `lab1-staging`: Integration branch where tested features are combined.
- `feature/*`: Short-lived isolation branches created per GitHub Issue.
- **Pull Request (PR) Policy:** Direct pushes to `main` and `lab1-staging` are forbidden. All code must pass automated GitHub Actions CI and receive peer reviewer approval before merging.
