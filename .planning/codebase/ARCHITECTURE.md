# Architecture

**Analysis Date:** 2026-04-26

## Pattern Overview

**Overall:** React/Vite single-page application with two supporting backends: a TypeScript Express API for persisted product data and a Python Flask/Socket.IO service for Gemini-backed lesson generation and code execution.

**Key Characteristics:**
- Browser app is the primary user experience; routing, navigation, and most workflow state live in `src/App.tsx`, `src/pages/`, and React Context providers.
- Product persistence is handled by `server/index.ts` against MongoDB through `server/db.ts`.
- Identity is owned by Supabase Auth in the browser (`src/lib/supabase.ts`) and verified in Express by JWKS middleware (`server/auth.ts`).
- AI generation, AI help, step checking, and C/C++ terminal execution are isolated in `backend/app.py`.
- The development topology expects three processes: Vite on port 3000, Express on port 3001, and Flask/Socket.IO on port 5000.

## Layers

**Presentation Layer:**
- Purpose: Render the learning dashboard, challenge marketplace, profiles, project workspace, and auth UI.
- Contains: Route pages in `src/pages/` and reusable UI in `src/components/`.
- Depends on: React Router, context hooks, API clients in `src/lib/`, AI service client in `src/services/gemini.ts`, and shared types in `src/types.ts`.
- Used by: Vite entry point `src/main.tsx`.

**Client State Layer:**
- Purpose: Provide cross-page auth and project state.
- Contains: `src/contexts/AuthContext.tsx`, `src/contexts/ProjectContext.tsx`, and `src/hooks/useProjects.ts`.
- Depends on: `src/lib/supabase.ts` for session state and `src/lib/api.ts` for authenticated project persistence.
- Used by: `src/App.tsx`, dashboard/profile/workspace pages, and components that need user or project data.

**Client Service Layer:**
- Purpose: Centralize browser-side integration calls.
- Contains: `src/lib/api.ts`, `src/lib/profileApi.ts`, `src/lib/usersApi.ts`, `src/lib/avatarApi.ts`, `src/lib/supabase.ts`, and `src/services/gemini.ts`.
- Depends on: Browser `fetch`, Supabase JS client, and shared types.
- Used by: Pages and components instead of placing most HTTP calls inline.

**Express API Layer:**
- Purpose: Own authenticated app data and public profile/challenge APIs.
- Contains: Route handlers and domain helpers in `server/index.ts`, auth middleware in `server/auth.ts`, and Mongo connection management in `server/db.ts`.
- Depends on: MongoDB, Supabase JWKS, Supabase Storage admin client for signed submission URLs, and GitHub OAuth/API endpoints.
- Used by: Browser calls under `/api/...`, proxied by Vite during development.

**AI and Execution Layer:**
- Purpose: Generate lesson projects, answer tutor questions, evaluate step completion, and compile/run C/C++ code over WebSocket terminal sessions.
- Contains: Flask routes and Socket.IO handlers in `backend/app.py`.
- Depends on: Google ADK/GenAI, Flask-CORS, Flask-SocketIO, `ptyprocess`, system compilers (`gcc`/`g++`), and `GEMINI_API_KEY`.
- Used by: `src/services/gemini.ts` and `src/components/XTerm.tsx`.

**Data and Storage Layer:**
- Purpose: Persist users' projects, profiles, challenges, submissions, and Elo changes.
- Contains: MongoDB collections accessed directly from `server/index.ts`; Supabase Auth and Storage buckets accessed from the browser and server.
- Depends on: Environment variables such as `MONGODB_URI`, `SUPABASE_URL`, Supabase keys, and bucket names.
- Used by: Express API and browser avatar upload code.

## Data Flow

**SPA Boot and Routing:**
1. `index.html` loads `/src/main.tsx`.
2. `src/main.tsx` mounts `<App />` inside `<AuthProvider>`.
3. `src/App.tsx` creates `BrowserRouter`, wraps routes in `<ProjectProvider>`, renders the nav, and maps paths to page components.
4. Route pages fetch data through contexts and service modules, then render page-local state.

**Authenticated Express Request:**
1. A page or component calls `api.get`, `api.post`, `api.put`, or `api.delete` from `src/lib/api.ts`.
2. `authHeaders()` reads the current Supabase session and adds `Authorization: Bearer <token>` when present.
3. Vite proxies `/api` traffic to the Express dev server configured in `vite.config.ts`.
4. Protected routes in `server/index.ts` call `requireAuth` from `server/auth.ts`.
5. `requireAuth` verifies the Supabase JWT with JWKS and attaches `req.userId` and `req.userEmail`.
6. Route handlers use `getDb()` from `server/db.ts` to read/write MongoDB collections and return JSON.

**Project Generation and Workspace Save:**
1. `src/pages/Generation.tsx` collects prompt, language, and difficulty.
2. `generateProject()` in `src/services/gemini.ts` POSTs to `http://127.0.0.1:5000/api/generateProject`.
3. `backend/app.py` runs the Google ADK sequential pipeline when available, falling back to direct Gemini generation.
4. The Flask handler parses model JSON, adds generated metadata, and returns a `GeneratedProject`-shaped object.
5. `ProjectProvider.saveProject()` in `src/contexts/ProjectContext.tsx` updates memory, mirrors to `localStorage`, and PUTs to `/api/projects/:id` when signed in.
6. `server/index.ts` upserts the project into the `projects` collection with the authenticated `userId`.

**Challenge Submission and Grading:**
1. Challenge pages call `/api/challenges`, `/api/submissions/...`, and grading endpoints through `src/lib/api.ts`.
2. `server/index.ts` validates challenge/submission rules, stores challenge documents in `challenges`, and stores drafts/final submissions in `challenge_submissions`.
3. For zip uploads/downloads, Express uses a Supabase admin client to create signed Storage URLs.
4. Creators grade after due dates; verified challenge podium placements call `applyElo()` and insert `elo_changes`.

**Socket Terminal Execution:**
1. Workspace terminal UI uses `src/components/XTerm.tsx` and `socket.io-client`.
2. It emits `execute_code` to Flask Socket.IO in `backend/app.py`.
3. Flask writes code to a temporary directory, compiles C/C++ with `gcc` or `g++`, spawns a PTY process, and streams output through `terminal_output`.
4. User input is relayed through `terminal_input` to the running PTY process.

**State Management:**
- Auth state is Supabase session state exposed through `AuthProvider`.
- Project state is React state plus `localStorage['project-code-projects']`; remote project state is loaded from `/api/projects` when signed in.
- Page-level UI state stays inside individual page components.
- Server state is persisted in MongoDB and Supabase Storage; Express also keeps an in-process Mongo client cache.

## Key Abstractions

**Project and Lesson Types:**
- Purpose: Shared browser contract for generated lessons and saved projects.
- Examples: `GeneratedProject`, `UserProject`, `ProjectFile`, and `LessonStep` in `src/types.ts`.
- Pattern: TypeScript interfaces mirrored manually by `ProjectDoc` in `server/index.ts`.

**Context Providers:**
- Purpose: Make auth and project state available without prop drilling.
- Examples: `AuthProvider` in `src/contexts/AuthContext.tsx`, `ProjectProvider` in `src/contexts/ProjectContext.tsx`.
- Pattern: React Context provider plus hook.

**API Client Helpers:**
- Purpose: Keep HTTP behavior and token injection out of pages.
- Examples: `api` in `src/lib/api.ts`, `profileApi` in `src/lib/profileApi.ts`, `usersApi` in `src/lib/usersApi.ts`, `avatarApi` in `src/lib/avatarApi.ts`.
- Pattern: Thin typed wrappers around `fetch` and Supabase Storage.

**Express Auth Middleware:**
- Purpose: Convert a Supabase JWT into request-scoped user identity.
- Examples: `requireAuth` in `server/auth.ts`.
- Pattern: Express middleware with JWKS signing-key lookup and `Request` type augmentation.

**Mongo Connection Singleton:**
- Purpose: Lazily reuse one MongoDB connection per Express process.
- Examples: `getDb()` in `server/db.ts`.
- Pattern: Module-level cached `MongoClient` and `Db`.

**AI Pipeline:**
- Purpose: Convert a learner prompt into a structured multi-step project lesson.
- Examples: `SequentialAgent` and six `LlmAgent` instances in `backend/app.py`.
- Pattern: Google ADK sequential agent pipeline with direct Gemini fallback.

## Entry Points

**Vite SPA:**
- Location: `index.html`, `src/main.tsx`, `src/App.tsx`.
- Triggers: `npm run dev` or `npm run build`.
- Responsibilities: Mount React, provide auth/project contexts, define routes, render app shell.

**Express API:**
- Location: `server/index.ts`.
- Triggers: `npm run dev:server`.
- Responsibilities: Serve `/api/...` JSON endpoints, verify auth, persist MongoDB documents, integrate with GitHub OAuth/API and Supabase Storage.

**Flask AI Service:**
- Location: `backend/app.py`.
- Triggers: `npm run dev:agent` or direct Python execution.
- Responsibilities: Serve AI HTTP endpoints and Socket.IO terminal execution.

**Seed Scripts:**
- Location: `scripts/seed-challenges.ts`, `scripts/seed-submissions.ts`.
- Triggers: Manual `tsx` execution.
- Responsibilities: Insert demo challenges, profiles, and submissions into MongoDB.

**Diagnostic/Extraction Scripts:**
- Location: `check_adk.py`, `check_adk_methods.py`, `test_runner.py`, `extract.py`, `app_adk.py`, `extracted_app.py`.
- Triggers: Manual Python execution.
- Responsibilities: Inspect Google ADK behavior or preserve extracted/generated app code. These are outside the runtime app path.

## Error Handling

**Strategy:** Errors are handled locally at each boundary with status codes from servers and thrown exceptions in client service wrappers.

**Patterns:**
- `src/lib/api.ts` throws an `Error` on non-OK responses and returns `undefined` for HTTP 204.
- Pages commonly catch service errors and show local UI messages or alerts.
- Express routes in `server/index.ts` use route-level `try/catch` blocks and return JSON `{ error, detail }` for many failures.
- `server/auth.ts` returns 401 JSON for missing or invalid bearer tokens.
- Flask routes in `backend/app.py` catch generation/evaluation errors and return JSON error payloads; step checking currently converts evaluator failure into an incomplete result.
- Socket.IO terminal execution emits compile/runtime failure text through `terminal_output`.

## Cross-Cutting Concerns

**Logging:**
- Browser code uses `console.error` and occasional `console.log`.
- Express logs startup and selected GitHub/export errors with `console.error`.
- Flask prints ADK pipeline progress and fallback errors to stdout.

**Validation:**
- Express contains inline validation for usernames, challenge fields, due dates, submission URLs, avatar URLs, creator-only access, and grading rules.
- Flask validates only required fields for AI routes and supported languages for terminal execution.
- The browser relies on TypeScript interfaces and component-level form validation.

**Authentication and Authorization:**
- Supabase handles browser authentication.
- Express protects user-scoped routes with `requireAuth` and then performs resource ownership checks in route handlers.
- Public profile, public challenge listing, and public user search endpoints are unauthenticated.
- Flask AI and Socket.IO endpoints are unauthenticated in the current code.

**Configuration:**
- Vite config lives in `vite.config.ts`; `/api` is proxied to the Express port.
- Browser Supabase config is read from `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Express reads `MONGODB_URI`, `SUPABASE_URL`, Supabase service keys, GitHub OAuth credentials, and bucket names from environment variables.
- Flask reads `GEMINI_API_KEY` from environment variables loaded by `dotenv`.

**Styling and UI:**
- Tailwind CSS v4 is wired through `@tailwindcss/vite`.
- Global styles and design tokens live in `src/index.css`.
- Icons are imported from `lucide-react`.
- Some richer UI uses `motion`, Monaco editor, xterm, and charting/custom SVG components.

**Testing:**
- `npm run lint` runs `tsc --noEmit`.
- No Vitest/Jest/Playwright test suite is configured.
- `public/test_data/*.json` supports manual generation-flow testing.

---

*Architecture analysis: 2026-04-26*
*Update when major patterns change*
