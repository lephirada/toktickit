# TokTickIT — IT Service Desk Application

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Bootstrap](https://img.shields.io/badge/Bootstrap-7952B3?style=for-the-badge&logo=bootstrap&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Vitest](https://img.shields.io/badge/Vitest-6E9F18?style=for-the-badge&logo=vitest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-45BA4B?style=for-the-badge&logo=playwright&logoColor=white)

> **TokTickIT** is a full-stack IT Service Desk web application for Account & Access, Hardware, Software, and Network requests.
>
> **Team Information:**
>
> - **Author:** Phirada Lekpaeng — 67070503491 (@lephirada)
> - **Peer Reviewer:** Penwatsa Saengyenpan — 67070503431 (@Phenwatsa)
> - **Course:** CPE 334 Software Engineering Laboratory
>
> **Sprint Goals:**
>
> - **Lab 1 Goal:** Build a complete vertical slice proving integration across **React + Bootstrap UI -> Express REST API -> Prisma ORM -> PostgreSQL Database**.
> - **Lab 2 Sprint Goal:** **Requester Ticketing Experience with Zen Green UI** — Deliver an accessible (WCAG 2.1 AA compliant), intuitive requester ticketing flow encompassing requester identity selection, pre-upload attachment ticket creation with dirty form guards, searchable/filterable ticket dashboard, attachment lifecycle with soft-removal and audit logging, and end-to-end Playwright verification.

---

## Tech Stack Architecture

| Layer                          | Technology                                 | Description                                                     |
| ------------------------------ | ------------------------------------------ | --------------------------------------------------------------- |
| **Frontend**                   | React 18 + TypeScript + Vite               | Responsive Single Page Application                              |
| **UI & Styling**               | Zen Green Design Tokens + Bootstrap 5      | Calming, accessible palette (WCAG 2.1 AA compliant)             |
| **Backend**                    | Node.js + Express + TypeScript             | RESTful API architecture with transactional guarantees          |
| **Database & ORM**             | PostgreSQL + Prisma ORM                    | Relational database schema with typed client and migrations     |
| **Unit & Integration Testing** | Vitest + Supertest + React Testing Library | Server API integration and client component testing             |
| **End-to-End Testing**         | Playwright                                 | Full user-journey browser automation across desktop and mobile  |
| **CI/CD**                      | GitHub Actions                             | Automated build, client/server tests, and Playwright E2E suites |

---

## Lab 2: Requester Ticketing MVP Features

### 1. Requester Context & Identity (Issue 6)

- **Header Context Switcher:** Quick switcher allowing users to simulate different employee personas without authentication hurdles (`X-Requester-Id` header).
- **Active User Filtering:** Only active employees are selectable for ticket operations.
- **Global Context State:** Automatically propagates requester context across ticket creation, listing, and detail views.

### 2. Ticket Creation with Attachment Staging & Dirty Guard (Issue 7)

- **Structured Ticket Form:** Mandatory Summary (10–100 chars), Description (20–1000 chars), Category selection, Related System selection, and Priority level (`P0_URGENT` to `P3_LOW`).
- **Pre-Upload Attachment Staging:** Asynchronous file staging via dropzone/picker (up to 5 files, 5MB max each; JPG, PNG, WEBP, PDF) returning staged tokens before ticket submission.
- **Form Dirty Guard:** Built-in unsaved changes detection that alerts users if they attempt to switch views or requesters while composing a ticket.

### 3. My Tickets Dashboard (Issue 8)

- **Dual Responsive Layout:** Clean multi-column table on desktop and responsive card view on mobile screens.
- **Search & Multi-Filter:** Real-time text search (Summary and Ticket ID `TKT-YYYY-NNNNN`), status filter (`ALL`, `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`), and priority filter.
- **Pagination & Sorting:** Configurable page sizes (10, 20, 50) sorted by creation date descending by default.
- **Row-Level Requester Isolation:** Requesters only view tickets belonging to their own profile.

### 4. Ticket Detail, Attachment Management & Audit Timeline (Issue 9)

- **Comprehensive Details:** View full ticket metadata, colored status/priority badges, system details, and full description.
- **Attachment Quota & Download:** View active attachments, download active files via `GET /api/attachments/:id/download`, and upload additional attachments respecting the 5-file maximum active quota.
- **Soft-Removal with Mandatory Reason:** Modal-based removal requiring a reason (or custom explanation) that flags files as `isSoftDeleted: true` and blocks subsequent downloads (`410 Gone`).
- **Database-Persisted Audit Timeline:** Full activity history (`TICKET_CREATED`, `ATTACHMENT_ADDED`, `ATTACHMENT_REMOVED`) stored in PostgreSQL `TicketActivity` and displayed in a chronological timeline.

### 5. Playwright E2E Suite & Zen Green UI (Issue 10)

- **Automated End-to-End Test:** Validates complete requester flow from identity selection, ticket creation, dashboard verification, detail inspection, attachment removal, and audit timeline updates.
- **Zen Green Palette:** Cohesive emerald/sage color palette designed for high contrast and reduced visual fatigue.

---

## Lab 3: Users, Roles, IT Staff Ticketing, and Admin Screens

### 1. Database Migration & RBAC Foundation (Issue 11)

- **Non-Destructive Schema Migration:** Extends data model to support `User`, `Ticket`, `Comment`, and `TicketActivity` with zero data loss for legacy records.
- **Role-Based Users:** Supports `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR` roles with bcrypt hashed credentials.
- **Idempotent Seed:** Seeds 10 baseline users (5 Requesters, 4 IT Staff, 1 Administrator) preserving credentials across repeated runs.

### 2. Authentication & Session Management (Issue 12)

- **HTTP-Only Session Cookies:** Secure JWT stored in `toktickit_session` (`SameSite=Lax`, `HttpOnly`, `Secure` in production).
- **Zero-Trust Identity Authority:** Server strictly derives identity from signed session token; client-supplied identity headers are rejected (`401 Unauthorized`).
- **Database Liveness Check:** Validates `User.isActive === true` on every authenticated request, invalidating deactivated sessions immediately.
- **Forced First-Login Password Change:** `requirePasswordChanged` middleware blocks operational endpoints with `403 PASSWORD_CHANGE_REQUIRED` until password is reset.
- **Idempotent Logout:** `POST /api/auth/logout` clears the session cookie safely.

### 3. Role Authorization & Discussion Lifecycle (Issue 12)

- **Ownership Isolation:** Requesters accessing unowned tickets or attachments receive `404 Not Found` (anti-enumeration / anti-leakage).
- **Public Discussion Thread:** Append-only public comments with role-aware privacy (internal notes hidden from requesters).
- **Resolution Confirmation:** `POST /api/tickets/:id/confirm-resolved` allows requesters to indicate resolution, transitioning tickets from `WAITING_FOR_REQUESTER` to `IN_PROGRESS` and generating audit trails without prematurely setting `RESOLVED`.

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
│   │   ├── components/       # UI Components (Header, Modals, Sections, Icons)
│   │   ├── context/          # RequesterContext provider and hook
│   │   ├── styles/           # Zen Green design tokens and styles
│   │   ├── api.ts            # Client API service
│   │   ├── App.tsx           # Main application view coordinator
│   │   └── main.tsx          # Application entry point
│   ├── tests/
│   │   ├── lab-01/           # Lab 1 foundation tests
│   │   └── lab-02/           # Lab 2 UI & component tests
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── server/
│   ├── prisma/
│   │   ├── migrations/       # Database migration history
│   │   ├── schema.prisma     # Prisma data models
│   │   └── seed.ts           # Seed script (Requesters, Categories, Systems)
│   ├── src/
│   │   ├── app.ts            # Express REST API routes and business logic
│   │   ├── index.ts          # Server entry point
│   │   └── prisma.ts         # Prisma client singleton
│   ├── tests/
│   │   ├── lab-01/           # Lab 1 API tests
│   │   └── lab-02/           # Lab 2 API integration tests
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
│
├── e2e/
│   └── lab-02/
│       └── requester-ticketing.spec.ts  # Playwright E2E journey
│
├── artifacts/
│   └── lab-02/
│       └── screenshots/      # Visual verification evidence and UI screenshots
│           ├── create-ticket/
│           ├── my-tickets/
│           └── ticket-detail/
│
├── docs/
│   ├── lab-01/               # Lab 1 documentation
│   │   ├── ai_use.md
│   │   ├── reviewer.md
│   │   └── tests.md
│   └── lab-02/               # Lab 2 documentation
│       ├── ai-use.md
│       ├── api-spec.md
│       ├── reviewer.md
│       ├── specification.md
│       ├── tests.md
│       └── ui-spec.md
│
├── playwright.config.ts      # Playwright E2E configuration
├── .gitignore
└── README.md
```

---

## API Endpoints Reference

### Lab 1 Foundation

| Method | Endpoint          | Description                    |
| :----- | :---------------- | :----------------------------- |
| `GET`  | `/api/health`     | Service health status check    |
| `GET`  | `/api/categories` | Retrieve all ticket categories |

### Lab 2 Requester Ticketing

| Method   | Endpoint                        | Description                                                                          |
| :------- | :------------------------------ | :----------------------------------------------------------------------------------- |
| `GET`    | `/api/requesters`               | List all active requesters for context switching                                     |
| `GET`    | `/api/systems`                  | List all related systems                                                             |
| `POST`   | `/api/attachments/stage`        | Pre-upload file staging (multipart/form-data)                                        |
| `POST`   | `/api/tickets`                  | Create a new ticket with staged attachment tokens                                    |
| `GET`    | `/api/tickets`                  | List tickets for active requester (`X-Requester-Id`) with search, filter, pagination |
| `GET`    | `/api/tickets/:id`              | Get ticket details, active attachments, and activity timeline                        |
| `POST`   | `/api/tickets/:id/attachments`  | Add staged attachments to an existing ticket                                         |
| `GET`    | `/api/attachments/:id/download` | Download active attachment file (`410 Gone` if soft-deleted)                         |
| `DELETE` | `/api/attachments/:id`          | Soft-remove attachment with mandatory deletion reason                                |

### Lab 3 Authentication & Discussion API

| Method   | Endpoint                            | Description                                                                              | Access / Role               |
| :------- | :---------------------------------- | :--------------------------------------------------------------------------------------- | :-------------------------- |
| `POST`   | `/api/auth/login`                   | Authenticate user with email and password, issue `toktickit_session` cookie              | Public                      |
| `GET`    | `/api/auth/me`                      | Get current authenticated user profile and role                                          | Authenticated               |
| `POST`   | `/api/auth/change-password`         | Change password, update bcrypt hash, and clear `mustChangePassword` flag                 | Authenticated               |
| `POST`   | `/api/auth/logout`                  | Clear session cookie and invalidate local session (idempotent)                           | Public / Authenticated      |
| `GET`    | `/api/tickets/:id/comments`         | Fetch public comments for a ticket (internal notes filtered out for requesters)          | Authenticated (Owner/Staff) |
| `POST`   | `/api/tickets/:id/comments`         | Append a new public comment to the discussion thread (1–2000 chars)                      | Authenticated (Owner/Staff) |
| `POST`   | `/api/tickets/:id/confirm-resolved` | Requester confirms issue appears resolved (sets flag, transitions status, logs activity) | Requester (Owner only)      |

---

## Setup & Running Locally

### Prerequisites

- **Node.js**: `v18.0.0` or higher (`v20+` recommended)
- **PostgreSQL**: `v14.0` or higher
- **npm**: `v9.0.0` or higher

---

### 1. Database Setup & Migrations

Ensure PostgreSQL service is running on your machine, then create the database and user:

```sql
CREATE DATABASE toktickit;
CREATE USER toktickit WITH PASSWORD 'toktickit';
GRANT ALL PRIVILEGES ON DATABASE toktickit TO toktickit;
```

Navigate to `server/`, create your environment file, and run migrations and database seed:

```bash
cd server
cp .env.example .env

# Run Prisma migrations
npx prisma migrate dev

# Seed database (Categories, Related Systems, Active/Inactive Requesters)
npm run prisma:seed
```

> **Seed Data Includes (Lab 2 Baseline):**
>
> - 4 Active Requesters (Alex Morgan, Samira Khan, Liam Davis, Chloe Bennet) & 1 Inactive Requester
> - 4 Categories (Account & Access, Hardware, Software, Network)
> - 6 Related Systems (VPN, Email, ERP, Laptop Fleet, HR Portal, Wi-Fi Infrastructure)
>
> **Lab 3 Seed Dataset:**
>
> - 10 Users across 3 Roles: 5 Requesters (Sarah Connor, John Doe, Jennifer Anderson, Michael Brown, Kyle Reese), 4 IT Staff (David Lee, Alex Morgan, Chris Taylor, Kevin Patel), 1 Administrator (`admin@toktickit.com`)
> - Bcrypt hashed credentials: Default password `Password123!` (Admin: `Admin123!`)

---

### 2. Backend Server Setup

```bash
cd server
npm install
npm run dev
```

- Express API Server runs at: **`http://localhost:3000`**

---

### 3. Frontend Client Setup

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

- React Web Application runs at: **`http://localhost:5173`**

---

## Running Automated Tests

Testing covers unit, integration, and end-to-end verification across the stack:

### 1. Server Tests (Vitest + Supertest)

Runs API endpoint tests, transactional integrity checks, quota enforcement, and soft-delete tests:

```bash
npm --prefix server test
```

### 2. Client Tests (Vitest + React Testing Library)

Runs UI component tests, dirty guard checks, dashboard filters, and attachment interactions:

```bash
npm --prefix client test
```

### 3. End-to-End Tests (Playwright)

Executes full browser automation testing the entire requester ticketing lifecycle:

```bash
npm run test:e2e
```

> **Convenience Root Command:**
> To run both client and server test suites together:
>
> ```bash
> npm test
> ```

---

## Repository Documentation References

### Lab 1 Documentation

- [`docs/lab-01/tests.md`](docs/lab-01/tests.md) — Lab 1 test specifications and results.
- [`docs/lab-01/reviewer.md`](docs/lab-01/reviewer.md) — Lab 1 peer review records.
- [`docs/lab-01/ai_use.md`](docs/lab-01/ai_use.md) — Lab 1 AI assistance disclosures.

### Lab 2 Documentation

- [**Specification Document** (`docs/lab-02/specification.md`)](docs/lab-02/specification.md) — Sprint 2 requirements, domain models, business rules, acceptance criteria, and Definition of Done.
- [**API Specification** (`docs/lab-02/api-spec.md`)](docs/lab-02/api-spec.md) — Complete REST API contract, request/response payloads, status codes, and security/isolation model.
- [**UI Specification** (`docs/lab-02/ui-spec.md`)](docs/lab-02/ui-spec.md) — Zen Green design token definitions, responsive viewport guidelines, and accessibility standards.
- [**Test Plan & Results** (`docs/lab-02/tests.md`)](docs/lab-02/tests.md) — Test cases, traceability matrix, automated test execution logs, and coverage reports.
- [**Peer Review Records** (`docs/lab-02/reviewer.md`)](docs/lab-02/reviewer.md) — Peer review logs, PR evaluation notes, and reviewer approvals.
- [**AI Use Disclosure** (`docs/lab-02/ai-use.md`)](docs/lab-02/ai-use.md) — Comprehensive log of AI pair-programming usage, prompts, and verification steps.

### Verification Artifacts & Screenshots

- [`artifacts/lab-02/screenshots/`](artifacts/lab-02/screenshots/) — Visual verification evidence and UI captures across responsive viewports:
  - [`create-ticket/`](artifacts/lab-02/screenshots/create-ticket/) — Ticket creation form, dynamic system dropdowns, pre-upload attachment dropzone, and dirty form guard.
  - [`my-tickets/`](artifacts/lab-02/screenshots/my-tickets/) — My Tickets dashboard (desktop multi-column table, mobile stacked cards, debounced search, status/priority filters, pagination).
  - [`ticket-detail/`](artifacts/lab-02/screenshots/ticket-detail/) — Ticket detail view, active attachment download, soft-removal modal with reason tracking, and chronological activity timeline.

---

## Git Branch Discipline & Workflow

This project enforces a structured **Git Flow** strategy to maintain code quality and integration stability across sprints:

```text
main (Production / Stable Releases)
 ^
 |-- lab2-staging (Lab 2 Integration Branch)
 |    ^
 |    |-- feature/5-spec-docs          (Issue 5: Specifications & Test Plan)
 |    |-- feature/6-requester-context  (Issue 6: Requester Context Switcher)
 |    |-- feature/7-create-ticket      (Issue 7: Ticket Creation & Attachments)
 |    |-- feature/8-my-tickets         (Issue 8: Ticket Dashboard & Filters)
 |    `-- feature/9-ticket-detail      (Issue 9: Ticket Detail, Soft-Removal & Audit)
 |
 `-- lab1-staging (Lab 1 Integration Branch)
      ^
      |-- feature/1-project-foundation (Issue 1)
      |-- feature/2-health-check       (Issue 2)
      |-- feature/3-category-seed      (Issue 3)
      `-- feature/4-category-list      (Issue 4)
```

### Branching Strategy Guidelines

- `main`: Protected release branch containing production-ready code.
- `lab2-staging`: Integration branch where Lab 2 features are combined and verified.
- `feature/*`: Short-lived isolation branches created per GitHub Issue.
- **Pull Request (PR) Policy:** Direct pushes to `main` and staging branches are forbidden. All code must pass automated GitHub Actions CI and receive peer reviewer approval before merging.
