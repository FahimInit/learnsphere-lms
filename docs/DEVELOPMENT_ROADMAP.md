# LearnSphere — Development Roadmap

## Phase 0 — Planning (Completed)
- [x] Requirements analysis & ambiguity resolution
- [x] Modular monolith & feature-sliced SPA architecture design
- [x] 19-model MongoDB schema & indexing specification
- [x] Phased development roadmap & risk mitigation matrix

## Phase 1 — Foundation (Completed)
- [x] Git initialization on `master` branch with self-ignored `.gitignore`
- [x] Root npm workspace monorepo & shared TypeScript configuration
- [x] Core engineering documentation (`docs/*` & `README.md`)
- [x] Backend Express + TypeScript + Zod + Error Handling + Logger + Swagger + Healthcheck
- [x] Backend Vitest + Supertest test harness
- [x] Frontend React + Vite + TypeScript + Tailwind + UI primitives + Router shell
- [x] Frontend Vitest + React Testing Library setup
- [x] Dockerfiles, `docker-compose.yml`, and GitHub Actions CI pipeline

## Phase 2 — Authentication & User Management (Completed)
- [x] `User` Mongoose model & password hashing utilities
- [x] JWT access/refresh rotation, cookie handling, and token revocation
- [x] Registration, Login, Logout, Refresh, Forgot/Reset Password, and `/me` endpoints
- [x] Profile viewing, editing, and password update endpoints
- [x] Authentication & RBAC integration test suite
- [x] Frontend Auth store, silent refresh Axios interceptor, Login/Register/Forgot/Reset/Profile pages

## Phase 3 — Course Management
- [ ] `Category`, `Course`, `Section`, and `Lesson` models
- [ ] Local/Cloud storage abstraction for course assets
- [ ] Category CRUD (Admin) & Course authoring CRUD (Instructor)
- [ ] Section & Lesson creation, editing, and reordering
- [ ] Draft -> Pending Review -> Published / Rejected workflow
- [ ] Course management & ownership test suite
- [ ] Frontend Instructor Studio: Course Creation Wizard & Curriculum Editor

## Phase 4 — Student Learning Experience
- [ ] `Enrollment`, `LessonProgress`, and `CourseReview` models
- [ ] Course catalog search, filter, sort, and pagination engine
- [ ] Enrollment verification, deterministic progress tracking, and resume-lesson calculation
- [ ] Enrollment & progress integration test suite
- [ ] Frontend Public Landing Page, Course Catalog, Course Details, Student Dashboard, and Learning Player UI

## Phase 5 — Assessment System (Quizzes & Assignments)
- [ ] `Quiz`, `Question`, `QuizAttempt`, `Assignment`, and `Submission` models
- [ ] Server-side automatic quiz grading (with student answer stripping)
- [ ] Assignment submission, file upload validation, resubmission rules, and instructor grading with grade history
- [ ] Assessment integration test suite
- [ ] Frontend Quiz Editor, Quiz Runner, Assignment Editor, Student Submission UI, and Instructor Grading Portal

## Phase 6 — Engagement (Discussions, Announcements & Notifications)
- [ ] `Discussion`, `Comment`, `Announcement`, and `Notification` models
- [ ] Threaded discussions, instructor badges, content reporting, and course announcements
- [ ] Notification service with Socket.IO real-time push delivery
- [ ] Engagement integration tests & Frontend Discussion Forum, Announcements, and Notification Center

## Phase 7 — Certificates & Analytics
- [ ] `Certificate` and `AuditLog` models
- [ ] Server-side certificate eligibility check, issuance, and public verification endpoint
- [ ] Student, Instructor, and Admin analytics aggregation pipelines
- [ ] Frontend Certificate Viewer, Public Verification Page, and Recharts Analytics Dashboards + Admin Governance UI

## Phase 8 — Quality, Seed Data & Production Readiness
- [ ] Comprehensive realistic development database seeder (`npm run seed`)
- [ ] Full-stack security, IDOR, and responsive UI audit
- [ ] Complete test suite execution, typecheck, build verification, and final documentation updates
