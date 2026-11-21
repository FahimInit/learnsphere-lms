# LearnSphere — Security Architecture & Threat Mitigations

Security is designed into every layer of LearnSphere rather than patched on as an afterthought.

## 1. Authentication & Session Security
- **Password Hashing**: All passwords are hashed using `bcryptjs` with a cost factor of 12 (or 10 in automated tests for speed) and never stored or logged in plaintext. `passwordHash` has `select: false` at the Mongoose schema level.
- **Short-Lived Access + Rotating Refresh Tokens**:
  - Access tokens expire in `15m` and are held in client memory.
  - Refresh tokens expire in `7d`, are delivered in `httpOnly`, `SameSite=Lax`, `Secure` (in production) cookies, and their SHA-256 hashes are tracked per user in MongoDB.
  - Refreshing a session rotates the refresh token and invalidates the old hash, mitigating token replay attacks.
- **Account Status Enforcement**: Authentication middleware verifies that `user.status === 'active'`. Suspended accounts are rejected immediately even if holding an unexpired token.

## 2. Authorization & IDOR Prevention
- **Role-Based Access Control (`authorize(...roles)`)**: Enforced on every sensitive route handler. Self-registration is restricted strictly to `student` and `instructor` roles; `admin` privilege escalation via registration or profile updates is blocked by schema whitelist validation.
- **Resource Ownership Verification**:
  - Instructors can only edit courses, sections, lessons, quizzes, assignments, and grades where `course.instructor.equals(req.user.id)`.
  - Students can only access full lesson content, submit quizzes/assignments, or post course discussions if an active/completed `Enrollment` document exists for `{ student: req.user.id, course: courseId }`.

## 3. Input Validation & Injection Defense
- **Strict Zod Schemas**: Every request body, query string, and URL parameter is validated and coerced through Zod middleware before reaching controllers. Unknown fields are stripped.
- **NoSQL Injection Prevention**: Mongoose strict query mode is enabled, and Zod enforces primitive string/number/ObjectId formats so operator injection objects (`{ "$gt": "" }`) are rejected at the boundary.
- **XSS & HTTP Hardening**: `helmet` configures strict HTTP response headers (`X-Content-Type-Options: nosniff`, `X-Frame-Options`, `Content-Security-Policy` defaults), and CORS is restricted to configured `CLIENT_URL` origins.

## 4. Assessment & Progress Integrity
- **Zero Client Trust**:
  - Quiz answers (`correctOptionIds`, `explanation`) are stripped from student `GET /quizzes/:id` payloads and computed exclusively server-side upon attempt submission.
  - Course completion percentage (`progressPercentage`) is recalculated deterministically on the server from `LessonProgress` counts.
  - Certificate generation is triggered and verified exclusively on the backend when `progressPercentage === 100`.

## 5. Rate Limiting & File Upload Hardening
- **Rate Limiting**: `express-rate-limit` protects `/api/v1/auth/*` against credential stuffing and brute-force attacks and applies a global baseline limiter across `/api/v1/*`.
- **Upload Validation**: File uploads enforce strict MIME type + file extension whitelists, maximum byte size limits, and UUID filename randomization to prevent path traversal and executable script upload.
