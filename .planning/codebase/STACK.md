# Technology Stack

**Analysis Date:** 2026-04-26

## Languages

**Primary:**
- TypeScript 5.8 - Frontend React app, Express API, and seed scripts (`src/`, `server/`, `scripts/`, `tsconfig.json`)
- TSX/React JSX - UI components and pages (`src/App.tsx`, `src/pages/`, `src/components/`)
- Python - AI generation backend and ADK probes (`backend/app.py`, `test_runner.py`, `check_adk.py`)

**Secondary:**
- CSS - Global Tailwind/CSS entrypoint (`src/index.css`)
- HTML - Vite entrypoint (`index.html`)
- JSON - Public test fixtures and app metadata (`public/test_data/`, `metadata.json`)
- Shell - Local multi-process startup helper (`start.sh`)

## Runtime

**Environment:**
- Browser runtime - Vite-built React single-page app (`src/main.tsx`)
- Node.js - Express API and TypeScript tooling; no `engines` field or `.nvmrc` pins a version (`package.json`)
- Python - Flask/Socket.IO AI backend; version is not pinned (`backend/requirements.txt`, `backend/app.py`)
- Local C/C++ compilers - `backend/app.py` invokes `gcc`/`g++` for terminal code execution over Socket.IO

**Package Manager:**
- npm - `package-lock.json` lockfile version 3 is present
- pip or compatible Python installer - Python dependencies are listed without pinned versions in `backend/requirements.txt`

## Frameworks

**Core:**
- React ^19.2.5 - SPA UI framework (`package.json`, `src/App.tsx`)
- React Router DOM ^7.14.2 - Client-side routing (`package.json`, `src/App.tsx`)
- Vite ^6.4.2 - Frontend dev server and production build (`package.json`, `vite.config.ts`)
- Tailwind CSS ^4.2.4 with `@tailwindcss/vite` ^4.2.4 - CSS pipeline (`package.json`, `vite.config.ts`, `src/index.css`)
- Express ^4.22.1 - Node API server (`package.json`, `server/index.ts`)
- Flask + Flask-CORS + Flask-SocketIO - Python AI and terminal backend (`backend/requirements.txt`, `backend/app.py`)

**Testing:**
- No formal JavaScript test runner is configured; `npm run lint` runs `tsc --noEmit` (`package.json`)
- `test_runner.py`, `check_adk.py`, and `check_adk_methods.py` are manual Google ADK probe scripts, not a test suite

**Build/Dev:**
- TypeScript compiler ~5.8.2 - Type checking with `noEmit` (`package.json`, `tsconfig.json`)
- tsx ^4.21.0 - Runs/watches TypeScript server and scripts (`package.json`, `scripts/seed-*.ts`)
- Vite React plugin ^5.2.0 - React transform (`package.json`, `vite.config.ts`)
- Vite dev proxy - `/api` proxies to `http://localhost:${API_PORT || PORT || 3001}` (`vite.config.ts`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.104.1 - Supabase Auth and Storage clients in both frontend and server (`src/lib/supabase.ts`, `server/index.ts`, `src/lib/avatarApi.ts`)
- `mongodb` ^7.2.0 - Primary application data access (`server/db.ts`, `server/index.ts`)
- `@google/genai` ^1.50.1 and Python `google-genai` - Gemini API access (`package.json`, `backend/requirements.txt`, `backend/app.py`)
- `google-adk` - Multi-agent project generation pipeline in Python backend (`backend/requirements.txt`, `backend/app.py`)
- `jsonwebtoken` ^9.0.3 and `jwks-rsa` ^4.0.1 - Supabase JWT verification in Express middleware (`server/auth.ts`)
- `socket.io-client` ^4.8.3, `flask-socketio`, `simple-websocket`, `xterm` ^5.3.0, `@xterm/addon-fit` ^0.11.0 - Interactive terminal bridge (`src/pages/Workspace.tsx`, `src/components/XTerm.tsx`, `backend/app.py`)
- `@monaco-editor/react` ^4.7.0 - In-browser editor (`package.json`, `src/pages/Workspace.tsx`)

**Infrastructure:**
- `dotenv` ^17.4.2 and Python `python-dotenv` - Load local `.env*` configuration (`server/index.ts`, `scripts/seed-*.ts`, `backend/app.py`)
- `bcryptjs` ^3.0.3 - Present in dependencies but no current import was found in source
- Supabase CLI package `supabase` ^2.95.2 - Listed in dependencies; no local Supabase config directory was found

## Configuration

**Environment:**
- `.env*` files are gitignored at the repository root (`.gitignore`)
- README documents setting `GEMINI_API_KEY` in `.env.local` (`README.md`)
- Frontend Supabase config uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (`src/lib/supabase.ts`)
- Vite exposes `GEMINI_API_KEY` as `process.env.GEMINI_API_KEY` in the client bundle and uses `API_PORT`, `PORT`, and `DISABLE_HMR` for dev behavior (`vite.config.ts`)
- Express reads `MONGODB_URI`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_LOGO_BUCKET`, `SUPABASE_SUBMISSION_BUCKET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `PORT` (`server/db.ts`, `server/auth.ts`, `server/index.ts`)
- Flask reads `GEMINI_API_KEY` via `python-dotenv`/`os.getenv` (`backend/app.py`)

**Build:**
- `vite.config.ts` - React/Tailwind plugins, path alias `@`, `/api` proxy, HMR toggle, Gemini env define
- `tsconfig.json` - ES2022 target, bundler module resolution, React JSX, `@/*` path alias, `allowJs`, `noEmit`
- `package.json` scripts - `dev`, `dev:server`, `dev:agent`, `build`, `preview`, `clean`, `lint`
- `backend/requirements.txt` - Python backend dependencies without version pins

## Platform Requirements

**Development:**
- Node.js and npm for the Vite SPA and Express server
- Python environment with `backend/requirements.txt` installed for the AI/terminal backend
- MongoDB reachable through `MONGODB_URI`
- Supabase project for auth/storage features
- Gemini API key for AI generation and tutoring
- `gcc`/`g++` available locally for C/C++ terminal execution (`backend/app.py`)
- Typical local ports: Vite `3000`, Express `3001`, Flask/Socket.IO `5000` (`package.json`, `server/index.ts`, `backend/app.py`)

**Production:**
- No production deployment config, Dockerfile, or CI workflow was found
- README references Google AI Studio as an app host/viewer (`README.md`)
- Deploying the complete app requires hosting a static Vite frontend plus two backend services: Express API and Flask/Socket.IO AI backend
- `src/services/gemini.ts` and `src/pages/Workspace.tsx` hard-code the Flask backend at localhost, so non-local deployment requires configuration changes

---

*Stack analysis: 2026-04-26*
*Update after major dependency, runtime, or deployment changes*
