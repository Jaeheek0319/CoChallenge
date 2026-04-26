# External Integrations

**Analysis Date:** 2026-04-26

## APIs & External Services

**AI Services:**
- Google Gemini API - Generates project lessons, AI help, and step-completion feedback
  - SDK/Client: Python `google-genai` from `backend/requirements.txt`; JavaScript `@google/genai` is listed in `package.json` but no active source import was found
  - Auth: `GEMINI_API_KEY` env var (`backend/app.py`, `README.md`, `vite.config.ts`)
  - Model: `gemini-2.5-flash` in `backend/app.py`
  - Endpoints exposed by local Flask backend: `/api/generateProject`, `/api/getAIHelp`, `/api/checkStepCompletion`
- Google ADK - Sequential multi-agent pipeline around Gemini generation
  - SDK/Client: Python `google-adk` (`backend/requirements.txt`, `backend/app.py`)
  - Runtime behavior: Uses `SequentialAgent`, `LlmAgent`, `Runner`, and `InMemorySessionService`; falls back to direct Gemini SDK calls when ADK import or runner execution fails

**Internal Service Calls:**
- Express API - Frontend app API for profiles, projects, challenges, submissions, and GitHub export
  - Integration method: `fetch` wrapper with Supabase bearer token in `src/lib/api.ts`
  - Dev routing: Vite proxies `/api` to `http://localhost:${API_PORT || PORT || 3001}` (`vite.config.ts`)
- Flask AI backend - Frontend project generation and evaluation API
  - Integration method: direct `fetch` to `http://127.0.0.1:5000/api` (`src/services/gemini.ts`)
  - Auth: none in current Flask routes
- Flask-SocketIO terminal backend - Interactive C/C++ execution from the workspace page
  - Integration method: `socket.io-client` connects to `http://localhost:5000` (`src/pages/Workspace.tsx`)
  - Events: client emits `execute_code` and `terminal_input`; server emits `terminal_output` (`backend/app.py`, `src/components/XTerm.tsx`)

**External APIs:**
- GitHub OAuth and REST API - Connects a user GitHub account and exports generated projects to repositories
  - Integration method: REST via built-in `fetch` in Express (`server/index.ts`)
  - OAuth URL: `https://github.com/login/oauth/authorize`
  - Token endpoint: `https://github.com/login/oauth/access_token`
  - API endpoints used: `https://api.github.com/user`, `https://api.github.com/user/repos`, `https://api.github.com/repos/{owner}/{repo}/contents/{path}`
  - Auth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, then stored per-user GitHub access token in MongoDB profile documents (`server/index.ts`)
  - Scope requested: `repo` (`server/index.ts`)
- Pyodide CDN - Browser-side Python execution in the workspace
  - Integration method: dynamically loads `https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js` and uses matching `indexURL` (`src/pages/Workspace.tsx`)
- Google Fonts - Web font CSS import
  - Integration method: CSS `@import` from `https://fonts.googleapis.com` (`src/index.css`)

## Data Storage

**Databases:**
- MongoDB - Primary application datastore for projects, profiles, challenges, submissions, and Elo history
  - Connection: `MONGODB_URI` env var (`server/db.ts`)
  - Client: `mongodb` npm package ^7.2.0 (`package.json`)
  - Database name: `projectcode` (`server/db.ts`)
  - Collections observed: `profiles`, `projects`, `challenges`, `challenge_submissions`, `elo_changes` (`server/index.ts`, `scripts/seed-*.ts`)
  - Migrations: none found; runtime code creates the username index lazily in `ensureIndexes()` (`server/index.ts`)

**File Storage:**
- Supabase Storage - Avatar uploads, public company logos, and private challenge submission ZIP uploads
  - Frontend client: `@supabase/supabase-js` from `src/lib/supabase.ts`
  - Server admin client: `@supabase/supabase-js` with service key from `server/index.ts`
  - Auth/config: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Buckets: `avatars` hard-coded in `src/lib/avatarApi.ts`; `logos` default via `SUPABASE_LOGO_BUCKET`; `challenge-submissions` default via `SUPABASE_SUBMISSION_BUCKET`
  - Operations: avatar upload/delete/public URL, logo public URL generation, signed upload/download URLs for challenge ZIP files, ZIP removal (`src/lib/avatarApi.ts`, `server/index.ts`, `scripts/seed-challenges.ts`)

**Caching:**
- None found; no Redis or application cache service is configured

## Authentication & Identity

**Auth Provider:**
- Supabase Auth - Email/password sign-up, sign-in, sign-out, and session state
  - Implementation: `supabase.auth.signInWithPassword`, `supabase.auth.signUp`, `supabase.auth.getSession`, and `supabase.auth.onAuthStateChange` (`src/components/AuthModal.tsx`, `src/contexts/AuthContext.tsx`)
  - Token transport: Frontend attaches the Supabase access token as an `Authorization: Bearer ...` header for Express API requests (`src/lib/api.ts`)
  - Server verification: Express validates JWTs with `jsonwebtoken` and `jwks-rsa` against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json` (`server/auth.ts`)
  - Expected JWT settings: algorithms `ES256` and `RS256`, issuer `${SUPABASE_URL}/auth/v1`, audience `authenticated` (`server/auth.ts`)

**OAuth Integrations:**
- GitHub OAuth - Optional account connection for repository export
  - Credentials: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` (`server/index.ts`)
  - Callback route: `/api/auth/github/callback` (`server/index.ts`)
  - Token storage: access token stored on the user's MongoDB profile as `githubAccessToken` (`server/index.ts`)

## Monitoring & Observability

**Error Tracking:**
- None found; no Sentry, Datadog, or similar SDK is configured

**Analytics:**
- None found

**Logs:**
- Local stdout/stderr logging only in Express scripts and Flask backend (`server/index.ts`, `backend/app.py`, `scripts/seed-*.ts`)

## CI/CD & Deployment

**Hosting:**
- No deploy config was found for Vercel, Netlify, Docker, AWS, or similar platforms
- README links to a Google AI Studio app view and documents local startup only (`README.md`)

**CI Pipeline:**
- No `.github/workflows` directory or CI configuration was found

## Environment Configuration

**Development:**
- Required or behavior-changing env vars: `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `MONGODB_URI`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_LOGO_BUCKET`, `SUPABASE_SUBMISSION_BUCKET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `API_PORT`, `PORT`, `DISABLE_HMR`
- Secrets location: `.env*` at repo root; these files are gitignored (`.gitignore`) and README specifically mentions `.env.local`
- Local process layout: `npm run dev` for Vite, `npm run dev:server` for Express, `npm run dev:agent` or `py backend/app.py` for Flask (`package.json`, `start.sh`)

**Staging:**
- No staging-specific configuration was found

**Production:**
- No production secrets management or environment-specific deployment configuration was found

## Webhooks & Callbacks

**Incoming:**
- GitHub OAuth callback - `/api/auth/github/callback`
  - Verification: uses OAuth `code` exchange and `state` parameter as the user id (`server/index.ts`)
  - Events: browser redirect after GitHub authorization

**Outgoing:**
- GitHub repository export - Triggered by `POST /api/projects/:id/export`
  - Endpoint: GitHub create-repository and contents APIs (`server/index.ts`)
  - Retry logic: none found

---

*Integration audit: 2026-04-26*
*Update when adding/removing external services, env vars, storage buckets, or deployment targets*
