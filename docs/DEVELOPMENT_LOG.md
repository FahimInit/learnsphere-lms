# LearnSphere — Engineering Development Log

This log records architectural milestones, implementation decisions, and verification outcomes across phases.

---

## Entry 1 — Phase 0: Architectural Planning & Schema Blueprint
- **Summary**: Completed full system analysis, resolved domain ambiguities (pricing/enrollment adapter, local-first storage provider abstraction, self-registration role boundary), designed 19 Mongoose collections with compound unique indexes, and defined the 8-phase engineering roadmap.
- **Status**: Approved.

## Entry 2 — Phase 1: Monorepo, Backend/Frontend Foundation, Docker & CI
- **Summary**:
  - Initialized Git repository on `master` branch with self-ignoring `.gitignore`.
  - Created `.env.example`, `.dockerignore`, root `package.json` (npm workspaces for `server` and `client`), and `tsconfig.base.json`.
  - Authored `docs/PROJECT_OVERVIEW.md`, `docs/REQUIREMENTS.md`, `docs/ARCHITECTURE.md`, `docs/DATABASE_DESIGN.md`, `docs/API_DOCUMENTATION.md`, `docs/SECURITY.md`, and `docs/DEVELOPMENT_ROADMAP.md`.
  - Implemented backend foundation (`server/`): Zod environment config, Mongoose connection manager, OpenAPI 3.0 Swagger setup, `AppError`, `errorHandler`, `validate`, `rateLimiter`, `storageService`, `emailService`, `socketService`, `/api/v1/health`, and Supertest integration test suite.
  - Implemented frontend foundation (`client/`): React 18 + Vite + TypeScript + Tailwind CSS, reusable UI components (`Button`, `Card`, `Badge`, `Input`, `Skeleton`), Axios client, and initial component tests.
  - Configured multi-stage `Dockerfile`s, `docker-compose.yml` with healthchecks, and `.github/workflows/ci.yml` targeting `master`.
- **Status**: Completed.

## Entry 3 — Phase 2: Authentication, RBAC & User Profile Management
- **Summary**:
  - Created `User` Mongoose model (`server/src/modules/users/user.model.ts`) with `bcryptjs` password hashing, `select: false` sensitive fields, bounded refresh-token session storage, and public profile serialization.
  - Implemented JWT utilities (`server/src/utils/jwt.ts`) with unique `jti` claims on refresh tokens, SHA-256 token hashing, and `httpOnly` cookie management.
  - Added `authenticate`, `optionalAuthenticate`, and `authorize(...roles)` RBAC middlewares (`server/src/middleware/auth.ts`) enforcing active account status on every request.
  - Built `/api/v1/auth` and `/api/v1/users` modules (registration, login, refresh rotation with replay revocation, logout, forgot/reset password, email verification, profile update, password change, and student-to-instructor upgrade).
  - Verified with 8 integration tests in `server/tests/auth.test.ts` and 3 component tests in `client/src/App.test.tsx`.
  - Built frontend `useAuthStore`, Axios 401 silent refresh interceptor, `ProtectedRoute`/`RoleGuard`/`GuestOnlyRoute`, responsive `Navbar`, and `LoginPage`, `RegisterPage`, `ForgotPasswordPage`, `ResetPasswordPage`, and `ProfilePage`.
- **Status**: Completed.

## Entry 4 — Phase 3: Course Management, Curriculum Engine & Instructor Studio
- **Summary**:
  - Created `Category`, `Course`, `Section`, and `Lesson` Mongoose models with compound filter and full-text search indexes.
  - Added hardened Multer upload middleware (`server/src/middleware/upload.ts`) integrated with `storageService`.
  - Implemented Category CRUD (`/api/v1/categories`) with automatic default category seeding.
  - Implemented Course, Section, and Lesson CRUD, section/lesson reordering, automatic duration and lesson-count recalculation, IDOR ownership enforcement (`assertCourseOwnership`), safe deletion/archiving, and the moderation state machine (`draft -> pending_review -> published | rejected`).
  - Added public catalog filtering and curriculum payload sanitization (stripping non-preview lesson URLs/content for unauthenticated/non-enrolled visitors).
  - Verified with 14 passing backend integration tests (`server/tests/courses.test.ts`, `auth.test.ts`, `health.test.ts`) and 4 frontend tests.
  - Built Frontend Instructor Studio (`InstructorDashboardPage.tsx`, `CourseEditorPage.tsx`).
- **Status**: Completed.
