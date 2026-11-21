# LearnSphere — Database Design & Schema Specification

LearnSphere uses **MongoDB** with **Mongoose** ODM. The schema balances document locality (embedding small, bounded subdocuments) with relational scalability (referencing high-cardinality or independently queried entities).

---

## 1. Embedded vs. Referenced Decisions

| Parent Entity | Child Entity | Strategy | Architectural Justification |
| :--- | :--- | :--- | :--- |
| `User` | `refreshTokens` | **Embedded Array** (bounded to max 5 active sessions) | Loaded and mutated atomically with user authentication checks; bounded size avoids document bloat. |
| `Course` | `Section` & `Lesson` | **Referenced (`ObjectId`)** | Courses can have dozens of sections and hundreds of lessons with rich Markdown content. Referencing enables independent reordering, atomic lesson updates, and lightweight catalog queries. |
| `Lesson` | `resources` | **Embedded Array** | Each lesson has a small number (0–10) of downloadable attachments (`{ title, fileUrl, fileSize, mimeType }`) always fetched with the lesson detail. |
| `Quiz` | `Question` | **Referenced (`ObjectId`)** | Separating `Question` documents allows student quiz fetches to project out `correctOptionIds` and `explanation` cleanly while supporting question bank management and ordering. |
| `Question` | `options` | **Embedded Array** | Options (`{ id, text }`) belong strictly to a single question (2–6 options) and are never queried independently. |
| `QuizAttempt` | `answers` | **Embedded Array** | An attempt is an immutable historical record of a student's submission for a quiz (`{ question, selectedOptionIds, isCorrect, pointsAwarded }`). |
| `Submission` | `attachments` & `gradeHistory` | **Embedded Arrays** | Bounded per student assignment submission; preserves complete audit trail across resubmissions. |
| `Discussion` | `Comment` | **Referenced (`ObjectId`)** | Discussion threads can receive an arbitrary number of replies; referencing enables pagination and independent moderation. |

---

## 2. Collection Schemas, Indexes & Constraints

### 2.1 `User` (`users`)
- **Fields**: `name`, `email`, `passwordHash` (`select: false`), `role` (`student` | `instructor` | `admin`), `status` (`active` | `suspended` | `pending`), `avatarUrl`, `headline`, `bio`, `isEmailVerified`, `emailVerificationTokenHash`, `passwordResetTokenHash`, `passwordResetExpiresAt`, `refreshTokens` (`[{ tokenHash, expiresAt, createdAt }]`), `lastLoginAt`.
- **Indexes**:
  - `{ email: 1 }` — **Unique**
  - `{ role: 1, status: 1 }`

### 2.2 `Category` (`categories`)
- **Fields**: `name`, `slug`, `description`, `icon`, `isActive`, `courseCount`.
- **Indexes**:
  - `{ slug: 1 }` — **Unique**
  - `{ name: 1 }` — **Unique**

### 2.3 `Course` (`courses`)
- **Fields**: `title`, `slug`, `shortDescription`, `fullDescription`, `thumbnailUrl`, `previewVideoUrl`, `instructor` (`ref: User`), `category` (`ref: Category`), `tags` (`string[]`), `level` (`beginner` | `intermediate` | `advanced`), `price` (`number`), `prerequisites` (`string[]`), `learningObjectives` (`string[]`), `estimatedDurationMinutes`, `status` (`draft` | `pending_review` | `published` | `rejected` | `archived`), `rejectionReason`, `publishedAt`, `enrollmentCount`, `averageRating`, `reviewCount`, `totalLessonsCount`.
- **Indexes**:
  - `{ slug: 1 }` — **Unique**
  - `{ status: 1, category: 1, level: 1, price: 1 }` — Catalog filter index
  - `{ instructor: 1, status: 1 }` — Instructor dashboard query index
  - `{ title: "text", shortDescription: "text", tags: "text" }` — Full-text search index

### 2.4 `Section` (`sections`)
- **Fields**: `course` (`ref: Course`), `title`, `description`, `order` (`number`).
- **Indexes**:
  - `{ course: 1, order: 1 }`

### 2.5 `Lesson` (`lessons`)
- **Fields**: `course` (`ref: Course`), `section` (`ref: Section`), `title`, `slug`, `type` (`video` | `text` | `resource` | `embed`), `content`, `videoUrl`, `videoDurationSeconds`, `videoProvider` (`local` | `external`), `resources` (`[{ title, fileUrl, fileSize, mimeType }]`), `isPreview` (`boolean`), `order` (`number`).
- **Indexes**:
  - `{ section: 1, order: 1 }`
  - `{ course: 1, order: 1 }`

### 2.6 `Enrollment` (`enrollments`)
- **Fields**: `student` (`ref: User`), `course` (`ref: Course`), `status` (`active` | `completed` | `cancelled`), `progressPercentage` (`0..100`), `completedLessonsCount`, `lastAccessedLesson` (`ref: Lesson`), `lastAccessedAt`, `enrolledAt`, `completedAt`.
- **Indexes**:
  - `{ student: 1, course: 1 }` — **Unique** (prevents duplicate enrollments)
  - `{ course: 1, status: 1 }`

### 2.7 `LessonProgress` (`lessonprogresses`)
- **Fields**: `enrollment` (`ref: Enrollment`), `student` (`ref: User`), `course` (`ref: Course`), `lesson` (`ref: Lesson`), `isCompleted` (`boolean`), `completedAt`, `watchTimeSeconds`, `lastPositionSeconds`, `notes` (`string`).
- **Indexes**:
  - `{ student: 1, lesson: 1 }` — **Unique**
  - `{ enrollment: 1, isCompleted: 1 }`

### 2.8 `Quiz` (`quizzes`)
- **Fields**: `course` (`ref: Course`), `section` (`ref: Section`, optional), `lesson` (`ref: Lesson`, optional), `title`, `description`, `timeLimitMinutes`, `maxAttempts`, `passingScorePercentage`, `isPublished`, `totalPoints`.
- **Indexes**:
  - `{ course: 1, isPublished: 1 }`

### 2.9 `Question` (`questions`)
- **Fields**: `quiz` (`ref: Quiz`), `type` (`mcq` | `multi_select` | `true_false`), `prompt`, `options` (`[{ id, text }]`), `correctOptionIds` (`string[]`), `points`, `explanation`, `order`.
- **Indexes**:
  - `{ quiz: 1, order: 1 }`

### 2.10 `QuizAttempt` (`quizattempts`)
- **Fields**: `quiz` (`ref: Quiz`), `course` (`ref: Course`), `student` (`ref: User`), `attemptNumber`, `answers` (`[{ question, selectedOptionIds, isCorrect, pointsAwarded }]`), `scorePercentage`, `earnedPoints`, `totalPoints`, `passed`, `startedAt`, `submittedAt`, `durationSeconds`.
- **Indexes**:
  - `{ quiz: 1, student: 1, attemptNumber: 1 }` — **Unique**
  - `{ course: 1, student: 1 }`

### 2.11 `Assignment` (`assignments`)
- **Fields**: `course` (`ref: Course`), `section` (`ref: Section`, optional), `title`, `instructions`, `dueDate`, `maxScore`, `allowResubmission`, `maxResubmissions`, `allowedFileTypes`, `maxFileSizeMb`, `isPublished`.
- **Indexes**:
  - `{ course: 1, isPublished: 1 }`

### 2.12 `Submission` (`submissions`)
- **Fields**: `assignment` (`ref: Assignment`), `course` (`ref: Course`), `student` (`ref: User`), `textResponse`, `attachments` (`[{ fileName, fileUrl, fileSize, mimeType }]`), `status` (`submitted` | `graded` | `returned_for_revision`), `grade`, `feedback`, `gradedBy` (`ref: User`), `gradedAt`, `submissionCount`, `gradeHistory` (`[{ grade, feedback, gradedBy, gradedAt, submissionNumber }]`).
- **Indexes**:
  - `{ assignment: 1, student: 1 }` — **Unique**
  - `{ course: 1, status: 1 }`

### 2.13 `Discussion` (`discussions`)
- **Fields**: `course` (`ref: Course`), `lesson` (`ref: Lesson`, optional), `author` (`ref: User`), `title`, `content`, `isPinned`, `isResolved`, `replyCount`, `isReported`, `reportReason`.
- **Indexes**:
  - `{ course: 1, isPinned: -1, createdAt: -1 }`
  - `{ isReported: 1 }`

### 2.14 `Comment` (`comments`)
- **Fields**: `discussion` (`ref: Discussion`), `author` (`ref: User`), `content`, `isInstructorReply`, `isReported`, `reportReason`.
- **Indexes**:
  - `{ discussion: 1, createdAt: 1 }`
  - `{ isReported: 1 }`

### 2.15 `Announcement` (`announcements`)
- **Fields**: `course` (`ref: Course`), `instructor` (`ref: User`), `title`, `content`.
- **Indexes**:
  - `{ course: 1, createdAt: -1 }`

### 2.16 `Notification` (`notifications`)
- **Fields**: `recipient` (`ref: User`), `type`, `title`, `message`, `linkUrl`, `isRead`, `readAt`.
- **Indexes**:
  - `{ recipient: 1, isRead: 1, createdAt: -1 }`

### 2.17 `Certificate` (`certificates`)
- **Fields**: `certificateCode` (e.g., `LS-2026-XXXXXX`), `student` (`ref: User`), `course` (`ref: Course`), `enrollment` (`ref: Enrollment`), `studentNameSnapshot`, `courseTitleSnapshot`, `instructorNameSnapshot`, `issuedAt`.
- **Indexes**:
  - `{ certificateCode: 1 }` — **Unique**
  - `{ student: 1, course: 1 }` — **Unique**

### 2.18 `CourseReview` (`coursereviews`)
- **Fields**: `course` (`ref: Course`), `student` (`ref: User`), `rating` (`1..5`), `comment`.
- **Indexes**:
  - `{ course: 1, student: 1 }` — **Unique**

### 2.19 `AuditLog` (`auditlogs`)
- **Fields**: `actor` (`ref: User`), `action`, `targetType`, `targetId`, `metadata`, `ipAddress`, `createdAt`.
- **Indexes**:
  - `{ createdAt: -1 }`
  - `{ actor: 1, createdAt: -1 }`

---

## 3. Data Ownership & Deletion Behavior
- **Course Ownership**: Only `course.instructor === req.user.id` or an `admin` may mutate a course, its sections, lessons, quizzes, assignments, or announcements.
- **Safe Course Deletion**:
  - If `course.enrollmentCount === 0`, deleting a course cascades to its `Section`, `Lesson`, `Quiz`, `Question`, and `Assignment` records.
  - If `course.enrollmentCount > 0`, deletion transitions the course to `status: 'archived'`, preserving student learning history and certificate validity.
- **Section Deletion**: Deleting a section cascades to lessons in that section and triggers a recalculation of `course.totalLessonsCount`.
