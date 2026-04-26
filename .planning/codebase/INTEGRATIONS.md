# External Integrations

**Analysis Date:** 2026-04-26

## APIs & External Services

**AI / LLM:**
- Google Gemini (via `google-genai` Python SDK) - Powers all AI features
  - SDK/Client: `google-genai` Python package (`backend/app.py` line 5: `from google import genai`)
  - Model: `gemma-4-26b-a4b-it` (`backend/app.py` line 19, `MODEL_ID` constant)
  - Auth: `GEMINI_API_KEY` env var, read via `os.getenv` in `backend/app.py` line 16
  - Endpoints exposed by the Flask wrapper:
    - `POST /api/generateProject` - Builds a project lesson JSON from prompt/language/difficulty (`backend/app.py` line 21)
    - `POST /api/getAIHelp` - Tutor responses for the Workspace chat (`backend/app.py` line 101)
    - `POST /api/checkStepCompletion` - Grades the user's code against a step's expected solution (`backend/app.py` line 131)
  - Notes: Response MIME `application/json` requested for structured outputs; markdown code fences are stripped manually
- `@google/genai` ^1.50.1 - Listed in `package.json` dependencies; no imports detected in `src/`. Vite still injects `GEMINI_API_KEY` into the client bundle (`vite.config.ts` line 11), so a future client-side path exists but is currently unused

**Auth Identity Provider:**
- Supabase Auth - User signup/login and JWT issuance (see "Authentication & Identity")

**Frontend → Gemini wrapper:**
- Hard-coded backend URL `http://localhost:5000/api` in `src/services/gemini.ts` line 3 (`BACKEND_URL`)
- Functions: `generateProject`, `getAIHelp`, `checkStepCompletion`

**Frontend → Project API:**
- Same-origin `/api/*` calls proxied to `http://localhost:3001` via Vite (`vite.config.ts` lines 22-24)
- `src/lib/api.ts` injects `Authorization: Bearer <supabase access_token>` on every request

## Data Storage

**Databases:**
- MongoDB (driver `mongodb` ^7.2.0)
  - Connection: `MONGODB_URI` env var (`server/db.ts` line 8)
  - Database name: `projectcode` (hard-coded in `server/db.ts` line 12)
  - Collection: `projects` (`server/index.ts` lines 41, 71, 81)
  - Client: native `MongoClient` lazily initialized and cached in `server/db.ts`
  - Document shape: `ProjectDoc` interface in `server/index.ts` lines 9-21 (`_id`, `userId`, `title`, `description`, `language`, `difficulty`, `learningGoals`, `files`, `steps`, `currentStep`, `updatedAt`)
- Supabase Postgres - Implicit (managed by Supabase Auth for user records); no direct queries from this codebase

**File Storage:**
- Local filesystem only (no S3, GCS, or Supabase Storage integrations detected)
- Static assets served from `public/` (e.g., `public/test_data/project.json` consumed by `src/pages/Generation.tsx` line 36 when "Use test data" is checked)

**Caching:**
- In-process JWKS cache via `jwks-rsa` (`server/auth.ts` lines 18-20: `cache: true`, `cacheMaxAge: 10 * 60 * 1000`, `rateLimit: true`)
- Browser `localStorage` key `project-code-projects` for offline/anonymous project persistence (`src/contexts/ProjectContext.tsx` lines 24, 59-62)
- No Redis / Memcached / CDN cache layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Frontend client: `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)` in `src/lib/supabase.ts` (falls back to `https://placeholder.supabase.co` and `'placeholder'` with a `console.warn` if env is missing)
  - Session lifecycle handled in `src/contexts/AuthContext.tsx`: `supabase.auth.getSession()` on mount + `onAuthStateChange` subscription
  - Sign-in / sign-up via email + password in `src/components/AuthModal.tsx` lines 30-32 (`signInWithPassword`, `signUp`)
  - Sign-out via `supabase.auth.signOut()` in `AuthContext.signOut`

**Server-side verification:**
- `server/auth.ts` `requireAuth` middleware:
  - Expects `Authorization: Bearer <jwt>` header
  - Resolves signing keys via `jwks-rsa` against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`
  - Verifies with `jsonwebtoken.verify` using algorithms `ES256` and `RS256`, issuer `${SUPABASE_URL}/auth/v1`, audience `authenticated`
  - Populates `req.userId` from the JWT `sub` claim (typed via global `Express.Request` augmentation)
- All `/api/projects*` and `/api/me` routes are guarded by `requireAuth` (`server/index.ts` lines 27, 37, 51, 78)
- `bcryptjs` is declared in `package.json` but unused — password handling is fully delegated to Supabase

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, Bugsnag, Honeybadger, or Rollbar SDKs)

**Logs:**
- Server: `console.log` on listen (`server/index.ts` line 93); errors returned as JSON `{ error, detail }` payloads
- Backend: `print(...)` for failure paths in `backend/app.py` (lines 98, 128, 181); Flask `debug=True` in `__main__`
- Frontend: `console.warn`/`console.error` for missing Supabase env (`src/lib/supabase.ts` line 7) and API failures (`src/contexts/ProjectContext.tsx` lines 31, 38, 67; `src/services/gemini.ts` lines 18, 65)

## CI/CD & Deployment

**Hosting:**
- Google AI Studio - Referenced in `README.md` (`https://ai.studio/apps/1c6c17b8-8d9f-466d-976c-6a4554218031`) and `metadata.json` (`name: ProjectCode`)
- No platform-specific config files (`vercel.json`, `netlify.toml`, `Dockerfile`, `fly.toml`, `app.yaml`, `render.yaml`) detected

**CI Pipeline:**
- None detected (no `.github/workflows/`, `.circleci/`, `.gitlab-ci.yml`, or `bitbucket-pipelines.yml`)

## Environment Configuration

**Required env vars:**
- `GEMINI_API_KEY` - Used by `backend/app.py` (Flask Gemini client) and surfaced to the client bundle by Vite (`vite.config.ts` line 11)
- `VITE_SUPABASE_URL` - Frontend Supabase client (`src/lib/supabase.ts`)
- `VITE_SUPABASE_ANON_KEY` - Frontend Supabase client (`src/lib/supabase.ts`)
- `SUPABASE_URL` - Express server JWKS URI + JWT issuer (`server/auth.ts` lines 13, 17, 45)
- `MONGODB_URI` - Express server Mongo connection string (`server/db.ts` line 8)
- `PORT` - Optional Express port override, defaults to `3001` (`server/index.ts` line 91)
- `DISABLE_HMR` - Optional Vite HMR kill switch (`vite.config.ts` line 21)

**Secrets location:**
- `.env*` files at the repo root, git-ignored (`.gitignore` line 7); README instructs setting `GEMINI_API_KEY` in `.env.local`
- `dotenv/config` (Node) and `python-dotenv`'s `load_dotenv()` (Python) load these at process startup

## Webhooks & Callbacks

**Incoming:**
- None (Express API exposes only authenticated REST endpoints — `/api/health`, `/api/me`, `/api/projects`, `/api/projects/:id`)
- Flask backend exposes only the three Gemini wrapper endpoints listed above

**Outgoing:**
- None (no signed webhook deliveries, no `fetch`/`requests` to external services beyond Gemini and Supabase)

## REST Surface (Internal)

**Express (`server/index.ts`, port 3001, all routes JSON, `requireAuth` unless noted):**
- `GET /api/health` - Public health probe (line 23)
- `GET /api/me` - Echoes `userId` and pings Mongo (line 27)
- `GET /api/projects` - Lists the caller's projects (line 37)
- `PUT /api/projects/:id` - Upserts a project document (line 51)
- `DELETE /api/projects/:id` - Deletes a project document (line 78)

**Flask (`backend/app.py`, port 5000, CORS open via `flask_cors.CORS(app)`):**
- `POST /api/generateProject` (line 21)
- `POST /api/getAIHelp` (line 101)
- `POST /api/checkStepCompletion` (line 131)

---

*Integration audit: 2026-04-26*
