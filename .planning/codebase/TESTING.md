# Testing Patterns

**Analysis Date:** 2026-04-26

## Test Framework

**Runner:**
- No JavaScript/TypeScript unit test runner is configured. `package.json` has no `test` script and no Jest, Vitest, React Testing Library, or Playwright dependencies.
- No test config files were found for Jest, Vitest, or Playwright.
- Python has no pytest or unittest configuration. `backend/requirements.txt` contains Flask, Google ADK/GenAI, Socket.IO, and runtime dependencies, but no dedicated test dependency.
- Current quality gate is TypeScript type checking via `npm run lint`, which maps to `tsc --noEmit` in `package.json`.

**Assertion Library:**
- No assertion library is established for JS/TS or Python tests.
- Existing root scripts such as `test_runner.py`, `check_adk.py`, and `check_adk_methods.py` print diagnostic output rather than asserting behavior.

**Run Commands:**
```bash
npm install        # Install JS/TS dependencies before type checks
npm run lint       # Type-check with tsc --noEmit
npm run build      # Vite production build smoke check
python test_runner.py          # Manual ADK diagnostic script, not an automated test suite
python check_adk.py            # Manual ADK import/introspection diagnostic
python check_adk_methods.py    # Manual ADK method/introspection diagnostic
```
- In this checkout on 2026-04-26, `npm run lint` failed with `sh: tsc: command not found`, indicating dependencies were not installed or linked in the workspace.

## Test File Organization

**Location:**
- No `*.test.*`, `*.spec.*`, `tests/`, or `__tests__/` files are present.
- Manual diagnostic scripts live at the repository root: `test_runner.py`, `check_adk.py`, and `check_adk_methods.py`.
- JSON sample data lives under `public/test_data/`, specifically `public/test_data/project.json` and `public/test_data/agent_project.json`; these are fixtures/sample data for the app, not automated tests.
- Seed scripts live under `scripts/`, such as `scripts/seed-challenges.ts` and `scripts/seed-submissions.ts`; these populate development data and are not tests.

**Naming:**
- No automated test naming convention has been established.
- Existing diagnostic script names are descriptive but not framework-discoverable test names.

**Structure:**
```text
.
  package.json              # quality command: npm run lint -> tsc --noEmit
  test_runner.py            # manual Google ADK sequential-agent diagnostic
  check_adk.py              # manual ADK environment diagnostic
  check_adk_methods.py      # manual ADK API-shape diagnostic
  public/test_data/
    agent_project.json      # sample app data
    project.json            # sample app data
```

## Test Structure

**Suite Organization:**
```text
No describe/it/test suite pattern exists yet.
```

**Patterns:**
- There is no shared setup/teardown pattern.
- There is no arrange/act/assert convention in committed automated tests.
- Current verification is manual or smoke-level: run type checking, run the Vite build, start services, exercise UI/API flows, or execute root diagnostic scripts.

## Mocking

**Framework:**
- No mocking framework is configured.
- Existing code directly calls external services and platform APIs: Supabase in `src/lib/supabase.ts`, MongoDB in `server/db.ts`, GitHub APIs in `server/index.ts`, Gemini/ADK in `backend/app.py` and `src/services/gemini.ts`, browser `fetch`, `localStorage`, and Socket.IO.

**Patterns:**
```text
No vi.mock, jest.mock, monkeypatch, or fixture-based mocking pattern exists yet.
```

**What to Mock When Tests Are Added:**
- Supabase auth/storage calls used by `src/lib/api.ts`, `src/lib/avatarApi.ts`, `src/lib/supabase.ts`, `server/auth.ts`, and storage helpers in `server/index.ts`.
- MongoDB access behind `server/db.ts`.
- External HTTP calls to GitHub in `server/index.ts`.
- Gemini/ADK calls in `backend/app.py` and the Flask-backed client functions in `src/services/gemini.ts`.
- Browser APIs used by the frontend, including `fetch`, `localStorage`, timers, and file/blob APIs.
- Socket.IO terminal execution flows in `src/components/XTerm.tsx`, `src/pages/Workspace.tsx`, and `backend/app.py`.

**What NOT to Mock:**
- Pure transformation and validation helpers should be tested directly once a runner exists, such as `validateUsername`, `deriveUsernameBase`, `deriveChallengeState`, `matchesSearch`, `pathFromPublicUrl`, and `localUsernameError`.
- Type-only contracts in `src/types.ts` should be exercised through callers rather than mocked.

## Fixtures and Factories

**Test Data:**
- Existing sample data is static JSON under `public/test_data/`.
- Development database fixtures are created imperatively by `scripts/seed-challenges.ts` and `scripts/seed-submissions.ts`.
- `scripts/seed-submissions.ts` uses deterministic IDs derived from email addresses so repeated runs are idempotent.

**Location:**
- No dedicated `tests/fixtures/` or factory module exists.
- If automated tests are introduced, shared fixtures should avoid real credentials and should be separate from production seed scripts unless the seed data is explicitly intended for tests.

## Coverage

**Requirements:**
- No coverage target is configured.
- No CI coverage enforcement is visible in the repository.

**Configuration:**
- No coverage tool is configured.
- `.gitignore` excludes `coverage/`, so coverage output is anticipated but not currently produced by a script.

**View Coverage:**
```bash
# No coverage command exists yet.
```

## Test Types

**Unit Tests:**
- Not currently present.
- Highest-value future unit targets are validation and transformation helpers in `server/index.ts`, `src/pages/Profile.tsx`, `src/pages/Challenges.tsx`, `src/lib/avatarApi.ts`, and API error handling in `src/lib/api.ts`.

**Integration Tests:**
- Not currently present.
- Highest-value future integration targets are authenticated Express endpoints in `server/index.ts`, MongoDB persistence through `server/db.ts`, Supabase auth middleware in `server/auth.ts`, and Flask generation endpoints in `backend/app.py`.

**E2E Tests:**
- Not currently present.
- Highest-value future E2E flows are sign-in/profile editing, project generation, workspace execution, challenge creation/submission/grading, and public profile browsing.

**Manual Diagnostics:**
- `test_runner.py` exercises a minimal Google ADK sequential-agent runner and prints event shapes.
- `check_adk.py` and `check_adk_methods.py` inspect ADK imports and available fields/methods.
- These scripts require the Python environment and external packages to be installed, and may require relevant environment configuration.

## Common Patterns

**Async Testing:**
```text
No automated async test pattern exists yet.
```
- App code uses async/await, Promise chains in React effects, route-local `try/catch`, and cancellation flags. Future tests should assert both success and failure states for these flows.

**Error Testing:**
```text
No automated error test pattern exists yet.
```
- Error behavior to preserve includes non-OK fetch errors in `src/lib/api.ts`, 401 auth failures in `server/auth.ts`, 400/409 validation responses in `server/index.ts`, and JSON fallback errors in `backend/app.py`.

**Snapshot Testing:**
- No snapshot testing is used.

---

*Testing analysis: 2026-04-26*
*Update when test patterns change*
