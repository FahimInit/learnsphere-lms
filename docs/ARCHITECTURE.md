# LearnSphere — System Architecture

## 1. Architectural Pattern
LearnSphere employs a **Modular Monolith** backend architecture paired with a **Feature-Sliced React Single Page Application (SPA)** frontend inside an npm workspaces monorepo.

### Why Modular Monolith?
- **Strong Domain Boundaries**: Each functional area (`auth`, `users`, `categories`, `courses`, `sections`, `lessons`, `enrollments`, `progress`, `quizzes`, `assignments`, `discussions`, `notifications`, `certificates`, `analytics`, `admin`) resides in its own module under `server/src/modules/<module>/`.
- **Transactional Consistency**: Operations spanning multiple collections (e.g., completing a lesson -> recalculating enrollment completion percentage -> issuing a certificate -> emitting a notification) execute within shared database sessions without distributed Saga complexity.
- **Zero-Friction Deployment**: Single deployable API artifact with clean separation between Express `app.ts` (for Supertest in-memory testing) and HTTP/Socket.IO `server.ts`.

## 2. Backend Module Anatomy
Each module in `server/src/modules/<domain>/` follows a predictable layered structure:
- **`<domain>.model.ts`**: Mongoose schema, indexes, and TypeScript document interfaces.
- **`<domain>.validator.ts`**: Zod validation schemas for request body, query parameters, and route params.
- **`<domain>.service.ts`**: Pure domain and business logic, database queries, ownership checks, and cross-service orchestration.
- **`<domain>.controller.ts`**: HTTP transport adapters using `asyncHandler` and standardized `sendSuccess` / `sendPaginated` response helpers.
- **`<domain>.routes.ts`**: Express router binding authentication, RBAC (`authorize`), validation (`validate`), and controller handlers.

## 3. Infrastructure Abstractions
To prevent vendor lock-in and guarantee seamless local development and automated testing:
1. **`StorageProvider` (`server/src/infrastructure/storage/`)**:
   - Exposes `uploadFile(file, folder)` and `deleteFile(fileUrl)`.
   - Uses `LocalStorageProvider` in development/testing (writing validated files to `uploads/` with safe UUID names) and can switch to an S3-compatible provider via `STORAGE_PROVIDER=s3`.
2. **`EmailProvider` (`server/src/infrastructure/email/`)**:
   - Exposes `sendEmail({ to, subject, template, context })`.
   - Uses `ConsoleEmailProvider` in development/testing (logging structured email payloads and verification/reset links) and supports SMTP integration via `EMAIL_PROVIDER=smtp`.
3. **`SocketManager` (`server/src/infrastructure/socket/`)**:
   - Authenticates WebSocket handshakes using JWT access tokens and joins authenticated clients to personal rooms (`user:<userId>`) and course rooms (`course:<courseId>`) for instant notification pushes.

## 4. Frontend Architecture (`client/`)
- **Routing & Guards**: React Router v6 with `<ProtectedRoute />` and `<RoleGuard allowedRoles={[...]} />` components.
- **Server State**: TanStack Query v5 manages caching, background refetching, pagination, and mutation invalidation.
- **Client State**: Minimal Zustand stores (`useAuthStore`) hold the active user profile and access token in memory while coordinating silent refresh via an Axios response interceptor.
- **Design System**: Tailwind CSS + reusable `shadcn/ui`-style components (`Button`, `Card`, `Badge`, `Dialog`, `Input`, `Select`, `Table`, `Tabs`, `Skeleton`, `Toast`).
