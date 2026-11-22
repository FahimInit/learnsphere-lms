# LearnSphere — Industry-Standard MERN Learning Management System

**LearnSphere** is a production-minded, full-stack Learning Management System (LMS) built with **MongoDB, Express.js, React, Node.js, and TypeScript**. It provides a multi-role educational SaaS platform for **Students**, **Instructors**, and **Administrators**.

---

## 1. Project Overview
LearnSphere enables end-to-end online education:
- **Students** discover courses, enroll, watch video lessons, read interactive text/markdown content, download resources, take personal notes, complete auto-graded quizzes, submit assignments, participate in discussions, and earn verifiable completion certificates.
- **Instructors** build structured courses (`Course -> Section -> Lesson`), author quizzes and assignments, review and grade student submissions, broadcast course announcements, and track course analytics.
- **Administrators** govern user accounts and roles, moderate courses submitted for review, manage categories, resolve reported content, and monitor platform-wide KPIs.

---

## 2. Core Features
- **Authentication & RBAC**: JWT access tokens + rotating `httpOnly` refresh cookies, bcrypt password hashing, role-based access control (`student`, `instructor`, `admin`), account suspension enforcement, and password reset flow.
- **Course Authoring & Moderation Workflow**: Full lifecycle state machine (`draft -> pending_review -> published | rejected | archived`) with section and lesson reordering.
- **Interactive Learning Player**: Curriculum sidebar, video/text/resource/embed lesson viewer, auto-resume last lesson, per-lesson personal notes, and deterministic server-side progress tracking.
- **Assessment Engine**:
  - **Quizzes**: `mcq`, `multi_select`, and `true_false` questions, time limits, attempt limits, passing thresholds, and zero-leakage server-side automatic grading.
  - **Assignments**: File/text submissions, resubmission policies, instructor grading, feedback, and historical grade audit trail.
- **Engagement & Real-Time Notifications**: Threaded course discussions, instructor announcements, content reporting/moderation, and real-time in-app notifications powered by Socket.IO.
- **Verifiable Certificates & Analytics**: Server-validated 100% completion certificates with unique codes (`LS-YYYY-XXXXXX`), public verification page, and role-tailored Recharts analytics dashboards.

---

## 3. Technology Stack

### Frontend (`client/`)
- **Framework**: React 18 + TypeScript + Vite
- **Styling & UI**: Tailwind CSS + `shadcn/ui`-architecture primitives + Lucide Icons
- **Routing & State**: React Router v6 + TanStack Query v5 + Zustand
- **Forms & Validation**: React Hook Form + Zod
- **Charts**: Recharts

### Backend (`server/`)
- **Runtime & Framework**: Node.js + Express.js + TypeScript
- **Database**: MongoDB + Mongoose
- **Validation & Security**: Zod + Helmet + CORS + `express-rate-limit` + `bcryptjs` + `jsonwebtoken`
- **Real-Time & Documentation**: Socket.IO + Swagger / OpenAPI 3.0

### DevOps & Quality
- **Testing**: Vitest + Supertest + React Testing Library
- **Containers & CI**: Docker + Docker Compose + GitHub Actions CI (`master` branch)

---

## 4. Architecture Overview
LearnSphere is structured as an **npm Workspaces Monorepo**:
- `server/` — Modular Monolith REST API + Socket.IO server (`src/modules/*`, `src/middleware/*`, `src/infrastructure/*`, `src/config/*`).
- `client/` — Feature-sliced React SPA (`src/features/*`, `src/components/*`, `src/stores/*`, `src/lib/*`).
- `docs/` — Living engineering specifications:
  - [Project Overview](docs/PROJECT_OVERVIEW.md)
  - [Requirements](docs/REQUIREMENTS.md)
  - [System Architecture](docs/ARCHITECTURE.md)
  - [Database Design](docs/DATABASE_DESIGN.md)
  - [API Documentation](docs/API_DOCUMENTATION.md)
  - [Security Guide](docs/SECURITY.md)
  - [Development Roadmap](docs/DEVELOPMENT_ROADMAP.md)
  - [Development Log](docs/DEVELOPMENT_LOG.md)

---

## 5. Installation & Local Development Setup

### Prerequisites
- **Node.js** `>= 20.x` and **npm** `>= 10.x`
- **MongoDB** `>= 6.x` (local service or via Docker)

### Steps
1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` (and `server/.env` if running workspaces individually):
   ```bash
   cp .env.example .env
   ```
3. **Seed Development Data (Optional)**:
   ```bash
   npm run seed
   ```
   Seeded demo accounts (password for all: `Password123`):
   - **Admin**: `admin@learnsphere.dev`
   - **Instructor**: `sarah.chen@learnsphere.dev` / `marcus.reed@learnsphere.dev`
   - **Student**: `alex.rivera@learnsphere.dev` / `priya.patel@learnsphere.dev`
   - **Sample Certificate Code**: `LS-2026-DEMO1001`
4. **Run Backend & Frontend in Development**:
   ```bash
   # Terminal 1: Start Backend API (http://localhost:5000)
   npm run dev:server

   # Terminal 2: Start Frontend SPA (http://localhost:5173)
   npm run dev:client
   ```

---

## 6. Docker Setup
Run the complete stack (MongoDB, Backend API, and Frontend) with Docker Compose:
```bash
docker compose up --build
```
- **Frontend**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000/api/v1`
- **Swagger API Docs**: `http://localhost:5000/api/v1/docs`

---

## 7. Environment Configuration
See [`.env.example`](.env.example) for all supported variables:
- `NODE_ENV`, `PORT`, `MONGODB_URI`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`
- `CLIENT_URL`, `STORAGE_PROVIDER`, `UPLOAD_DIR`, `MAX_FILE_SIZE_MB`
- `VITE_API_BASE_URL`, `VITE_SOCKET_URL`

---

## 8. Testing & Verification
```bash
# Run all backend & frontend tests
npm test

# Run TypeScript typechecking across workspaces
npm run typecheck

# Build production bundles
npm run build
```

---

## 9. API Documentation
- Interactive OpenAPI 3.0 UI: `http://localhost:5000/api/v1/docs`
- Markdown Reference: [`docs/API_DOCUMENTATION.md`](docs/API_DOCUMENTATION.md)

---

## 10. Screenshots
*(Screenshots of the Landing Page, Catalog, Learning Player, Instructor Studio, Quiz Runner, Certificate Viewer, and Admin Analytics Dashboard are stored under `docs/screenshots/` as each UI module is completed.)*

---

## 11. Future Improvements
- Stripe / LemonSqueezy webhook integration for live payment processing
- Adaptive bitrate HLS video transcoding pipeline via Mux / AWS MediaConvert
- AI-assisted quiz generation and course transcript search
