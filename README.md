# Secure Note-Taking Application

A complete, production-grade **Secure Note-Taking Application** engineered with a **TypeScript Node.js/Express REST API** and a functional **React (Vite) Frontend**.

This project emphasizes database indexing efficiency, MongoDB aggregation pipelines, Role-Based Access Control (RBAC), deterministic pagination, and protection against Insecure Direct Object References (IDOR).

---

## 🌐 Live Application & Demo

* **Live Frontend Website**: [http://103.85.240.79:8090](http://103.85.240.79:8090)
* **Live Backend API**: [http://103.85.240.79:8090/api](http://103.85.240.79:8090/api)
* **Health Check**: [http://103.85.240.79:8090/api/health](http://103.85.240.79:8090/api/health)

### Demo Credentials:

| Role | Email | Password | Access Details |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@example.com` | `AdminSecurePass123!` | Admin user management, global notes feed, aggregation showcase |
| **User** | `john@example.com` | `Password123!` | Personal note CRUD, pagination, IDOR protection verification |

---

## 1. Technology Stack

### Backend
* **Runtime & Language:** Node.js (`v20+`) with strict TypeScript
* **Framework:** Express.js (`v5`)
* **Database & ODM:** MongoDB (`v8`) with Mongoose (`v8`)
* **Authentication:** Stateless JSON Web Tokens (`jsonwebtoken`)
* **Password Hashing:** Salted `bcryptjs` hashing with `select: false`
* **Request Validation:** Zod schema validation
* **Security Middleware:** Helmet (HTTP headers), CORS, and express-rate-limit
* **Testing:** Jest (`ts-jest`), Supertest, and `mongodb-memory-server`

### Frontend
* **Core:** React 18 with TypeScript
* **Bundler & Tooling:** Vite
* **Styling:** Tailwind CSS (clean, responsive, non-bloated)
* **Routing:** React Router v6
* **HTTP Client:** Axios with JWT request & response interceptors
* **Icons:** Lucide React

### Infrastructure
* **Containerization:** Docker & Docker Compose (Official MongoDB 8)
* **Persistence:** Named Docker volume (`mongodb_data`)

---

## 2. Project Architecture

```text
secure-notes/
├── backend/
│   ├── src/
│   │   ├── config/          # Database connection & lifecycle
│   │   ├── models/          # User, Note, Post schemas with schema.index()
│   │   ├── controllers/     # Express route handlers
│   │   ├── services/        # Isolated business logic
│   │   ├── routes/          # REST route declarations
│   │   ├── middleware/      # Auth, RBAC, Zod validation, error handler, rate limiter
│   │   ├── validations/     # Zod input schemas
│   │   ├── aggregations/    # MongoDB single-pipeline aggregation queries
│   │   ├── utils/           # JWT, pagination helpers, seed script
│   │   ├── types/           # Shared TypeScript interfaces & types
│   │   ├── app.ts           # Express application setup
│   │   └── server.ts        # Server entry point & graceful shutdown
│   ├── tests/               # 7 test suites (38 automated unit/integration tests)
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instance & interceptors
│   │   ├── components/      # Navbar, ProtectedRoute, AdminRoute, Pagination, NoteModal
│   │   ├── contexts/        # AuthContext & token management
│   │   ├── pages/           # Login, Register, NotesDashboard, AdminDashboard, AggregationsPage
│   │   ├── types/           # Client-side TypeScript interfaces
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── DATABASE_INDEXING.md     # In-depth index rationale & .explain() analysis
├── docker-compose.yml       # Official MongoDB 8 service definition
├── .env.example             # Project-wide environment template
└── README.md
```

---

## 3. Database Indexing (The 5 Declared Indexes)

In strict adherence to the project specification, only **five application-level indexes** are declared via the `schema.index()` method in the model files:

1. **`userSchema.index({ email: 1 }, { unique: true })`**
   * Supports $O(\log N)$ point lookups for authentication (`findOne({ email })`) and enforces email uniqueness at the database level.
2. **`userSchema.index({ createdAt: -1, _id: -1 })`**
   * Supports deterministic administrator user pagination (`GET /api/admin/users`) without in-memory sorting.
3. **`noteSchema.index({ userId: 1, createdAt: -1, _id: -1 })`**
   * Applies the **ESR Rule** (Equality on `userId`, Sort on `createdAt` and `_id`) for user note retrieval (`GET /api/notes`).
4. **`noteSchema.index({ createdAt: -1, _id: -1 })`**
   * Supports global administrator note retrieval (`GET /api/admin/notes`). Required because leftmost-prefix rules prevent using Index 3 when `userId` is omitted.
5. **`postSchema.index({ userId: 1, createdAt: -1, _id: -1 })`**
   * Supports the foreign key join in Aggregation Scenario 2 (`$lookup` matching `foreignField: "userId"`).

> **Complete Index Analysis:** See [`DATABASE_INDEXING.md`](./DATABASE_INDEXING.md) for full query plans, `.explain("executionStats")` metrics, and justifications for why redundant indexes (such as an index on `interests`) were intentionally excluded.

---

## 4. Aggregation Scenarios

### Scenario 1: Group Users by Interests
* **Endpoint:** `GET /api/aggregations/users-by-interest` (Admin-only)
* **Constraint Compliance:** Implemented using **exactly one** `User.aggregate()` call.
* **Pipeline Stages:**
  ```javascript
  User.aggregate([
    { $match: { interests: { $exists: true, $type: "array", $ne: [] } } },
    { $unwind: "$interests" },
    { $match: { interests: { $ne: "" } } },
    { $group: { _id: "$interests", users: { $addToSet: { id: "$_id", name: "$name", email: "$email" } } } },
    { $project: { _id: 0, interest: "$_id", userCount: { $size: "$users" }, users: 1 } },
    { $sort: { interest: 1 } }
  ])
  ```
* **Guarantees:** Empty/missing interests are excluded, users are deduplicated within groups, and passwords are never exposed.

### Scenario 2: User Posts Using `$lookup`
* **Endpoint:** `GET /api/aggregations/user-posts/:userId` (Admin-only)
* **Constraint Compliance:** Implemented using a **single aggregation pipeline with a `$lookup` stage**.
* **Pipeline Stages:**
  ```javascript
  User.aggregate([
    { $match: { _id: new mongoose.Types.ObjectId(userId) } },
    { $lookup: { from: "posts", localField: "_id", foreignField: "userId", as: "posts" } },
    { $addFields: { posts: { $sortArray: { input: "$posts", sortBy: { createdAt: -1, _id: -1 } } } } },
    { $project: { _id: 0, id: "$_id", name: 1, email: 1, role: 1, interests: 1, createdAt: 1, postCount: { $size: "$posts" }, posts: 1 } }
  ])
  ```
* **Guarantees:** Supported by Index 5 on `posts.userId`, handles users with 0 posts gracefully, and returns 404 for non-existent users.

---

## 5. Security & IDOR Protection

1. **Insecure Direct Object Reference (IDOR) Mitigation:**
   * When fetching, updating, or deleting notes (`/api/notes/:id`), queries strictly verify ownership:
     ```typescript
     if (role !== UserRole.ADMIN && note.userId.toString() !== requestingUserId) {
       throw new ForbiddenError('Access denied: You do not have permission to access this note');
     }
     ```
   * Users can never tamper with another user's notes by modifying IDs in request parameters or payloads.
2. **Database-Backed Role Verification:**
   * The `authenticate` middleware inspects the database record for every incoming request. If an account is deleted or its role is changed, previously issued JWTs cannot exploit stale role claims.
3. **Privilege Escalation Prevention:**
   * Public registration (`POST /api/auth/register`) enforces `role: USER`. Any client-supplied `role` is discarded.
4. **Self-Deletion Guard:**
   * Administrators are prevented from deleting their own active accounts (`DELETE /api/admin/users/:id`).
5. **Password Protection:**
   * `password` has `select: false` in Mongoose and is stripped during JSON serialization via the schema `toJSON` transform.

---

## 6. Quick Start & Installation

### Prerequisites
* [Node.js](https://nodejs.org/) (`v20+`) and `npm`
* [Docker & Docker Compose](https://www.docker.com/) (Optional for running MongoDB locally)

---

### Step 1: Start Database (Docker)
```bash
# Start official MongoDB 8 container
docker compose up -d
```

---

### Step 2: Configure Environment Variables

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://admin:secretpassword123@127.0.0.1:27017/secure_notes?authSource=admin
JWT_SECRET=super_secure_jwt_secret_key_change_in_production_min32chars
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173

INITIAL_ADMIN_EMAIL=admin@example.com
INITIAL_ADMIN_PASSWORD=AdminSecurePass123!
INITIAL_ADMIN_NAME=Platform Administrator
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:5000/api
```

---

### Step 3: Seed Initial Data (Admin, Users, Notes, Posts)
Run the automated seed script to populate sample accounts, interests, notes, and posts:
```bash
cd backend
npm run seed
```

**Pre-Configured Test Credentials:**

| Role | Email | Password | Interests |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | `AdminSecurePass123!` | Security, Cloud, Architecture |
| **USER** | `john@example.com` | `Password123!` | Technology, Sports |
| **USER** | `sarah@example.com` | `Password123!` | Technology, Music |
| **USER** | `david@example.com` | `Password123!` | Sports, Music |

*(The login page also includes one-click demo fill buttons for immediate testing during live reviews).*

---

### Step 4: Run the Application

**Start Backend (Terminal 1):**
```bash
cd backend
npm run dev
# Server runs on http://localhost:5000
```

**Start Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
# Web application available at http://localhost:5173
```

---

## 7. Automated Testing Suite

The backend includes **7 test suites with 38 unit, integration, and security tests** utilizing `mongodb-memory-server` for zero-configuration, reproducible testing:

```bash
cd backend
npm test
```

### Test Coverage Highlights:
* `phase1.test.ts`: Health check & Mongoose connection state.
* `phase2.test.ts`: Validates that exactly the 5 intended indexes exist and no duplicate indexes are created.
* `phase3_auth.test.ts`: Registration, login, duplicate email rejection, invalid token rejection, and deleted-user token revocation.
* `phase4_notes.test.ts`: Notes CRUD, pagination metadata, and strict IDOR access violation checks.
* `phase4_admin.test.ts`: Admin user management, role updates, and self-deletion prevention.
* `phase5_aggregations.test.ts`: Scenario 1 grouping integrity, deduplication, empty interests handling, and Scenario 2 `$lookup` posts joining.
* `phase6_indexes.test.ts`: Executes `.explain("executionStats")` to verify that queries use `IXSCAN` and examine zero unindexed documents.

---

## 8. REST API Reference

### Authentication
* `POST /api/auth/register` — Register a new user (Public)
* `POST /api/auth/login` — Sign in and receive JWT (Public)
* `GET /api/auth/me` — Retrieve current authenticated profile (Authenticated)

### Notes
* `GET /api/notes?page=1&limit=10` — List user's notes with pagination (Authenticated)
* `POST /api/notes` — Create a new note (Authenticated)
* `GET /api/notes/:id` — Retrieve note by ID with ownership verification (Owner)
* `PUT /api/notes/:id` — Update note (Owner)
* `DELETE /api/notes/:id` — Delete note (Owner)

### Administrator Operations
* `GET /api/admin/notes?page=1&limit=10` — Global note supervision across all users (Admin)
* `GET /api/admin/users?page=1&limit=10` — List all users with pagination (Admin)
* `POST /api/admin/users` — Create user with custom role (Admin)
* `GET /api/admin/users/:id` — Get user profile (Admin)
* `PUT /api/admin/users/:id` — Update user details & role (Admin)
* `DELETE /api/admin/users/:id` — Delete user account (Admin)

### Posts
* `POST /api/posts` — Create a public post (Authenticated)
* `GET /api/posts?page=1&limit=10` — List posts with author details (Authenticated)

### Aggregations
* `GET /api/aggregations/users-by-interest` — Scenario 1: Group users by interests (Admin)
* `GET /api/aggregations/user-posts/:userId` — Scenario 2: Single-pipeline `$lookup` user posts (Admin)
