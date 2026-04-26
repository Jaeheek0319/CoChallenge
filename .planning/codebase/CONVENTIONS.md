# Coding Conventions

**Analysis Date:** 2026-04-26

## Naming Patterns

**Files:**
- React pages and larger components use PascalCase filenames under `src/pages/` and `src/components/`, such as `src/pages/CreateChallenge.tsx`, `src/pages/PublicProfile.tsx`, and `src/components/AuthModal.tsx`.
- Contexts also use PascalCase filenames with a `Context` suffix, such as `src/contexts/AuthContext.tsx` and `src/contexts/ProjectContext.tsx`.
- Hooks use `useX.ts` naming, currently `src/hooks/useProjects.ts`.
- Utility/API modules use camelCase or short lowercase names under `src/lib/`, such as `src/lib/profileApi.ts`, `src/lib/avatarApi.ts`, `src/lib/usersApi.ts`, `src/lib/api.ts`, and `src/lib/utils.ts`.
- Server modules use short lowercase names in `server/`, such as `server/index.ts`, `server/auth.ts`, and `server/db.ts`.
- Seed scripts use kebab-case in `scripts/`, such as `scripts/seed-challenges.ts` and `scripts/seed-submissions.ts`.
- Python files are snake_case or short diagnostic names, such as `backend/app.py`, `test_runner.py`, `check_adk.py`, and `check_adk_methods.py`.

**Functions:**
- TypeScript functions use camelCase: `validateUsername`, `deriveChallengeState`, `generateSignedUploadUrl`, `pathFromPublicUrl`, and `localUsernameError`.
- React components use PascalCase: `AuthModal`, `Challenges`, `Profile`, `ProjectProvider`, and `ChallengeDojoPage`.
- React hooks use the `use` prefix: `useAuth`, `useProjectContext`, and `useProjects`.
- Event handlers commonly use `handleX` or action names: `handleSubmit`, `handleClickOutside`, `handleExecuteCode`, `scrollLeft`, `scrollRight`, `startEdit`, and `save`.
- Async functions do not use a naming prefix; return types are explicit more often in service/server helpers than in component-local callbacks.
- Python functions use snake_case: `generate_project`, `get_ai_help`, `check_step_completion`, `read_and_forward_pty_output`, and `handle_terminal_input`.

**Variables:**
- Local variables and React state use camelCase, often with boolean `is` prefixes: `isAuthModalOpen`, `isProfileDropdownOpen`, `loading`, `saveError`, and `usernameStatus`.
- Constants use UPPER_SNAKE_CASE for module-level configuration and domain values, such as `VERIFIED_COMPANY_DOMAINS`, `SUPABASE_URL`, `SUBMISSION_BUCKET`, `ALLOWED_DIFFICULTIES`, `ELO_STARTING_VALUE`, `PODIUM_DELTAS`, and `MODEL_ID`.
- Object constants may use PascalCase-ish semantic names when they are not primitive config, such as `LIMITS` and `RESERVED` in `src/pages/Profile.tsx`.
- Private members do not use underscore prefixes. MongoDB documents use `_id` because that is the database field.

**Types:**
- Interfaces and type aliases use PascalCase with no `I` prefix: `ProjectDoc`, `ChallengeDoc`, `SubmissionDoc`, `UserProfile`, `GeneratedProject`, `UsernameStatus`, and `StepCompletionResult`.
- Union types are used for fixed domains in `src/types.ts`, such as `Language` and `Difficulty`.
- No TypeScript enums are currently used.

## Code Style

**Formatting:**
- No Prettier configuration is present. Existing TypeScript and TSX generally use 2-space indentation and semicolons.
- Single quotes are dominant in newer TS/TSX/server files, for example `server/index.ts`, `src/lib/api.ts`, and `src/pages/Profile.tsx`; a few older/generated files still use double quotes, such as `src/services/gemini.ts` and `src/lib/utils.ts`.
- JSX is written inline with Tailwind classes directly in `className` strings, as seen throughout `src/App.tsx`, `src/pages/Challenges.tsx`, and `src/components/AuthModal.tsx`.
- Long JSX props are usually broken across lines; long Tailwind class strings are usually kept as one string rather than extracted.
- CSS uses Tailwind v4 directives and `@apply` in `src/index.css`, with reusable classes such as `.glass-panel`, `.glow-blue`, and `.custom-scrollbar`.
- TypeScript compiler settings are in `tsconfig.json`; notable settings include `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `allowJs: true`, `allowImportingTsExtensions: true`, and no `strict` setting.
- Python has no formatter configuration. `backend/app.py` uses 4-space indentation, Flask route decorators, module-level setup, and explicit JSON responses.

**Linting:**
- There is no ESLint config and no Prettier config.
- `package.json` defines `npm run lint` as `tsc --noEmit`; this is type checking, not style linting.
- In the current workspace, `npm run lint` failed because `tsc` was not available on PATH, which indicates dependencies were not installed or not linked in this checkout.

## Import Organization

**Order:**
1. External packages are imported first, such as React, Express, Supabase, MongoDB, lucide-react, and motion.
2. Local project modules follow, usually as relative imports like `../lib/api`, `./auth`, `../types`, and `./contexts/AuthContext`.
3. Type imports are used where the file only needs types, for example `import type { UserProfile } from '../types';` in `src/pages/Profile.tsx` and `src/lib/profileApi.ts`.

**Grouping:**
- Imports are usually contiguous at the top of the file.
- Blank-line grouping is not consistently used. Some files keep all imports together, while `src/pages/Profile.tsx` separates a multi-line lucide import from local API imports.
- Alphabetical sorting is not enforced.

**Path Aliases:**
- `tsconfig.json` and `vite.config.ts` map `@` to the repository root.
- The current app code mostly uses relative imports instead of the `@` alias. Match nearby files before introducing alias imports.

## Error Handling

**Patterns:**
- Client API wrappers throw `Error` on non-OK HTTP responses and include method, path, status, and response text, as in `src/lib/api.ts` and `src/lib/usersApi.ts`.
- React data-loading effects commonly use a `cancelled` flag to avoid setting state after unmount, as in `src/pages/Challenges.tsx` and `src/pages/Profile.tsx`.
- User-facing UI state stores errors in `useState<string | null>` and renders inline error panels, as in `src/components/AuthModal.tsx`, `src/pages/Challenges.tsx`, and `src/pages/Profile.tsx`.
- Express routes in `server/index.ts` use route-local `try/catch` blocks and return JSON errors with HTTP status codes.
- Expected validation failures return 400, 401, 404, or 409 rather than throwing through to 500. Examples include username validation in `server/index.ts`, auth failures in `server/auth.ts`, and project deletion in `server/index.ts`.
- Custom errors are rare; `UsernameValidationError` in `server/index.ts` distinguishes username validation from unexpected failures.
- Python Flask endpoints in `backend/app.py` validate request fields, return 400 for missing input, and catch external AI failures with JSON fallback errors.

**Error Types:**
- Throw for missing required environment or service setup at service boundaries, such as missing `MONGODB_URI` in `server/db.ts` and missing Supabase service credentials in storage helpers in `server/index.ts`.
- Return structured HTTP errors for invalid user input and expected missing resources.
- Frontend fallback behavior is sometimes preferred over hard failure, such as falling back to local projects in `src/contexts/ProjectContext.tsx` when the API request fails.

## Logging

**Framework:**
- No structured logger is configured.
- TypeScript uses `console.log`, `console.warn`, and `console.error`.
- Python uses `print`.

**Patterns:**
- Server logs focus on startup, external service failures, and script progress, for example `server/index.ts`, `scripts/seed-challenges.ts`, and `scripts/seed-submissions.ts`.
- Frontend logs are used for fallback/debug paths, such as Supabase configuration warnings in `src/lib/supabase.ts`, project persistence failures in `src/contexts/ProjectContext.tsx`, and generation failures in `src/services/gemini.ts`.
- Avoid logging credential values. Existing code logs error objects and external API response payloads, so new logging around auth tokens or environment variables should redact sensitive fields.

## Comments

**When to Comment:**
- Comments are sparse and usually explain workflow intent or non-obvious compatibility decisions.
- Examples include the HMR note in `vite.config.ts`, profile backfill in `server/index.ts`, GitHub OAuth flow comments in `server/index.ts`, deterministic seed IDs in `scripts/seed-submissions.ts`, and ADK event parsing notes in `backend/app.py`.
- JSX section comments are used in larger pages to divide UI regions, such as `src/pages/Challenges.tsx`.

**JSDoc/TSDoc:**
- No JSDoc or TSDoc convention is established.
- Public contracts are documented with TypeScript interfaces and type aliases rather than docblocks.

**TODO Comments:**
- No tracked TODO convention is present. The visible TODO text is example user-facing starter code in `src/pages/CreateChallenge.tsx`, not a repository task marker.

## Function Design

**Size:**
- The codebase accepts large route and page modules. `server/index.ts`, `src/pages/Workspace.tsx`, `src/pages/Challenges.tsx`, and `backend/app.py` contain substantial inline logic.
- Smaller helper functions are still extracted for reusable transformations and validation, such as `challengeToResponse`, `submissionToResponse`, `validateUsername`, `publicLogoUrl`, `matchesSearch`, and `toPreviewState`.

**Parameters:**
- Simple helpers take positional parameters when the domain is obvious, such as `validateUsername(raw)`, `publicLogoUrl(file)`, and `uploadAvatar(blob, userId)`.
- Larger data flows use typed objects or API response interfaces rather than long parameter lists.
- React components destructure props in the parameter list, for example `AuthModal({ isOpen, onClose, initialMode = 'login' })`.

**Return Values:**
- Server helpers and API wrappers often declare explicit return types, such as `Promise<Db>`, `Promise<string>`, `Promise<void>`, and typed response helpers.
- React component-local helpers often rely on inference.
- Guard clauses and early returns are common in validation, auth, and loading flows.

## Module Design

**Exports:**
- Named exports are preferred for most components, contexts, hooks, API objects, and utility functions: `AuthModal`, `ProjectProvider`, `useAuth`, `useProjects`, `api`, `profileApi`, `usersApi`, and `cn`.
- `src/App.tsx` uses a default export for the root `App` component.
- `src/main.tsx` imports TSX files with explicit `.tsx` extensions, enabled by `allowImportingTsExtensions`.

**Barrel Files:**
- No barrel files are used. Files import directly from concrete modules.
- Keep new imports direct unless a barrel pattern is introduced deliberately across a directory.

**State and Service Boundaries:**
- Frontend API access is centralized in small modules under `src/lib/` and `src/services/`.
- Authentication state is centralized in `src/contexts/AuthContext.tsx`.
- Project persistence state is centralized in `src/contexts/ProjectContext.tsx`, combining localStorage fallback with authenticated API persistence.
- Express auth middleware lives in `server/auth.ts`; MongoDB connection reuse lives in `server/db.ts`; most HTTP route logic currently lives in `server/index.ts`.

---

*Convention analysis: 2026-04-26*
*Update when patterns change*
