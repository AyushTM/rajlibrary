# Raj Digital Library — Project Documentation

Last updated: 2026-08-14

This document is the single source of truth for the project contained in this workspace. It is generated from the application source and configuration; read the referenced files before making structural changes.

**Important:** This application is an offline Study Center Management System — it is NOT a traditional library management system. There are no features for books, attendance tracking, student logins, QR codes, or barcode scanning.

---

**Table of contents**
- Project Overview
- Tech Stack
- Folder Structure
- Architecture
- Database Design
- API Documentation
- Features Implemented
- Remaining Work / Known Gaps
- Seat Layout
- UI Design
- Coding Standards
- Development Workflow
- Git Workflow
- Environment Setup
- Backup Strategy
- Known Issues
- Roadmap
- Instructions for Future AI Assistants
- Changelog

---

## 1. Project Overview

- Project name: Raj Digital Library (admin console contained in this repo)
- Purpose: Manage a small offline study center / reading room — members, seat assignments, membership payments, renewals, reporting, and lightweight backup/restore.
- Target users: Study center administrators and operators who run the center locally.
- Main objectives:
  - Maintain member records and membership validity
  - Assign and manage physical seats in the reading room
  - Record payments and generate receipts
  - Provide operational reports and simple backups

Reminder: This is NOT a full library system. There are no book inventory or circulation features, no attendance tracking, no separate student login, and no QR/barcode scanning features.

## 2. Tech Stack

- Backend: Node.js + Express (see [server/package.json](server/package.json#L1-L200)). Express shown in dependencies: `express@^4.21.2`.
- Database: SQLite via `better-sqlite3@^11.9.0` (see [server/package.json](server/package.json#L1-L200) and [server/src/db.js](server/src/db.js#L1-L200)).
- Frontend: React (TypeScript) built with Vite (see [client/package.json](client/package.json#L1-L200)). Dependencies indicate `react@^19.2.8`, `react-dom@^19.2.8`, `vite@^8.2.0` and TypeScript tooling.
- Styling: Plain CSS files under `client/src/` (not a CSS framework). See [client/src/App.css](client/src/App.css#L1-L200) and [client/src/index.css](client/src/index.css#L1-L200).
- Testing: Simple JS tests present under `tests/` (server test harness invoked in `server/package.json` test script).

## 3. Folder Structure

Workspace top-level (relevant folders):

```
backups/
client/
data/
docs/
server/
tests/
```

- `client/` — React + TypeScript single-file app (entry: [client/src/App.tsx](client/src/App.tsx#L1-L1600), bundler: Vite). Contains UI, state and network calls.
- `server/` — Express REST API and service modules (entry: [server/src/index.js](server/src/index.js#L1-L400)). Business logic broken into service modules in `server/src/`.
- `data/` — runtime SQLite files and generated backup artifacts (e.g. `raj-digital-library.sqlite`, `raj-digital-library.backup.json`, and WAL/SHM files). See [server/src/db.js](server/src/db.js#L1-L200).
- `docs/` — documentation (this file will live here).
- `tests/` — server-side tests and test runners referenced in `server/package.json`.

Files of interest (examples):

- [server/src/db.js](server/src/db.js#L1-L200)
- [server/src/index.js](server/src/index.js#L1-L400)
- [server/src/memberService.js](server/src/memberService.js#L1-L400)
- [server/src/seatService.js](server/src/seatService.js#L1-L200)
- [server/src/paymentService.js](server/src/paymentService.js#L1-L400)
- [client/src/App.tsx](client/src/App.tsx#L1-L1600)
- [client/src/App.css](client/src/App.css#L1-L200)

## 4. Architecture

- Frontend architecture: Single-page React application in `client/`. The UI is implemented primarily inside `App.tsx` (no component library in the repo). Client uses local state (`useState`) and simple hash-based routing (`window.location.hash`) to switch views. The client stores a short-lived authentication token in `localStorage` under keys `rdl-token` and `rdl-username`.

- Backend architecture: Lightweight Express server in `server/src/index.js`. HTTP routes are thin controllers that delegate business logic to service modules (`memberService.js`, `seatService.js`, `paymentService.js`, etc.). Authentication is handled by an in-memory session map in `authService.js`.

- Database layer: `server/src/db.js` constructs and migrates an on-disk SQLite DB via `better-sqlite3`. Tables are created at startup if missing.

- API communication: Frontend calls the backend REST API under `/api/*`. The client reads `VITE_API_BASE_URL` (fallback `http://localhost:3001/api`) when building requests (see `client/src/App.tsx`).

- State management: Local React `useState` and derived arrays/filters inside `App.tsx`; no global store (Redux, Zustand, etc.).

- Routing: Hash-based view selection implemented in `App.tsx` (no `react-router`).

- UI component organization: A single large `App.tsx` contains sections and rendering helpers for dashboard, members, seats, payments, reports and settings. Most UI is implemented as functions inside that file.

## 5. Database Design

The schema is created in [server/src/db.js](server/src/db.js#L1-L200). The application uses three main tables: `members`, `renewals`, and `payments`.

- Table: `members`
  - Purpose: store member profile and membership validity, assigned seat and status.
  - Columns:
    - `id INTEGER PRIMARY KEY AUTOINCREMENT`
    - `full_name TEXT NOT NULL`
    - `mobile_number TEXT NOT NULL`
    - `joining_date TEXT NOT NULL` (ISO date string `YYYY-MM-DD`)
    - `membership_plan TEXT NOT NULL` (e.g. Monthly, Quarterly, Half-Yearly, Yearly)
    - `membership_start_date TEXT NOT NULL`
    - `membership_expiry_date TEXT NOT NULL`
    - `assigned_seat TEXT` (seat label or NULL)
    - `status TEXT NOT NULL` (Active, Pending, Expired)
    - `monthly_duration INTEGER DEFAULT 1`
  - Indexes/Constraints: Primary key on `id`, many `NOT NULL` constraints. No explicit additional indexes created in code.

- Table: `renewals`
  - Purpose: log renewals and membership history for members.
  - Columns:
    - `id INTEGER PRIMARY KEY AUTOINCREMENT`
    - `member_id INTEGER NOT NULL` (FK -> `members.id`)
    - `previous_expiry_date TEXT NOT NULL`
    - `renewal_expiry_date TEXT NOT NULL`
    - `new_expiry_date TEXT NOT NULL`
    - `membership_plan TEXT NOT NULL`
    - `renewal_date TEXT NOT NULL`
    - `notes TEXT` (optional)
  - Relationships/Constraints: `FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE`.

- Table: `payments`
  - Purpose: ledger of membership payments and receipt data.
  - Columns:
    - `id INTEGER PRIMARY KEY AUTOINCREMENT`
    - `member_id INTEGER NOT NULL` (FK -> `members.id`)
    - `membership_plan TEXT` (nullable)
    - `membership_start_date TEXT` (nullable)
    - `membership_expiry_date TEXT` (nullable)
    - `assigned_seat TEXT` (nullable)
    - `amount REAL NOT NULL`
    - `payment_date TEXT NOT NULL`
    - `payment_method TEXT NOT NULL` (Cash, UPI, Card, Bank Transfer, etc.)
    - `receipt_number TEXT NOT NULL`
    - `notes TEXT`
    - `created_at TEXT` (timestamp of record creation)
  - Relationships/Constraints: `FOREIGN KEY(member_id) REFERENCES members(id) ON DELETE CASCADE`.

Notes:
- The code performs some in-place ALTER TABLE operations at startup to add columns if missing. This is a simple migration strategy implemented in [server/src/db.js](server/src/db.js#L1-L200).
- There are no explicit SQL indexes beyond primary keys.

## 6. API Documentation

All endpoints live under the `/api` prefix in [server/src/index.js](server/src/index.js#L1-L400). Most endpoints require authentication via the `requireAuth` middleware (token from `authService.verifyToken`). Only `/api/login` and `/api/health` are public.

Authentication header: `Authorization: Bearer <token>` (or the raw token value). The server maintains in-memory sessions (see [server/src/authService.js](server/src/authService.js#L1-L200)).

Endpoints (summary):

- POST `/api/login`
  - Purpose: obtain a session token
  - Request body: `{ username, password }` (JSON). Default seeded credential in code: `admin` / `admin123`.
  - Response: `{ user: { username, role }, token }`
  - Errors: 401 with `{ error: 'Invalid credentials' }` for bad login.

- GET `/api/health`
  - Purpose: basic health check
  - Response: `{ status: 'ok' }`

- GET `/api/members` (requires auth)
  - Purpose: list members
  - Response: `Array<Member>` (mapped fields from DB; see `memberService.mapRow` in [server/src/memberService.js](server/src/memberService.js#L1-L400)).

- POST `/api/members` (requires auth)
  - Purpose: create a member
  - Request body: member payload (fields like `fullName`, `mobileNumber`, `joiningDate`, optional `assignedSeat`, `membershipPlan`, etc.)
  - Response: created `Member` object
  - Errors: 400 for missing required fields

- GET `/api/members/:id` (requires auth)
  - Purpose: fetch a specific member
  - Response: `Member` or 404 `{ error: 'Member not found' }`

- PUT `/api/members/:id` (requires auth)
  - Purpose: update a member (full update semantics in `memberService.updateMember`)
  - Request body: member fields to update; server validates required fields
  - Response: updated `Member` or 404

- DELETE `/api/members/:id` (requires auth)
  - Purpose: delete a member
  - Response: 204 on success, 404 if not found

- POST `/api/members/:id/renewals` (requires auth)
  - Purpose: create a renewal for a member
  - Request body: optional `membershipPlan`, `membershipStartDate`, `monthlyDuration`, `notes`
  - Response: updated `Member` (with new expiry)
  - Errors: 404 if member not found

- GET `/api/members/:id/renewals` (requires auth)
  - Purpose: list renewals for a member
  - Response: `Array<Renewal>`

- GET `/api/seats` (requires auth)
  - Purpose: return full seat layout with current statuses
  - Response: `Array<{ label, status, memberId, memberName, membershipExpiryDate }>` (see [server/src/seatService.js](server/src/seatService.js#L1-L200))

- POST `/api/seats/assign` (requires auth)
  - Purpose: assign a seat to a member
  - Request body: `{ memberId, seatLabel }`
  - Response: updated `Member` representation
  - Errors: 400 for seat already assigned or disabled, 404 if member not found

- POST `/api/seats/vacate` (requires auth)
  - Purpose: remove seat assignment for a member
  - Request body: `{ memberId }`
  - Response: updated `Member` representation

- GET `/api/payments` (requires auth)
  - Purpose: list payments (ledger)
  - Response: `Array<Payment>`

- GET `/api/payments/receipt/:paymentId` (requires auth)
  - Purpose: fetch receipt data for printing/exporting
  - Response: `Receipt` object or `undefined` if not found

- GET `/api/payments/:memberId` (requires auth)
  - Purpose: list payments for a specific member
  - Response: `Array<Payment>`

- POST `/api/payments` (requires auth)
  - Purpose: record a payment; optionally assigns seat and updates member membership fields
  - Request body: `{ memberId, membershipPlan, membershipStartDate, membershipExpiryDate, seatLabel?, amount, paymentDate, paymentMethod, notes? }`
  - Response: created `Payment` record
  - Errors: 400 for missing dates or malformed payload

- GET `/api/dashboard` (requires auth)
  - Purpose: aggregated dashboard metrics (active, expired, expiring soon, seats, monthlyRevenue)
  - Response: metrics object

- GET `/api/reports` (requires auth)
  - Purpose: operational reports (revenue by month, status breakdown, recent payments, expiring members)
  - Response: report structure from `reportService.buildReportStats`.

- GET `/api/backup` (requires auth)
  - Purpose: create a JSON backup file under `data/` and return it as a download (`raj-digital-library-backup.json`).

- POST `/api/reset` (requires auth)
  - Purpose: destructive reset of payments, renewals and members (used by UI to clear test/demo data)

- POST `/api/restore` (requires auth)
  - Purpose: accept a backup payload and restore `members`, `renewals`, and `payments` by deleting current records and inserting provided rows. The endpoint expects `{ members: Array, payments: Array, renewals?: Array }`.

Error handling: controllers generally respond with 400 for bad input, 401 for missing/invalid auth token, and 404 for not-found resources. See direct usages inside [server/src/index.js](server/src/index.js#L1-L400) and error pathways in service modules.

## 7. Features Implemented (completed)

- Authentication (in-memory token sessions) — [server/src/authService.js](server/src/authService.js#L1-L200)
- Dashboard metrics — `/api/dashboard` and client view
- Member management (create, read, update, delete) — `/api/members` endpoints and UI
- Renewals (historical log) — `renewals` table and corresponding endpoints
- Seat management (assign/vacate and seat map) — `/api/seats` endpoints and UI
- Payments and receipts (create payments, generate receipts) — `/api/payments` and UI receipt export
- Reports (revenue by month, status breakdown) — `/api/reports` and UI
- Backup & restore (JSON) — `/api/backup`, `/api/restore` and client import/export
- Reset (clear database) — `/api/reset`

Only include features above because they are present in code and UI.

## 8. Remaining Features / Unimplemented Items (priority-ordered)

High priority:
- Secure authentication: currently plaintext seeded password and memory sessions; add hashed passwords and persistent session storage.
- Persistent role-based access control (RBAC) beyond single seeded admin user.

Medium priority:
- Add SQL indexes on frequently queried columns (e.g. `assigned_seat`, `membership_expiry_date`) if performance required.
- Add server-side input validation and stricter schema validation in APIs.

Low priority:
- Split the monolithic `App.tsx` into smaller React components for maintainability.
- Add pagination and filtering on large member/payment lists.

If a feature is not listed here, it is not implemented in the codebase.

## 9. Seat Layout

Seat layout is defined in [server/src/seatService.js](server/src/seatService.js#L1-L200) and mirrored in the UI seat rows in [client/src/App.tsx](client/src/App.tsx#L1-L200).

- Row A: A1, A2, A3, A4, A5, A6, A7, A8
- Row B (first): B1, B2, B3, B4, B5, B6, B7, B8
- Row B (second): B9, B10, B11, B12, B13, B14, B15, B16
- Row C (first): C1, C2, C3, C4, C5, C6, C7
- Row C (second): C8, C9, C10, C11, C12, C13, C14
- Row D (first): D1, D2, D3, D4, D5, D6, D7
- Row D (second): D8, D9, D10

Disabled seats: `A8` is explicitly marked disabled in [server/src/seatService.js](server/src/seatService.js#L1-L200).

Seat status values (from server):
- `available` — no member assigned
- `occupied` — assigned to a member with an active membership
- `expiring` — assigned but membership expires within 7 days
- `disabled` — seat not available for assignment (logical disable)

Seat assignment rules:
- `assignSeat(memberId, seatLabel)` checks member existence, rejects disabled seats, and prevents double-assignment.
- `vacateSeat(memberId)` clears the `assigned_seat` for the member.

## 10. UI Design

- Color palette: defined as CSS variables in [client/src/App.css](client/src/App.css#L1-L200) and [client/src/index.css](client/src/index.css#L1-L200). Primary accent colors include bluish (`--accent: #60a5fa`) and green (`--accent-2: #34d399`). Dark theme supported via `theme-dark` class and `prefers-color-scheme`.
- Typography: system sans-fallbacks and `Inter` is referenced in styles; headings use system UI stack.
- Component library: none — UI is custom with semantic class names and CSS.
- Layout: two-column admin shell with sidebar and main panel (`.app-shell` grid) and a set of reusable patterns (panel-card, table-card, stat-card).
- Dark mode: supported by toggling `theme-dark` class on the `:root` element; `App.tsx` toggles `document.documentElement.classList`.
- Reusable components: UI is implemented as functions and JSX within `App.tsx` (ReceiptPreview, small render helpers). There is no component folder; refactor would benefit maintainability.

## 11. Coding Standards

- Naming: camelCase for JS/TS variables and functions; snake_case used in DB column names (mapped by service layer).
- File organization: backend grouped by service modules in `server/src/`; frontend concentrated in `client/src/`.
- Error handling: services throw JS `Error` objects; controllers translate to HTTP 400/404/401 responses.
- Validation: lightweight in-service checks (presence of required fields). No schema validation library is used.
- TypeScript: used on the client for component typings; server is CommonJS JavaScript.
- Formatting: no enforced formatter in repo; follow existing style when editing.

## 12. Development Workflow

- Work feature-by-feature. Do not rewrite the whole project.
- Steps for a new feature:
  1. Read this `PROJECT.md` and the relevant source files.
 2. Propose a small plan and new tests (server `tests/` exist).
  3. Implement backend service changes and unit tests.
  4. Implement frontend UI changes in `client/src/`, keeping existing API contracts.
  5. Run tests and manual smoke checks.
  6. Commit a single feature branch PR with clear description.

Always preserve existing functionality and back up the sqlite file before running destructive operations.

## 13. Git Workflow

- Branch strategy:
  - `main` (or `master`) contains production-ready code
  - Create feature branches `feature/<short-description>`
  - Open PRs for code review
- Commit message examples:
  - `feat(members): add expiry warning on member list`
  - `fix(auth): persist sessions across restart`
  - `chore(ci): add lint and test steps`

Keep commits small and focused; run tests before merging.

## 14. Environment Setup

Prerequisites:
- Node.js (recommend LTS supporting the repo; the packages are compatible with Node 18+)
- npm or yarn

Development steps (from workspace root):

1) Install server deps

```bash
cd server
npm install
```

2) Install client deps

```bash
cd ../client
npm install
```

3) Run server (default port 3001)

```bash
cd ../server
npm start
# or: NODE_ENV=test node src/index.js (for test env behavior)
```

4) Run client in development

```bash
cd ../client
npm run dev
```

Notes:
- The server reads `process.env.PORT` to change listen port.
- The client accepts `VITE_API_BASE_URL` at build time to point at the API (see `client/src/App.tsx`).

## 15. Backup Strategy

- The runtime SQLite DB is stored under `data/` as `raj-digital-library.sqlite` along with `-wal` and `-shm` files. (See [server/src/db.js](server/src/db.js#L1-L200)).
- The app provides a JSON backup via GET `/api/backup` which writes `data/raj-digital-library.backup.json` and streams it to the client for download.
- To restore, the client sends that JSON to POST `/api/restore` which clears the relevant tables and inserts rows from the payload.

Restore caution: `/api/restore` deletes existing `members`, `renewals`, and `payments` and re-inserts the payload rows — keep backups of the SQLite file for complete recovery.

## 16. Known Issues

- Authentication is in-memory (`authService.sessions`) and will be lost on server restart.
- Passwords are stored in plain text in-seed users; no hashing or secure storage is present.
- No HTTPS, no CORS hardening beyond the basic `cors()` middleware.
- In-place ALTER TABLE migrations are used — this is acceptable for small deployments but not a robust migration system.
- No server-side PDF generation for receipts (client renders printable HTML and exports by the browser).

## 17. Roadmap

High Priority:
- Harden authentication (hash passwords, persistent sessions or JWT with proper expiry).
- Add server-side validation and input sanitization.

Medium Priority:
- Componentize the frontend (`App.tsx` split into smaller components).
- Add tests that cover API endpoints and critical flows.

Low Priority:
- Add scheduled automatic backups to an external location.
- Add role-based UI and permissions for multi-admin setups.

Future ideas:
- Export receipts as server-generated PDFs
- Multi-branch/twin center support (multi-tenant)

## 18. Instructions for Future AI Assistants

Please follow these rules before making any automated change:

1. Read this `PROJECT.md` fully and the referenced source files for the area you will modify.
2. Understand the backend service boundaries in `server/src/*` and do not modify them without preserving the existing contracts.
3. Never rewrite the whole project or radically restructure files in a single change; prefer incremental, reversible edits.
4. Only modify files required for the feature. Preserve functionality and DB integrity.
5. Explain the implementation approach to a human reviewer before applying code changes.
6. Run unit tests and manual smoke tests after edits. Add tests for new behavior.
7. When interacting with the DB, backup `data/raj-digital-library.sqlite` first.
8. When adding authentication, prefer industry-standard approaches (bcrypt/argon2, JWT or persistent session store).
9. Keep changes small; commit after each completed feature with descriptive messages.

## 19. Changelog (current state)

- Initial working implementation (server + client) supporting: member CRUD, renewals, payment ledger, seat management, dashboard, reports, backup/restore, reset.
- DB schema and basic migrations handled in `server/src/db.js`.
- Frontend is a single-file React TypeScript app with CSS-based design and printable receipts.

---

References
- Server entry and route list: [server/src/index.js](server/src/index.js#L1-L400)
- Database creation and migration: [server/src/db.js](server/src/db.js#L1-L200)
- Member business logic: [server/src/memberService.js](server/src/memberService.js#L1-L400)
- Seat rules and layout: [server/src/seatService.js](server/src/seatService.js#L1-L200)
- Payments and receipts: [server/src/paymentService.js](server/src/paymentService.js#L1-L400)
- Frontend app: [client/src/App.tsx](client/src/App.tsx#L1-L1600)
