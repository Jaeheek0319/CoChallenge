---
title: Architecture
focus: arch
last_updated: 2026-04-26
---

# Architecture

**Analysis Date:** 2026-04-26

## System Overview

```text
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (Vite SPA)                           │
│  Pages `src/pages` · Components `src/components`                      │
│  Contexts `src/contexts` · Hooks `src/hooks`                          │
│                ↓                                                      │
│  Service / Lib: `src/services/gemini.ts`, `src/lib/api.ts`,           │
│                 `src/lib/supabase.ts`, `src/lib/utils.ts`             │
└─────────────────────────────┬─────────────────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌──────────────────┐ ┌────────────────┐ ┌──────────────────┐
│ Express API      │ │ Flask AI       │ │ Supabase Auth     │
│ port 3001        │ │ port 5000      │ │ (hosted, JWKS)    │
│ `server/index.ts`│ │ `backend/app.py│ │ `lib/supabase.ts` │
└────────┬─────────┘ └────────┬───────┘ └─────────┬────────┘
         ▼                    ▼                   ▼
   MongoDB                Google Gemini      Supabase user
   (`projectcode`)        (`gemma-4-26b…`)   session/JWT
   `server/db.ts`         `google.genai`
```

The browser SPA is the only client. It fans out to three independent backends: an Express/TS API for project persistence, a Python/Flask service for Gemini-backed generation/help/grading, and Supabase Auth for identity. The two backends do not call each other.

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Vite SPA bootstrap | Mount React, install providers, import global CSS | `src/main.tsx` |
| App shell / router | Top nav, auth modal, route table | `src/App.tsx` |
| AuthProvider | Track Supabase session, expose `useAuth` | `src/contexts/AuthContext.tsx` |
| ProjectProvider | Hydrate from `localStorage` + API, persist saves | `src/contexts/ProjectContext.tsx` |
| `useProjects` | Re-export of `useProjectContext` | `src/hooks/useProjects.ts` |
| Auth fetch wrapper | Inject `Authorization: Bearer <jwt>` | `src/lib/api.ts` |
| Supabase client | Browser singleton | `src/lib/supabase.ts` |
| Gemini client (frontend) | POST to Flask AI endpoints | `src/services/gemini.ts` |
| Express API | CRUD on `projects` collection | `server/index.ts` |
| Auth middleware | Verify Supabase JWT via JWKS | `server/auth.ts` |
| Mongo connector | Lazy-cached `MongoClient` | `server/db.ts` |
| Flask AI service | generate / help / grade | `backend/app.py` |
| Workspace IDE | Monaco editor + iframe preview + AI tutor | `src/pages/Workspace.tsx` |
| Generation page | Prompt → Flask → save → navigate | `src/pages/Generation.tsx` |
| Dashboard page | List + sort `UserProject[]` | `src/pages/Dashboard.tsx` |
| AuthModal | Email/password login + signup | `src/components/AuthModal.tsx` |
| ProjectDial | SVG semicircle stats by difficulty | `src/components/ProjectDial.tsx` |

## Pattern Overview

**Overall:** SPA (React 19 + Vite) with two purpose-split backends behind a Vite dev proxy.

**Key Characteristics:**
- React Context is the only state-management primitive (`AuthContext`, `ProjectContext`); no Redux/Zustand/Query.
- Persistence and AI are separate runtimes: Node+Mongo (Express) vs Python+Gemini (Flask). They share no schema or RPC.
- Auth is centralized at Supabase. Both the SPA and Express verify the same JWT via JWKS.
- Projects are dual-written: every save lands in `localStorage['project-code-projects']` *and* (when signed in) `PUT /api/projects/:id`. Local cache is also the offline/anonymous store.
- All shared shapes live in `src/types.ts` (`Language`, `Difficulty`, `ProjectFile`, `LessonStep`, `GeneratedProject`, `UserProject`).
- Vite proxies `/api → http://localhost:3001` (`vite.config.ts:22-24`); the Flask service is reached directly at hard-coded `http://localhost:5000` in `src/services/gemini.ts:3`.

## Layers

**Presentation** (`src/pages/`, `src/components/`):
- React function components, Tailwind v4 classes, Framer Motion (`motion`).
- Depends on contexts, hooks, services, lib.

**State** (`src/contexts/`, `src/hooks/`):
- Cross-cutting state — auth session and project list.
- Depends on `lib/supabase`, `lib/api`, `types`.

**Service layer** (`src/services/`, `src/lib/`):
- All network I/O lives here. `gemini.ts` (Flask AI), `api.ts` (Express + bearer), `supabase.ts` (Supabase JS).

**Express tier** (`server/`):
- `index.ts` routes, `auth.ts` JWT, `db.ts` Mongo singleton.

**Flask tier** (`backend/`):
- `app.py` — three POST handlers wrapping `genai.Client`.

## Data Flow

**Generate a project:**
1. `handleGenerate` in `src/pages/Generation.tsx:30` collects prompt/language/difficulty.
2. `generateProject(...)` → POST `http://localhost:5000/api/generateProject` (`src/services/gemini.ts:5`).
3. Flask handler at `backend/app.py:21` calls `client.models.generate_content(model=MODEL_ID, ...)`, strips Markdown fences, parses JSON, attaches a 7-char `id`/`language`/`difficulty`, returns the body.
4. `saveProject({...project, currentStep: 0})` (`src/contexts/ProjectContext.tsx:51`):
   - mutates in-memory list,
   - mirrors to `localStorage['project-code-projects']`,
   - if `user`, `PUT /api/projects/:id` via `src/lib/api.ts`.
5. Express upserts into `db.collection<ProjectDoc>('projects')` keyed on `_id` + `userId` (`server/index.ts:69-71`).
6. `navigate('/workspace/:id')` opens `src/pages/Workspace.tsx`.

**Workspace IDE / AI tutor:**
1. `Workspace` reads `projectId` and finds it in `projects` (`src/pages/Workspace.tsx:36-60`).
2. Editing uses `@monaco-editor/react`; `handleRun` builds an inline HTML/CSS/JS doc and renders via `URL.createObjectURL(blob)` into an `<iframe>` (`src/pages/Workspace.tsx:63-86`).
3. AI calls hit Flask: `getAIHelp` → `POST /api/getAIHelp` (`backend/app.py:101`); `checkStepCompletion` → `POST /api/checkStepCompletion` (`backend/app.py:131`).
4. `handleNextStep` saves `currentStep` through `saveProject`.

**Auth:**
1. `AuthModal` calls `supabase.auth.signInWithPassword`/`signUp` (`src/components/AuthModal.tsx:30-32`).
2. `AuthProvider` listens via `supabase.auth.onAuthStateChange` and republishes `user` (`src/contexts/AuthContext.tsx:21-35`).
3. `authHeaders()` adds `Authorization: Bearer <access_token>` to every Express request (`src/lib/api.ts:3-7`).
4. Express `requireAuth` fetches `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, verifies (`ES256`/`RS256`, audience `authenticated`), and sets `req.userId = decoded.sub` (`server/auth.ts:33-58`).

**State management:** Auth via Context + Supabase listener. Projects via Context with optimistic local update + `localStorage` mirror + remote PUT. Workspace transient state (files, current step, chat history, preview URL) is local component state.

## Key Abstractions

- **`UserProject`** (`src/types.ts:30`): Canonical lesson document. Same shape stored in Mongo (`ProjectDoc` at `server/index.ts:9-21`, `_id` ↔ `id`) and in `localStorage`.
- **`LessonStep`** (`src/types.ts:10-17`): Step content with optional `starterCode: { [fileName: string]: string }` overlay applied on entry/advance in `Workspace.tsx:46-53` and `:101-110`.
- **`api` helper** (`src/lib/api.ts:27-31`): `api.get<T>(path)`, `api.put<T>(path, body)`, `api.delete<T>(path)` — all routed through `request<T>` which injects the bearer token and handles 204/JSON.
- **`requireAuth`** (`server/auth.ts:33-58`): Single chokepoint that promotes `req.userId` from a JWKS-verified JWT.

## Entry Points

- **Vite SPA** (`npm run dev`): `index.html` → `src/main.tsx` → `src/App.tsx`. Script: `vite --port=3000 --host=0.0.0.0` (`package.json:7`).
- **Express API** (`npm run dev:server`): `server/index.ts`. Script: `tsx watch server/index.ts` (`package.json:8`); listens on `process.env.PORT || 3001`.
- **Flask AI** (`npm run dev:agent`): `backend/app.py`. Script: `py backend/app.py` (`package.json:9`); `app.run(debug=True, port=5000)` at `backend/app.py:188`.
- **Build / preview:** `npm run build` (`vite build`), `npm run preview` (`vite preview`), `npm run lint` (`tsc --noEmit`). No ESLint configured.

## Architectural Constraints

- **Threading:** Single-threaded event loops in all three runtimes. Flask runs `debug=True` (Werkzeug dev server) — not WSGI-served.
- **Global state:** `server/db.ts` caches a process-wide `MongoClient`/`Db`. `backend/app.py` instantiates `genai.Client` at module load. Both are fine for one process; not fork-safe.
- **Required env:** Express needs `MONGODB_URI` (`server/db.ts:8`) and `SUPABASE_URL` (`server/auth.ts:13`). Flask needs `GEMINI_API_KEY` (`backend/app.py:16`). SPA needs `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` (`src/lib/supabase.ts:3-4`). All read at module load. `.env*` is gitignored; `.env.local` is the documented location (`README.md`).
- **Hard-coded port:** `BACKEND_URL = "http://localhost:5000/api"` in `src/services/gemini.ts:3` is not behind the Vite proxy and is not env-configurable.
- **No CORS on Express:** Only Flask enables `CORS(app)` (`backend/app.py:12`); Express relies on the Vite `/api` dev proxy to be same-origin.
- **Hard-coded DB name:** `'projectcode'` (`server/db.ts:12`).
- **Hard-coded model:** `MODEL_ID = "gemma-4-26b-a4b-it"` (`backend/app.py:19`).
- **Circular imports:** None observed.

## Anti-Patterns

- **Stateful module-level Gemini client with `debug=True`** — `backend/app.py:16` & `:188`. Hot-reload re-instantiates the client; debug exposes Werkzeug debugger if ever bound off-loopback. Lazy-init behind a getter and gate debug on env, mirroring `server/db.ts:6-13`.
- **Hard-coded backend URL in SPA** — `src/services/gemini.ts:3`. Cannot deploy without code edits and bypasses the Vite proxy. Use `import.meta.env.VITE_AI_BACKEND_URL` and add an `/ai` proxy entry alongside `/api` in `vite.config.ts:22-24`.
- **Dual-write without conflict resolution** — `src/contexts/ProjectContext.tsx:51-71` writes local then remote; on load it prefers remote but silently falls back to local on API error. No `updatedAt` comparison server-side. Compare timestamps before overwriting and scope local cache by `userId`, clearing on sign-out.
- **Step `starterCode` clobbers unsaved edits** — `src/pages/Workspace.tsx:101-110`. Advancing into a step whose `starterCode` keys match a filename overwrites in-progress code. Snapshot user files before overlay, or prompt before overwriting.
- **Random 7-char `_id` collision risk** — `backend/app.py:91` and `src/pages/Generation.tsx:42`. Mongo upsert in `server/index.ts:69-71` matches on `_id` + `userId`; same-user collisions silently clobber. Use `crypto.randomUUID()` server-side.
- **Silent failure masquerading as a graded result** — `backend/app.py:181-185` returns `200 {isComplete: false, feedback: "Failed to evaluate..."}` on Gemini exceptions. Differentiate evaluator failure from "task not complete" with a non-200 status or distinct field.

## Error Handling

**Strategy:** try/except on Python, try/catch on TS; surface `console.error` and `alert()` to the user.

**Patterns:**
- Frontend services throw `${method} ${path} → ${status} ${detail}` on non-OK (`src/lib/api.ts:19-22`).
- `Generation.handleGenerate` catches and `alert(error.message)` (`src/pages/Generation.tsx:50-51`).
- `Workspace.handleAIHelp` swallows and pushes a generic apology into chat (`src/pages/Workspace.tsx:136-138`).
- Express handlers wrap each route in try/catch returning `500 { error, detail: String(err) }` (e.g. `server/index.ts:46-48`).

## Cross-Cutting Concerns

- **Logging:** `console.log`/`console.error` everywhere; Express logs `API listening on http://localhost:${port}` once (`server/index.ts:93`). No structured logger.
- **Validation:** Minimal — Flask checks for missing fields with `if not all([...])`; Express trusts the body and applies `?? defaults` (`server/index.ts:55-67`).
- **Auth:** Supabase JWT issued in browser, verified in Express via JWKS. **Flask is unauthenticated** — `/api/generateProject`, `/api/getAIHelp`, `/api/checkStepCompletion` are open.
- **Styling:** Tailwind v4 via `@tailwindcss/vite` (`vite.config.ts:9`); shared utilities (`glass-panel`, `custom-scrollbar`, `glow-blue`, `animated-hero-bg`) defined in `src/index.css`. `cn()` helper at `src/lib/utils.ts:4`.
- **Animation:** `motion` (Framer Motion successor) used on hero, modal, dashboard, generation page.
- **Routing:** `react-router-dom` v7 with `BrowserRouter` (`src/App.tsx:36`).

*Architecture analysis: 2026-04-26*
