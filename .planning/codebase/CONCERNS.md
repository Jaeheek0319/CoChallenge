---
title: Concerns
focus: concerns
last_updated: 2026-04-26
scope: full repo
---

# Codebase Concerns

## Tech Debt

- **Split-brain dual backend.** Flask AI server on `localhost:5000` (`backend/app.py:1-188`) and Express persistence server on `localhost:3001` (`server/index.ts:91-94`) both expose `/api/*`. Frontend hardcodes `http://localhost:5000/api` in `src/services/gemini.ts:3` while using a Vite proxy `/api → 3001` (`vite.config.ts:23`) for everything else. Auth is enforced only on Express; Flask is wide-open with `CORS(app)` (`backend/app.py:12`).
- **Hardcoded backend URL bypasses Vite proxy.** `src/services/gemini.ts:3` (`BACKEND_URL = "http://localhost:5000/api"`) breaks any non-localhost deploy. No env-var override.
- **Phantom dependencies.** `package.json:16` (`@google/genai`), `:21` (`bcryptjs`), `:33` (`supabase` CLI) declared but unused in source. Auth is Supabase-JWT only (`server/auth.ts`); Gemini is called from Python.
- **Empty tracked planning files:** `.context/notes.md` and `.context/todos.md` are 0 bytes.
- **Cross-user data leak risk in localStorage cache.** `src/contexts/ProjectContext.tsx:24-71` reads/writes `localStorage['project-code-projects']` regardless of auth state and falls back to local data on API failure for signed-in users. No clearing on `signOut` (`src/contexts/AuthContext.tsx:37-39`).

## Known Bugs

- **Stale `files` written on Next Step.** `src/pages/Workspace.tsx:95-114` calls `setFiles(newFiles)` then `saveProject({ ..., files })` synchronously — `files` is the pre-update array, so the persisted project keeps the old step's content.
- **In-place file mutation in editor.** `src/pages/Workspace.tsx:90-92` does `const newFiles = [...files]; newFiles[activeFileIndex].content = value;` — the inner object reference is shared; the previous `files` state is mutated too, defeating change detection in StrictMode.
- **`ProjectDial` off-by-one "completed" count.** `src/components/ProjectDial.tsx:11` and `src/pages/Dashboard.tsx:25` treat a project as completed when `currentStep === steps.length - 1` (when the user *opens* the last step, not finishes it).
- **Wrong/invalid Gemini model id.** `backend/app.py:19` hardcodes `MODEL_ID = "gemma-4-26b-a4b-it"`, which is not a real Google GenAI model — every AI call (`/api/generateProject`, `/api/getAIHelp`, `/api/checkStepCompletion`) will fail at the API.
- **"Start Project" CTAs route to `/` instead of `/generation`.** `src/pages/School.tsx:125`, `src/pages/Challenges.tsx:208,258` call `navigate('/', { state: { presetPrompt } })`. The state-consuming logic is in `src/pages/Generation.tsx:20`, so the user lands on the marketing home page and the prompt is dropped.
- **Guest → signed-in project migration missing.** `src/contexts/ProjectContext.tsx:34-44` overwrites `projects` with `remoteProjects` on sign-in; locally generated guest projects are never PUT to the API.

## Security

- **Public unauthenticated AI endpoints.** `backend/app.py:21-185` has no auth and `CORS(app)` is allow-all (`:12`). Anyone reaching the host spends `GEMINI_API_KEY` budget.
- **Flask `debug=True` in entrypoint.** `backend/app.py:188`. Werkzeug debug exposes a PIN-protected RCE shell and reloader.
- **Silent Supabase placeholder fallback.** `src/lib/supabase.ts:11-13` falls back to `'https://placeholder.supabase.co'` and `'placeholder'` keys. The app boots, then auth fails confusingly at runtime. Only a `console.warn` mitigates.
- **Unvalidated Mongo upsert body.** `server/index.ts:51-76` (PUT `/api/projects/:id`) trusts request body shape, has only a 2MB body cap (`:7`), no `zod`/schema check, no bounds on `currentStep` or array sizes.
- **No CORS allowlist or Helmet on Express.** `server/index.ts:1-94` lacks CORS allowlist and security headers; relies on bearer JWT only.
- **iframe preview runs user code in same origin.** `src/pages/Workspace.tsx:70-86,325-329` builds a blob URL and renders it without `sandbox=`. User scripts can `window.parent.localStorage` and read Supabase tokens.
- **Predictable short project IDs.** `backend/app.py:89-92` uses `random.choices(...)` k=7; `src/pages/Generation.tsx:41` uses `Math.random().toString(36).substring(7)`. Used as Mongo `_id` (`server/index.ts:71`). Not cryptographic, collision-prone at scale; cross-user overwrite blocked only by the `userId` filter on `replaceOne`.
- **Server error `detail` leaked to UI.** `server/index.ts:33,47,74,87` return `{ error, detail: String(err) }`; `src/pages/Generation.tsx:51` `alert()`s raw error messages.

## Performance

- **Unindexed full-collection scan on dashboard load.** `server/index.ts:37-49` does `find({ userId }).toArray()` returning full `files`/`steps` payloads with no projection or pagination.
- **No editor debounce.** `src/pages/Workspace.tsx:88-93` rewrites the entire `files` array per keystroke; combined with Monaco's `automaticLayout: true` and StrictMode double-render.
- **No Mongo reconnect strategy.** `server/db.ts:6-14` is a bare singleton; `db.command({ ping: 1 })` (`server/index.ts:30`) throws without retry.
- **Single-threaded Flask dev server blocks on AI calls.** `backend/app.py:188` (`app.run(debug=True)`).

## Fragile Areas

- **`Workspace.tsx` god component.** `src/pages/Workspace.tsx` is 401 lines with 11 `useState`s spanning load/save, file edit, step nav, AI chat, step-check, preview blob, and layout.
- **Auth/Project loading race.** `src/contexts/AuthContext.tsx:21-35` and `src/contexts/ProjectContext.tsx:20-49` interleave `loading` flags so local-cache projects flash before remote replaces them.
- **Animated typing demo races user input.** `src/pages/Generation.tsx:20,57-85` shares the `prompt` state between user `onChange` and the typewriter loop, with `animationPaused` ref + `isPromptAnimationActive` state — paste/blur during animation leaves half-typed input.
- **`saveProject` insertion order vs Dashboard sort.** `src/contexts/ProjectContext.tsx:54-57` appends; `src/pages/Dashboard.tsx:68` re-sorts each render.

## Scaling Limits

- **No Mongo indexes.** Queries on `userId` and `{ _id, userId }` will collection-scan past ~10k projects; recommend `{ userId: 1, updatedAt: -1 }`.
- **No rate limiting** on Flask or Express; a single authed user can drain Gemini quota or fill Mongo.
- **localStorage ~5MB cap.** `src/contexts/ProjectContext.tsx:62` JSON-stringifies all projects every save; ~25-100 generated projects fills it.

## Dependencies at Risk

- **`mongodb ^7.2.0`** in `package.json:28` — driver's current major is 6.x; either npm resolved a different version or install fails. Pin to `^6.x`.
- **`@vitejs/plugin-react ^5.2.0`** placed in `dependencies` (`package.json:18`) instead of `devDependencies`.
- **`bcryptjs` and `jsonwebtoken`** unused for local password storage; auth is fully delegated to Supabase. Remove `bcryptjs`.

## Missing Critical Features

- **No delete UI.** `server/index.ts:78-89` exposes `DELETE /api/projects/:id` and `src/lib/api.ts:30` declares `api.delete`; nothing in the frontend calls them.
- **No `ErrorBoundary`.** A malformed AI project crashes the whole app (no boundary around `<Routes>` at `src/App.tsx:150-158`).
- **No env validation at startup** — both servers fail lazily when `GEMINI_API_KEY`/`MONGODB_URI`/`SUPABASE_URL` are missing.
- **Dead CTAs.** `src/pages/Challenges.tsx:274` ("Submit Challenge"), `src/pages/School.tsx:140` ("Join the Beta") have no `onClick`.
- **Profile page is read-only.** `src/pages/Profile.tsx:11-46` shows email-derived username; no edit, avatar, or sign out.
- **Python option disabled.** `src/pages/Generation.tsx:173` (`<option value="python" disabled>`).

## Test Coverage Gaps

- **Zero automated tests.** No `*.test.*` / `*.spec.*` files, no `vitest.config.*` / `jest.config.*`. `npm run lint` is just `tsc --noEmit` (`package.json:13`). Priority: **High**.
- **Auth flow untested.** `src/components/AuthModal.tsx`, `server/auth.ts`, `src/contexts/AuthContext.tsx`. Priority: **High**.
- **AI response parsing untested.** Markdown-stripping in `backend/app.py:76-84,168-176`. Priority: **High**.
- **No project save/load roundtrip integration test.** `src/contexts/ProjectContext.tsx`, `server/index.ts`. Priority: **Medium**.
- **No e2e for preview iframe.** `src/pages/Workspace.tsx:63-86`. Priority: **Medium**.
