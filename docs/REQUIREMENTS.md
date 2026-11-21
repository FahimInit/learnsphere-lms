# LearnSphere — Functional & Non-Functional Requirements

## 1. Functional Requirements by Role

### 1.1 Student Requirements
- **Authentication & Profile**: Register, log in, log out, refresh tokens silently, reset password, and manage personal profile (`name`, `bio`, `headline`, `avatarUrl`).
- **Discovery**: Browse and search published courses with full-text search, filter by category, difficulty level, price, and minimum rating, and sort by popularity, newest, or price.
- **Enrollment**: Enroll in published courses (with duplicate enrollment prevention), track enrollment status (`active`, `completed`, `cancelled`), and view enrolled courses on a personal dashboard.
- **Learning Interface**: Navigate course sections and lessons, watch videos, read markdown content, download attached resources, take personal per-lesson notes, mark lessons complete, and automatically resume from the last accessed lesson.
- **Assessments**: Take timed or untimed quizzes with automatic server-side grading, view attempt histories, submit assignments with text/file attachments, and view instructor grades and feedback.
- **Engagement & Certification**: Post discussion threads and replies, report inappropriate posts, receive real-time/in-app notifications, and earn/download verifiable completion certificates upon reaching 100% progress.

### 1.2 Instructor Requirements
- **Course Authoring**: Create courses as `draft`, edit metadata (title, slug, short/full descriptions, thumbnail, category, tags, level, prerequisites, objectives), and submit courses for admin review (`pending_review`).
- **Curriculum Management**: Create, update, delete, and reorder Sections and Lessons (`video`, `text`, `resource`, `embed`).
- **Assessment Authoring & Grading**: Create quizzes and questions (`mcq`, `multi_select`, `true_false`), configure passing scores and attempt limits, create assignments with deadlines and resubmission rules, and grade student submissions with feedback.
- **Communication & Analytics**: Publish course announcements, reply to student discussions (highlighted with instructor badge), and inspect course-level analytics (enrollments, completion rates, quiz score distributions, assignment stats).

### 1.3 Administrator Requirements
- **User Governance**: List/search users, update account statuses (`active`, `suspended`), and assign authorized roles (`student`, `instructor`, `admin`).
- **Course Moderation**: Review courses in `pending_review` state and approve (`published`) or reject (`rejected` with explicit feedback).
- **Platform Curation & Safety**: Perform CRUD on course categories, review and moderate reported discussions/comments, inspect audit logs, and monitor platform analytics.

## 2. Non-Functional Requirements
- **Security**: Argon2/bcrypt password hashing, short-lived JWT access tokens + `httpOnly` refresh cookies, strict RBAC & ownership enforcement (preventing IDOR), Zod input validation, rate limiting on sensitive endpoints, and strict MIME/size file-upload filtering.
- **Reliability & Data Integrity**: Compound unique indexes on enrollments, progress records, reviews, and certificates; deterministic server-side progress calculation.
- **Maintainability**: Strict TypeScript (`noImplicitAny`, `strict: true`), modular domain architecture (`controller -> service -> model`), and automated tests for critical flows.
- **Portability**: Full Docker Compose support alongside native local Node.js execution.
