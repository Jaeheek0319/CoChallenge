# Technology Stack

**Analysis Date:** 2026-04-26

## Languages

**Primary:**
- TypeScript ~5.8.2 - All frontend (`src/**`) and Node API (`server/**`) code
- Python (3.x, unpinned) - AI agent backend (`backend/app.py`)

**Secondary:**
- TSX/JSX - React component files (`src/components/**`, `src/pages/**`)
- HTML - Application entry shell (`index.html`)
- CSS / Tailwind directives - Global styles (`src/index.css`)

## Runtime

**Environment:**
- Node.js (no `.nvmrc` or `engines` field; required only by `package.json` scripts and TS toolchain)
- Python (no version pin; invoked via `py backend/app.py` in `package.json`)
- Browser runtime (Vite dev server / static `dist/` build)

**Package Manager:**
- npm (lockfile: `package-lock.json` present)
- pip-style requirements for Python (`backend/requirements.txt`, no lockfile)

## Frameworks

**Core:**
- React 19.2.5 - UI framework (`src/main.tsx`, `src/App.tsx`)
- React Router DOM 7.14.2 - Client-side routing (`src/App.tsx` `<BrowserRouter>` with 7 routes)
- Express 4.22.1 - Node API server (`server/index.ts`)
- Flask (unpinned) + flask-cors - Python AI agent server (`backend/app.py`)
- Tailwind CSS 4.2.4 - Styling system, configured via `@tailwindcss/vite` (`vite.config.ts`)

**Testing:**
- Not detected (no test runner, test config, or test files in repo)

**Build/Dev:**
- Vite 6.4.2 - Frontend dev server / bundler (`vite.config.ts`)
- `@vitejs/plugin-react` 5.2.0 - React plugin
- `@tailwindcss/vite` 4.2.4 - Tailwind plugin
- `tsx` 4.21.0 - TypeScript execution for Express server (`npm run dev:server`)
- `tsc --noEmit` - Type-only check used as the `lint` script
- autoprefixer 10.5.0 - PostCSS prefixing

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` ^2.104.1 - Frontend auth + session client (`src/lib/supabase.ts`, `src/contexts/AuthContext.tsx`)
- `mongodb` ^7.2.0 - Native MongoDB driver used by Express API (`server/db.ts`, `server/index.ts`)
- `@google/genai` ^1.50.1 - Listed as a frontend dependency (no runtime imports detected in `src/`); the Python backend instead imports `google.genai` (`backend/app.py`) for Gemini calls
- `google-genai` (Python) - Gemini SDK used in `backend/app.py` (model id `gemma-4-26b-a4b-it`)
- `jsonwebtoken` ^9.0.3 + `jwks-rsa` ^4.0.1 - Verifies Supabase-issued JWTs in `server/auth.ts`
- `@monaco-editor/react` ^4.7.0 - In-browser code editor (`src/pages/Workspace.tsx`)
- `motion` ^12.38.0 - Animations via `motion/react` (used in `Home.tsx`, `Generation.tsx`, `Challenges.tsx`, `Dashboard.tsx`, `School.tsx`, `AuthModal.tsx`)
- `lucide-react` ^0.546.0 - Icon set used across pages and components

**Infrastructure:**
- `express` ^4.22.1 + `@types/express` ^4.17.25 - REST API host
- `dotenv` ^17.4.2 - Loads `.env` for the Express server (`server/index.ts` imports `'dotenv/config'`)
- `python-dotenv` - Loads `.env` for the Flask backend (`backend/app.py`)
- `flask-cors` - CORS middleware for the Flask agent
- `bcryptjs` ^3.0.3 - Listed in `package.json` but no runtime usage detected (auth is delegated to Supabase)
- `supabase` ^2.95.2 - Supabase CLI binary (dev tooling only)
- `clsx` ^2.1.1 + `tailwind-merge` ^3.5.0 - `cn()` helper in `src/lib/utils.ts`

## Configuration

**Environment:**
- Vite reads `.env` via `loadEnv(mode, '.', '')` and re-exposes `GEMINI_API_KEY` to the client bundle (`vite.config.ts` line 11)
- Frontend Supabase config via `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (`src/lib/supabase.ts`)
- Express server reads `MONGODB_URI`, `SUPABASE_URL`, and `PORT` from `process.env` (`server/db.ts`, `server/auth.ts`, `server/index.ts`)
- Flask backend reads `GEMINI_API_KEY` via `os.getenv` (`backend/app.py`)
- `.env*` files are git-ignored (`.gitignore` line 7); do not commit them
- `DISABLE_HMR` env flag disables Vite HMR (`vite.config.ts` line 21)

**Build:**
- `vite.config.ts` - React + Tailwind plugins, dev proxy `/api` → `http://localhost:3001`, alias `@/*` → repo root
- `tsconfig.json` - `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit: true`, `allowImportingTsExtensions: true`, path alias `@/*` → `./*`
- `index.html` - Vite entry; mounts `/src/main.tsx` into `#root`
- `metadata.json` - AI Studio app metadata (name, description, requested frame permissions)

## Platform Requirements

**Development:**
- Node.js (any recent LTS); install via `npm install`
- Python with `flask`, `flask-cors`, `google-genai`, `python-dotenv` (`backend/requirements.txt`)
- Three concurrent processes when running locally:
  - `npm run dev` - Vite on port 3000 (`--host=0.0.0.0`)
  - `npm run dev:server` - Express on port 3001 via `tsx watch server/index.ts`
  - `npm run dev:agent` - Flask on port 5000 via `py backend/app.py`
- Required env vars: `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `MONGODB_URI`

**Production:**
- Static frontend artifact from `vite build` (output `dist/`, cleaned via `npm run clean`)
- Hosting target not detected (no Dockerfile, `Procfile`, `vercel.json`, `netlify.toml`, or CI config in repo)
- README references AI Studio (`https://ai.studio/apps/1c6c17b8-8d9f-466d-976c-6a4554218031`) as the published surface

---

*Stack analysis: 2026-04-26*
