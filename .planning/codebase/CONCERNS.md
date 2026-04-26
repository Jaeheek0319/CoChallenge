# Codebase Concerns

**Analysis Date:** 2026-04-26

## Tech Debt

**Split backend responsibilities:**
- Issue: The app uses an Express/Mongo/Supabase API in `server/index.ts` and a separate Flask/Socket.IO/Google ADK service in `backend/app.py`.
- Why: AI generation, code execution, persistence, profiles, challenges, submissions, and GitHub export were added as separate verticals.
- Impact: Frontend calls `/api/*` through the Vite proxy for Express in `vite.config.ts`, but hardcodes the Flask URL in `src/services/gemini.ts` and `src/pages/Workspace.tsx`; non-local deployments need multiple hosts and duplicated CORS/auth/rate-limit decisions.
- Fix approach: Put service URLs behind `VITE_*` config, document which API owns each route, and add a shared auth/rate-limit boundary for the Flask service.

**Large mixed-responsibility modules:**
- Issue: `server/index.ts` is 1,349 lines and contains profiles, GitHub OAuth, project persistence, public challenges, submissions, grading, ELO, and storage URL generation in one file; `src/pages/Workspace.tsx` is 675 lines and owns editor state, preview, terminal sockets, Pyodide, AI chat, and step progression.
- Why: Feature work accumulated in route/page files without extracting domain services or hooks.
- Impact: Small changes have high regression risk because unrelated concerns share state and helper functions.
- Fix approach: Split `server/index.ts` into routers/services by domain and extract workspace hooks for project loading, editor files, preview, terminal execution, and AI chat.

**Local cache conflicts with authenticated remote state:**
- Issue: `src/contexts/ProjectContext.tsx` reads/writes `localStorage['project-code-projects']` for both guests and signed-in users, and falls back to local projects when `/api/projects` fails.
- Why: Guest storage was retained after remote persistence was added.
- Impact: Projects can appear/disappear across sign-in, stale local data can mask server fetch errors, and guest projects are not migrated to the account.
- Fix approach: Namespace local projects by auth state, add an explicit guest-to-user migration flow, and avoid silently substituting local data for authenticated API failures.

**Dead and exploratory files remain tracked:**
- Issue: `app_adk.py`, `check_adk.py`, `check_adk_methods.py`, `extract.py`, `extracted_app.py`, and `test_runner.py` look like experiments/debug helpers; `test_runner.py` still uses an old model id.
- Why: Prototype scripts were left in the repo root.
- Impact: New agents may treat stale scripts as supported entry points and copy outdated assumptions.
- Fix approach: Move active diagnostics into `scripts/` with comments, delete stale experiments, or mark them clearly as archived.

## Known Bugs

**Next step saves stale files:**
- Symptoms: Moving to the next lesson step can persist the previous file contents instead of the starter code just applied for the new step.
- Trigger: `handleNextStep` in `src/pages/Workspace.tsx` calls `setFiles(newFiles)` and then `saveProject({ ..., files })` with the old `files` variable.
- Workaround: Manual edits after navigation may overwrite the saved copy later.
- Root cause: React state update is asynchronous and the save payload does not use the computed `newFiles`.

**Editor mutates nested state in place:**
- Symptoms: File content updates can bypass clean immutable state semantics and make future memoization/debugging unreliable.
- Trigger: `handleFileChange` in `src/pages/Workspace.tsx` shallow-copies the array but mutates `newFiles[activeFileIndex].content`.
- Workaround: Current rendering often still updates because the array reference changes.
- Root cause: File objects are reused instead of replacing the edited file object.

**Completion counts are off by one:**
- Symptoms: Dashboard/project dial can mark a project completed when the user reaches the last step, before that step is checked or advanced.
- Trigger: `src/pages/Dashboard.tsx` checks `currentStep === steps.length - 1`.
- Workaround: None visible in UI.
- Root cause: `currentStep` tracks the active step, not verified completion state.

**School project CTA loses preset prompt:**
- Symptoms: Starting a curated school project navigates to the home route and does not land on the prompt-generating screen.
- Trigger: `src/pages/School.tsx` navigates to `/` with `presetPrompt`, while `src/pages/Generation.tsx` is the route that reads the state.
- Workaround: User can manually go to `/generation` and type the prompt.
- Root cause: Route mismatch after the generation page was split from home.

## Security Considerations

**Unauthenticated AI and code execution service:**
- Risk: `backend/app.py` exposes `/api/generateProject`, `/api/getAIHelp`, `/api/checkStepCompletion`, and Socket.IO code execution without bearer auth; it also enables `CORS(app)` and `cors_allowed_origins="*"`.
- Current mitigation: Language execution is limited to C/C++ in the socket path and writes to a temporary directory, but there is no user auth, quota, timeout, process kill, or network/filesystem sandbox.
- Recommendations: Require the same Supabase JWT as Express, add rate limits and execution timeouts, run compilation/execution in a locked-down sandbox, and use an origin allowlist.

**Flask debug server in entrypoint:**
- Risk: `backend/app.py` starts Socket.IO with `debug=True`.
- Current mitigation: None in code.
- Recommendations: Gate debug mode behind an explicit development env var and use a production WSGI/ASGI deployment path.

**GitHub OAuth tokens exposed to browser and stored plaintext:**
- Risk: `server/index.ts` returns profile fields without removing `githubAccessToken`, `src/types.ts` includes it in `UserProfile`, and `src/pages/Profile.tsx` uses token presence to show connection state.
- Current mitigation: Routes requiring the token use `requireAuth`; no encryption/redaction is visible.
- Recommendations: Never return access tokens to the client, store tokens encrypted or in a dedicated secrets store, expose a boolean like `githubConnected`, and rotate/delete existing stored tokens.

**GitHub OAuth callback trusts raw `state`:**
- Risk: `server/index.ts` builds the GitHub auth URL with `state=${req.userId}` and the callback is unauthenticated, so it lacks a CSRF nonce/session binding.
- Current mitigation: A random Supabase user id is difficult to guess, but not a sufficient CSRF control.
- Recommendations: Use a signed, short-lived OAuth state value tied to the initiating session and validate it before storing the token.

**Broad GitHub OAuth scope and public exports:**
- Risk: `server/index.ts` requests `scope=repo` and exports projects by creating public repositories.
- Current mitigation: User must explicitly connect GitHub and click export.
- Recommendations: Request the narrowest practical scope, let the user choose public/private, and validate/confirm target repo names before creation.

**Unsandboxed user-authored previews:**
- Risk: `src/pages/Workspace.tsx` and `src/pages/PreviewChallenge.tsx` create blob HTML and render it in iframes without a `sandbox` attribute.
- Current mitigation: Blob origin isolation helps, but the iframe is intentionally executing untrusted lesson/challenge code.
- Recommendations: Add a restrictive iframe sandbox, consider a separate preview origin, and block parent/top navigation and storage access.

**Supabase placeholder fallback hides misconfiguration:**
- Risk: `src/lib/supabase.ts` creates a client with placeholder URL/key when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` are missing.
- Current mitigation: A console warning is emitted.
- Recommendations: Fail fast during startup/build with explicit env validation.

## Performance Bottlenecks

**Unpaginated collection reads:**
- Problem: Many endpoints call `.toArray()` without pagination or projection, including projects, challenges, submissions, public user projects, and ELO history in `server/index.ts`.
- Measurement: No runtime metrics in repo; code inspection shows full result sets and large nested `files`/`steps` payloads.
- Cause: API handlers return whole collections/user datasets directly from Mongo.
- Improvement path: Add pagination, projections, per-route limits, and indexes for common sort/filter patterns.

**AI generation pipeline is serial and synchronous per request:**
- Problem: `/api/generateProject` in `backend/app.py` can run six LLM agents in sequence, then parses one final JSON blob.
- Measurement: No latency metrics in repo; the code path performs up to six model calls before responding.
- Cause: Sequential ADK pipeline plus fallback sequential SDK calls.
- Improvement path: Add request queueing, progress streaming, timeouts, result validation/retry by stage, and persistence for long-running generation jobs.

**Workspace updates and previews churn memory:**
- Problem: `src/pages/Workspace.tsx` rewrites file state on each keystroke and creates object URLs for previews without revoking old URLs; `src/pages/PreviewChallenge.tsx` has the same URL lifetime issue.
- Measurement: No profiler data in repo.
- Cause: No debouncing, no `URL.revokeObjectURL`, and Monaco `automaticLayout` runs in a large stateful page.
- Improvement path: Use immutable per-file updates, debounce persistence, revoke old blob URLs, and isolate editor state from the rest of the workspace.

**Browser Python runtime is heavy:**
- Problem: `src/pages/Workspace.tsx` loads Pyodide from jsDelivr when a Python project opens.
- Measurement: No bundle/runtime metrics in repo; Pyodide is a large external runtime.
- Cause: Python execution happens client-side.
- Improvement path: Lazy-load with clear caching/loading states, pin integrity/version policy, and consider server-side sandbox execution if startup cost is unacceptable.

## Fragile Areas

**Profile and GitHub integration:**
- Why fragile: Profile save replaces the entire profile document in `server/index.ts` and manually preserves `githubAccessToken`; GitHub connect/disconnect/export logic also lives in the same server file.
- Common failures: Token accidentally dropped on profile save, token leaked in profile responses, export behavior breaking when profile shape changes.
- Safe modification: Add API tests around profile get/save, connect/disconnect, and export before changing profile persistence.
- Test coverage: No automated tests found.

**Challenge grading and ELO updates:**
- Why fragile: `server/index.ts` grades by updating the challenge podium and then separately applies ELO changes.
- Common failures: Partial updates if ELO insert/profile update fails after podium save; repeat retries can be blocked by `already graded` while ELO is incomplete.
- Safe modification: Use a transaction or idempotent grading record before expanding grading behavior.
- Test coverage: No automated tests found.

**Submission upload flow:**
- Why fragile: Supabase signed upload URLs are generated in `server/index.ts`, while the saved draft trusts a `zipPath` that only checks the challenge-id prefix.
- Common failures: Draft metadata and object storage can drift; abandoned uploads are not cleaned up; file type/size policy is not visible in code.
- Safe modification: Validate uploaded object metadata before submit and add cleanup for replaced/cancelled uploads.
- Test coverage: No automated tests found.

**Generated project schema parsing:**
- Why fragile: `backend/app.py` strips markdown fences and `json.loads` the final model output, then the frontend assumes `files`, `steps`, and step fields exist.
- Common failures: Malformed AI output crashes generation or later route rendering; no schema-level error details are preserved.
- Safe modification: Validate AI output with a schema on the server and normalize missing/invalid fields before saving.
- Test coverage: No parsing tests found.

## Scaling Limits

**Mongo indexing is incomplete:**
- Current capacity: Unknown; only the `profiles.username` index is ensured in code.
- Limit: Queries on `projects.userId`, `challenges` sort fields, `challenge_submissions` user/challenge fields, and `elo_changes.userId` will degrade as collections grow.
- Symptoms at limit: Slow dashboards, challenge boards, submission lists, and ELO history endpoints.
- Scaling path: Create startup migrations/indexes for `{ userId, updatedAt }`, challenge listing/sorts, submission lookup pairs, and ELO history.

**No rate limiting or quotas:**
- Current capacity: Unknown.
- Limit: One user or unauthenticated caller can repeatedly hit Gemini, Mongo writes, GitHub export, or compilation endpoints.
- Symptoms at limit: Gemini quota drain, GitHub API throttling, DB growth, CPU exhaustion during C/C++ compile/run.
- Scaling path: Add per-IP and per-user limits, request size caps per endpoint, and background-job limits for AI/export/code execution.

**LocalStorage project cache cap:**
- Current capacity: Browser dependent, commonly around a few MB per origin.
- Limit: `src/contexts/ProjectContext.tsx` stores all project files and steps in one JSON value.
- Symptoms at limit: `localStorage.setItem` throws and guest or fallback persistence silently breaks.
- Scaling path: Store only guest drafts locally, catch quota errors, and rely on paginated server persistence for authenticated users.

## Dependencies at Risk

**Python dependencies are unpinned:**
- Risk: `backend/requirements.txt` lists packages without versions.
- Impact: Google ADK, Flask-SocketIO, or PyPI transitive updates can break the AI/terminal backend between installs.
- Migration plan: Pin known-good versions and add a smoke test for generation and code execution.

**MongoDB driver requires modern Node:**
- Risk: `package-lock.json` resolves `mongodb` 7.2.0, whose package metadata requires Node `>=20.19.0`.
- Impact: Installs/runs fail on older Node 20 patch releases or Node 18 environments.
- Migration plan: Document the Node version in setup files or pin a driver compatible with the deployment runtime.

**External CDN runtime is not integrity-pinned:**
- Risk: `src/pages/Workspace.tsx` loads Pyodide from jsDelivr at runtime.
- Impact: Availability/performance depends on the CDN, and there is no subresource integrity policy.
- Migration plan: Pin and verify the asset, self-host it, or move Python execution to a controlled backend sandbox.

## Missing Critical Features

**Automated test harness:**
- Problem: `package.json` has only `npm run lint`, which failed in this checkout because `tsc` was unavailable, and no `*.test.*`, Vitest, Jest, or Playwright config files were found.
- Current workaround: Manual testing and ad hoc scripts.
- Blocks: Safe changes to auth, project persistence, challenge grading, GitHub export, and AI parsing.
- Implementation complexity: Medium; start with API unit/integration tests and a small frontend smoke suite.

**Startup configuration validation:**
- Problem: Required env vars are checked lazily across `server/db.ts`, `server/index.ts`, `backend/app.py`, and `src/lib/supabase.ts`.
- Current workaround: Runtime errors and console warnings.
- Blocks: Reliable deployment and clear local onboarding.
- Implementation complexity: Low; centralize validation for `MONGODB_URI`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`/`SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.

**Delete project UI/state handling:**
- Problem: Express exposes `DELETE /api/projects/:id` and `src/lib/api.ts` has `api.delete`, but the dashboard menu only offers GitHub export.
- Current workaround: None in UI.
- Blocks: Users cannot remove generated projects without direct API calls.
- Implementation complexity: Low to medium; add UI plus local/remote state reconciliation in `ProjectContext`.

**Operational observability:**
- Problem: No structured logging, metrics, tracing, or health checks beyond `/api/health` and `/api/me`.
- Current workaround: `console.log`/`print` and returned error details.
- Blocks: Diagnosing generation latency, Mongo failures, GitHub export failures, and code execution hangs in production.
- Implementation complexity: Medium.

## Test Coverage Gaps

**Auth and authorization:**
- What's not tested: Supabase JWT verification in `server/auth.ts`, protected routes in `server/index.ts`, and unauthenticated Flask routes in `backend/app.py`.
- Risk: Token regressions, accidental route exposure, and inconsistent auth behavior between services.
- Priority: High.
- Difficulty to test: Medium because it needs mock JWKS/Supabase tokens.

**Project persistence and workspace progression:**
- What's not tested: `src/contexts/ProjectContext.tsx`, `/api/projects`, and `src/pages/Workspace.tsx` step/file saving.
- Risk: Lost user code, stale local cache, and incorrect completion status.
- Priority: High.
- Difficulty to test: Medium due to React context plus API interaction.

**GitHub OAuth/export:**
- What's not tested: OAuth URL/callback, token redaction, disconnect, and `/api/projects/:id/export`.
- Risk: Token leaks, account-linking bugs, public repo surprises, and partial exports.
- Priority: High.
- Difficulty to test: Medium to high because GitHub API calls need mocking.

**Challenge/submission/grading flows:**
- What's not tested: Challenge creation/listing, signed upload URL generation, draft/submit locking, creator-only download, podium grading, and ELO changes.
- Risk: Data leakage, duplicate/partial grading, broken challenge lifecycle.
- Priority: High.
- Difficulty to test: Medium; Mongo and Supabase storage should be mocked or run against test services.

**AI output parsing and code execution:**
- What's not tested: Markdown fence stripping, JSON schema assumptions, Gemini failures, Pyodide input handling, and C/C++ socket execution.
- Risk: Generation failures, UI crashes, hanging terminal sessions, and unsafe execution regressions.
- Priority: High.
- Difficulty to test: High for execution sandboxing; low to medium for pure parsing tests.

---

*Concerns audit: 2026-04-26*
*Update as issues are fixed or new ones discovered*
