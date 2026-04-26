---
title: Testing
focus: quality
last_updated: 2026-04-26
---

# Testing

## Test Framework

**None.** The repository contains zero automated tests.

- No `jest.config.*`, `vitest.config.*`, `playwright.config.*`, `cypress.config.*`, `pytest.ini`, or `tox.ini` is committed.
- `package.json` has no `test` script. Its `"lint": "tsc --noEmit"` (line 13) is a TypeScript type check, not a test runner.
- `backend/requirements.txt` lists only `flask`, `flask-cors`, `google-genai`, `python-dotenv` — no Python test dependencies.

## Run Commands

No test command exists. Available scripts (from `package.json`):

- `npm run dev` — Vite dev server on port 3000
- `npm run dev:server` — Express API on port 3001 via `tsx watch server/index.ts`
- `npm run dev:agent` — Flask backend on port 5000 (`py backend/app.py`)
- `npm run build` / `npm run preview` / `npm run clean`
- `npm run lint` — `tsc --noEmit` (type check only)

## Test File Organization

A search for `*.test.*`, `*.spec.*`, `test_*.py`, `__tests__/`, `tests/`, and `test/` under `src/`, `server/`, `backend/`, and the repo root returns **zero matches**.

The only "test"-named directory is `public/test_data/` containing `project.json`, which is a **runtime** fixture loaded by `src/pages/Generation.tsx:36-44` when the user toggles "Use test data" — not a test asset.

## Mocking

None today. Boundaries that will need mocking once tests are added:

- `fetch` calls to `/api/*` and `http://localhost:5000/api/*` (`src/lib/api.ts:14`, `src/services/gemini.ts:8,28,51`)
- Supabase client (`src/lib/supabase.ts:10`) and `supabase.auth.*` methods (`src/contexts/AuthContext.tsx`, `src/components/AuthModal.tsx`)
- `localStorage` interactions (`src/contexts/ProjectContext.tsx:24,59,62`)
- MongoDB client (`server/db.ts` — mock `getDb()`)
- JWT / JWKS verification (`server/auth.ts` — mock `jwt.verify` or `jwks-rsa`)
- `google.genai.Client.models.generate_content` (`backend/app.py:17,66,122,159`)

## Fixtures

- Runtime-only: `public/test_data/project.json` conforms to `GeneratedProject` in `src/types.ts:19-28`.
- No `tests/fixtures/`, `__fixtures__/`, or factory functions exist.

## Coverage

- None enforced. No `c8`, `istanbul`, `nyc`, or `coverage.py` is installed.
- `.gitignore` includes `coverage/`, suggesting it was anticipated, but no runs are configured.

## Test Types

- **Unit / Integration / E2E:** all none.
- **Manual verification only:** run all three dev servers (`npm run dev`, `npm run dev:server`, `npm run dev:agent`) and exercise flows in the browser. The Generation page's `useTestData` toggle (`src/pages/Generation.tsx:24,35-44`) bypasses the Gemini call for free local checks.

## Recommended Starting Point

Not currently used; recommendations for adopting tests:

- **Frontend:** Vitest + React Testing Library (reuses existing Vite config and `tsconfig.json`).
- **Express server:** Vitest + `supertest` against a mocked `getDb()`.
- **Flask backend:** `pytest` with Flask's `app.test_client()` and a mocked `genai.Client`.

## Highest-Risk Untested Surfaces

| Area | Files | Risk |
|------|-------|------|
| Auth flow | `src/contexts/AuthContext.tsx`, `src/components/AuthModal.tsx`, `server/auth.ts` | Silent auth bypass, broken sign-in |
| Project persistence | `src/contexts/ProjectContext.tsx`, `server/index.ts` (PUT/DELETE `/api/projects/:id`) | Data loss, double-writes between localStorage and Mongo |
| AI response parsing | `backend/app.py:74-86,165-177` (markdown-fence stripping + `json.loads`) | Malformed JSON crashes the route |
| Step-completion logic | `src/pages/Workspace.tsx:143-169`, `backend/app.py:131-185` | Incorrect "complete" verdicts mislead learners |
| Fetch error handling | `src/lib/api.ts:19-25`, `src/services/gemini.ts:16-21,36-39,59-61` | Silent failures or unhandled UI states |

## Common Patterns (Once Tests Exist)

- **Async:** prefer `async () => { await expect(...) ... }` and `await expect(p).rejects.toThrow(...)` to match the `async/await` + `try/catch` style used throughout the codebase (see `CONVENTIONS.md` → Error Handling).
- **Error paths:** assert both the thrown-error path AND the fallback-return path for functions like `checkStepCompletion` (`src/services/gemini.ts:64-70`) and the project-load fallback (`src/contexts/ProjectContext.tsx:36-41`).
- **Snapshots:** not recommended — the codebase favors explicit assertions and has no existing snapshots.
