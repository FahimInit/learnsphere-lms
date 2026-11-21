# LearnSphere — REST API Documentation

All API endpoints are versioned under `/api/v1`. Interactive OpenAPI / Swagger documentation is served dynamically at `GET /api/v1/docs`.

## 1. Standard Response Envelope

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 48,
    "totalPages": 4
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request payload",
    "details": [
      { "field": "email", "message": "Invalid email address" }
    ]
  }
}
```

---

## 2. Core API Resource Groups

### 2.1 Health & Docs
- `GET /api/v1/health` — System and database connectivity healthcheck
- `GET /api/v1/docs` — Interactive Swagger UI

### 2.2 Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Register a student or instructor account
- `POST /api/v1/auth/login` — Authenticate and receive JWT access token + `httpOnly` refresh cookie
- `POST /api/v1/auth/refresh` — Rotate refresh token and issue a new access token
- `POST /api/v1/auth/logout` — Revoke current refresh token and clear cookie
- `POST /api/v1/auth/forgot-password` — Request password reset token
- `POST /api/v1/auth/reset-password` — Reset password using valid token
- `GET /api/v1/auth/me` — Fetch current authenticated user session

### 2.3 Users & Profile (`/api/v1/users`)
- `GET /api/v1/users/profile` — Get current user profile
- `PATCH /api/v1/users/profile` — Update profile details (`name`, `headline`, `bio`, `avatarUrl`)
- `PATCH /api/v1/users/change-password` — Change current password

### 2.4 Categories (`/api/v1/categories`)
- `GET /api/v1/categories` — List all active course categories
- `POST /api/v1/categories` — Create category (`admin`)
- `PATCH /api/v1/categories/:id` — Update category (`admin`)
- `DELETE /api/v1/categories/:id` — Delete category (`admin`)

### 2.5 Courses, Sections & Lessons (`/api/v1/courses`)
- `GET /api/v1/courses` — Public catalog with search, category, level, price, rating filters, sorting, and pagination
- `GET /api/v1/courses/instructor/my-courses` — List instructor's own courses (`instructor`, `admin`)
- `GET /api/v1/courses/:slugOrId` — Public course details with curriculum outline and reviews
- `POST /api/v1/courses` — Create draft course (`instructor`, `admin`)
- `PATCH /api/v1/courses/:id` — Update course metadata (`instructor` owner, `admin`)
- `DELETE /api/v1/courses/:id` — Delete draft or archive course with enrollments (`instructor` owner, `admin`)
- `POST /api/v1/courses/:id/submit-review` — Submit draft course for admin approval (`instructor` owner)
- `POST /api/v1/courses/:id/sections` — Add section (`instructor` owner)
- `PATCH /api/v1/courses/:id/sections/reorder` — Reorder sections (`instructor` owner)
- `PATCH /api/v1/courses/:id/sections/:sectionId` — Update section (`instructor` owner)
- `DELETE /api/v1/courses/:id/sections/:sectionId` — Delete section (`instructor` owner)
- `POST /api/v1/courses/:id/sections/:sectionId/lessons` — Add lesson (`instructor` owner)
- `PATCH /api/v1/courses/:id/sections/:sectionId/lessons/reorder` — Reorder lessons (`instructor` owner)
- `PATCH /api/v1/courses/:id/lessons/:lessonId` — Update lesson (`instructor` owner)
- `DELETE /api/v1/courses/:id/lessons/:lessonId` — Delete lesson (`instructor` owner)
- `POST /api/v1/courses/:id/reviews` — Submit or update course rating/review (`enrolled student`)

### 2.6 Enrollments & Learning Progress (`/api/v1/enrollments`, `/api/v1/progress`)
- `POST /api/v1/enrollments/courses/:courseId` — Enroll in a published course
- `GET /api/v1/enrollments/my-enrollments` — List student's enrolled courses and progress
- `GET /api/v1/enrollments/courses/:courseId/learn` — Load full learning workspace (authorized for enrolled student, course instructor, or admin)
- `POST /api/v1/progress/lessons/:lessonId/toggle` — Mark lesson completed/incomplete and recalculate course progress
- `PATCH /api/v1/progress/lessons/:lessonId/state` — Save playback position and personal lesson notes

### 2.7 Quizzes & Attempts (`/api/v1/quizzes`)
- `GET /api/v1/quizzes/course/:courseId` — List quizzes for a course
- `GET /api/v1/quizzes/:id` — Get quiz and sanitized questions (answers stripped for students)
- `POST /api/v1/quizzes` — Create quiz (`instructor` owner)
- `PATCH /api/v1/quizzes/:id` — Update quiz (`instructor` owner)
- `DELETE /api/v1/quizzes/:id` — Delete quiz (`instructor` owner)
- `POST /api/v1/quizzes/:id/questions` — Add question to quiz (`instructor` owner)
- `PATCH /api/v1/quizzes/:id/questions/:questionId` — Update question (`instructor` owner)
- `DELETE /api/v1/quizzes/:id/questions/:questionId` — Delete question (`instructor` owner)
- `POST /api/v1/quizzes/:id/attempts` — Submit quiz attempt and trigger automatic grading (`enrolled student`)
- `GET /api/v1/quizzes/:id/attempts` — Get student's attempt history (`enrolled student` or `instructor`)

### 2.8 Assignments & Submissions (`/api/v1/assignments`, `/api/v1/submissions`)
- `GET /api/v1/assignments/course/:courseId` — List course assignments
- `POST /api/v1/assignments` — Create assignment (`instructor` owner)
- `PATCH /api/v1/assignments/:id` — Update assignment (`instructor` owner)
- `DELETE /api/v1/assignments/:id` — Delete assignment (`instructor` owner)
- `POST /api/v1/submissions/assignments/:assignmentId` — Submit or resubmit assignment (`enrolled student`)
- `GET /api/v1/submissions/assignments/:assignmentId/my-submission` — View own submission and feedback
- `GET /api/v1/submissions/assignments/:assignmentId` — List all student submissions (`instructor` owner)
- `PATCH /api/v1/submissions/:submissionId/grade` — Grade submission and append to grade history (`instructor` owner)

### 2.9 Discussions, Announcements & Notifications (`/api/v1/discussions`, `/api/v1/notifications`)
- `GET /api/v1/discussions/course/:courseId` — List course discussion threads and announcements
- `POST /api/v1/discussions/course/:courseId` — Create discussion thread (`enrolled student` or `instructor`)
- `POST /api/v1/discussions/:id/comments` — Reply to discussion
- `POST /api/v1/discussions/:id/report` — Flag discussion or comment for moderation
- `POST /api/v1/discussions/course/:courseId/announcements` — Post course announcement (`instructor` owner)
- `GET /api/v1/notifications` — List user's notifications
- `PATCH /api/v1/notifications/:id/read` — Mark notification as read
- `PATCH /api/v1/notifications/read-all` — Mark all notifications as read

### 2.10 Certificates, Analytics & Admin (`/api/v1/certificates`, `/api/v1/analytics`, `/api/v1/admin`)
- `GET /api/v1/certificates/my-certificates` — List earned certificates
- `GET /api/v1/certificates/verify/:code` — Public verification endpoint for certificate code
- `GET /api/v1/analytics/student` — Student learning metrics
- `GET /api/v1/analytics/instructor` — Instructor revenue/enrollment/completion/assessment metrics
- `GET /api/v1/analytics/admin` — Platform-wide KPIs and charts
- `GET /api/v1/admin/users` — Filter/paginate all users (`admin`)
- `PATCH /api/v1/admin/users/:id/status` — Suspend or activate account (`admin`)
- `PATCH /api/v1/admin/users/:id/role` — Change user role (`admin`)
- `GET /api/v1/admin/courses/pending` — List courses awaiting approval (`admin`)
- `PATCH /api/v1/admin/courses/:id/moderate` — Approve or reject course (`admin`)
- `GET /api/v1/admin/moderation/reported` — View flagged discussions/comments (`admin`)
- `PATCH /api/v1/admin/moderation/:type/:id` — Dismiss report or remove content (`admin`)
