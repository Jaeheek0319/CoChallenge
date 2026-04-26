---
title: Structure
focus: arch
last_updated: 2026-04-26
---

# Codebase Structure

**Analysis Date:** 2026-04-26

## Directory Layout

```
gwangju/
├── .context/                       # Empty scratch notes (notes.md, todos.md)
├── .planning/
│   └── codebase/                   # GSD codebase docs
├── backend/                        # Python Flask AI service
│   ├── app.py                      # All Gemini-backed endpoints
│   └── requirements.txt            # flask, flask-cors, google-genai, python-dotenv
├── public/
│   └── test_data/
│       └── project.json            # Sample GeneratedProject for offline dev
├── server/                         # Node + TypeScript Express API
│   ├── auth.ts                     # Supabase JWT verification middleware
│   ├── db.ts                       # MongoClient singleton
│   └── index.ts                    # /api/health, /api/me, /api/projects[/:id]
├── src/                            # React + Vite SPA
│   ├── App.tsx                     # Router + nav + auth modal
│   ├── components/
│   │   ├── AuthModal.tsx
│   │   └── ProjectDial.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ProjectContext.tsx
│   ├── hooks/
│   │   └── useProjects.ts
│   ├── index.css                   # Tailwind base + custom utilities
│   ├── lib/
│   │   ├── api.ts                  # Authed fetch wrapper for Express
│   │   ├── supabase.ts             # Browser Supabase client
│   │   └── utils.ts                # cn helper
│   ├── main.tsx                    # createRoot + provider tree
│   ├── pages/
│   │   ├── Challenges.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Generation.tsx
│   │   ├── Home.tsx
│   │   ├── Profile.tsx
│   │   ├── School.tsx
│   │   └── Workspace.tsx
│   ├── services/
│   │   └── gemini.ts               # Frontend client for Flask AI
│   └── types.ts                    # Shared TS types
├── .gitignore                      # node_modules, build, dist, .env*, /.venv
├── README.md
├── index.html                      # Vite HTML entry
├── metadata.json                   # AI Studio app manifest
├── package.json
├── package-lock.json
├── tsconfig.json                   # ES2022, bundler resolution, @/* alias
└── vite.config.ts                  # React + Tailwind, /api proxy → :3001
```

## Directory Purposes

- **`backend/`** — Flask service wrapping Gemini for generation/help/grading. Key file: `backend/app.py`.
- **`server/`** — Express API owning the MongoDB `projects` collection and verifying Supabase JWTs. Key files: `server/index.ts`, `server/auth.ts`, `server/db.ts`.
- **`src/`** — All browser code (Vite app root). Key files: `src/main.tsx`, `src/App.tsx`, `src/types.ts`.
- **`src/pages/`** — One file per top-level route from `src/App.tsx`. Heavy pages (`Workspace.tsx`, `Generation.tsx`) keep state local.
- **`src/components/`** — Reusable UI fragments shared across pages (`AuthModal.tsx`, `ProjectDial.tsx`). Not a design-system folder.
- **`src/contexts/`** — Cross-page state. Each file exports both the `Provider` and a `useXxx` hook.
- **`src/hooks/`** — Custom hooks. Currently only `useProjects.ts` (thin wrapper).
- **`src/lib/`** — External SDK clients and pure utilities (`supabase.ts`, `api.ts`, `utils.ts`).
- **`src/services/`** — Domain-specific HTTP clients; `gemini.ts` maps 1:1 to Flask endpoints.
- **`public/`** — Static assets served at the site root. Contains `test_data/project.json` used when "Use test data" is checked (`src/pages/Generation.tsx:36-44`). Committed.
- **`.context/`** — Free-form notes; currently empty. Committed.
- **`.planning/codebase/`** — Output of GSD codebase mapping. Committed.

## Key File Locations

**Entry Points:**
- `index.html` — HTML shell; loads `/src/main.tsx`.
- `src/main.tsx` — React root; wraps `<App />` in `StrictMode` + `AuthProvider`.
- `src/App.tsx` — `BrowserRouter` + `ProjectProvider`; defines all routes; renders nav and `<AuthModal>`.
- `server/index.ts` — Express app + `app.listen(PORT || 3001)`.
- `backend/app.py` — Flask app + `app.run(debug=True, port=5000)`.

**Configuration:**
- `package.json` — Scripts (`dev`, `dev:server`, `dev:agent`, `build`, `preview`, `clean`, `lint`) and deps.
- `tsconfig.json` — TS compiler options; `@/*` path alias resolves to repo root.
- `vite.config.ts` — React + Tailwind plugins; `/api → http://localhost:3001` proxy; `process.env.GEMINI_API_KEY` define; `@` alias.
- `metadata.json` — AI Studio app descriptor.
- `.env.local` (gitignored via `.env*`) — expected to hold `GEMINI_API_KEY`, `MONGODB_URI`, `SUPABASE_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.

**Core Logic:**
- `src/types.ts` — Source of truth for project/lesson types.
- `src/contexts/ProjectContext.tsx` — Project save/load orchestration (local + remote).
- `src/contexts/AuthContext.tsx` — Auth session lifecycle.
- `src/services/gemini.ts` — All AI calls.
- `src/lib/api.ts` — All authed Express calls.
- `server/index.ts` — Project CRUD endpoints.
- `server/auth.ts` — JWT verification.
- `backend/app.py` — Gemini prompt templates + three POST handlers.

**Testing:** None. No `*.test.*`, no Jest/Vitest config, no `tests/` directory.

## Naming Conventions

**Files:**
- React components/pages: `PascalCase.tsx` (`Home.tsx`, `AuthModal.tsx`, `Workspace.tsx`).
- Non-component TS modules: `camelCase.ts` (`api.ts`, `supabase.ts`, `utils.ts`, `useProjects.ts`, `gemini.ts`, `types.ts`).
- Context files: `<Name>Context.tsx` (`AuthContext.tsx`, `ProjectContext.tsx`).
- Server TS files: `lowercase.ts` (`index.ts`, `auth.ts`, `db.ts`).
- Python: `snake_case.py` (`app.py`).

**Directories:** All-lowercase, no separators (`pages`, `components`, `contexts`, `hooks`, `lib`, `services`, `server`, `backend`, `public`).

**Symbols:**
- Components/types: `PascalCase` (`AuthProvider`, `LessonStep`, `UserProject`).
- Functions/variables: `camelCase` (`saveProject`, `handleGenerate`, `getKey`).
- Constants/route-data arrays: `SCREAMING_SNAKE_CASE` (`FEATURED_CHALLENGES`, `COMMUNITY_CHALLENGES`, `PRESET_PROJECTS`, `MODEL_ID`, `BACKEND_URL`).
- Hooks: `useXxx` (`useAuth`, `useProjects`, `useProjectContext`).

**Routes** (`src/App.tsx:151-158`): `/`, `/workspace/:projectId`, `/dashboard`, `/generation`, `/challenges`, `/school`, `/profile`.

**API paths:** All under `/api/...`, camelCase action names: `/api/health`, `/api/me`, `/api/projects`, `/api/projects/:id`, `/api/generateProject`, `/api/getAIHelp`, `/api/checkStepCompletion`.

## Where to Add New Code

- **New page (route):** `src/pages/<Name>.tsx` as a named export. Wire by importing in `src/App.tsx` and adding `<Route path="..." element={<Name />} />` inside `<Routes>` (`src/App.tsx:150-158`); add a `<Link>` in the nav block (`src/App.tsx:52-69`) if user-visible.
- **New shared UI component:** `src/components/<Name>.tsx` as a named export. Use `cn(...)` from `src/lib/utils.ts` for conditional classes.
- **New cross-page state:** `src/contexts/<Name>Context.tsx` exporting `<Name>Provider` and `use<Name>Context`. Wrap in the provider tree (note: providers needing `useNavigate` must be inside `<BrowserRouter>` like `ProjectProvider` is in `src/App.tsx:37`).
- **New hook:** `src/hooks/use<Name>.ts`. If it just re-exports a context hook, follow `useProjects.ts`.
- **New Express endpoint:** Add to `server/index.ts`. Use `requireAuth` from `server/auth.ts` for user-scoped routes; use `getDb()` from `server/db.ts`. `express.json` is mounted at `server/index.ts:7`.
- **New Flask endpoint:** Add `@app.route('/api/...', methods=['POST'])` in `backend/app.py`. Reuse the `client.models.generate_content(model=MODEL_ID, ...)` pattern and the inline JSON-fence stripper (`backend/app.py:75-84`, `:168-177`).
- **New AI call from SPA:** Add a function to `src/services/gemini.ts` that POSTs to `${BACKEND_URL}/<endpoint>` and returns a typed result. Don't put `fetch` calls in components.
- **New authed Express call from SPA:** Use `api.get/put/delete` from `src/lib/api.ts`. Manual `fetch` won't include the bearer token.
- **New persisted field on a project:** (1) update types in `src/types.ts`; (2) update `ProjectDoc` in `server/index.ts:9-21` and the upsert body at `server/index.ts:55-67`; (3) update Flask response shape in `backend/app.py:34-54` if it originates at generation.
- **New utility:** Pure helpers → `src/lib/<name>.ts`. Domain-specific HTTP → `src/services/<name>.ts`.
- **New static asset:** Drop into `public/`; reference with a root-relative path (`/test_data/project.json`).
- **Tests:** No framework configured. If introducing one, place tests next to source as `*.test.ts(x)` and add the runner to `package.json` scripts.

## Special Directories

- **`public/`** — Static assets served verbatim by Vite. Generated: No. Committed: Yes.
- **`dist/`** — Vite build output. Generated: Yes (`npm run build`). Committed: No.
- **`node_modules/`** — npm deps. Generated: Yes. Committed: No.
- **`.venv/`** — Optional Python virtualenv for `backend/`. Generated: Yes. Committed: No.
- **`.context/`** — Free-form notes. Committed (currently empty).
- **`.planning/`** — GSD planning + codebase docs. Generated by GSD commands. Committed.

*Structure analysis: 2026-04-26*
