# Coding Conventions

**Analysis Date:** 2026-04-26

## Naming Patterns

**Files:**
- React components and pages: `PascalCase.tsx` (`src/pages/Workspace.tsx`, `src/components/AuthModal.tsx`, `src/components/ProjectDial.tsx`)
- React contexts: `PascalCase.tsx` ending in `Context` (`src/contexts/AuthContext.tsx`, `src/contexts/ProjectContext.tsx`)
- Hooks: `camelCase.ts` starting with `use` (`src/hooks/useProjects.ts`)
- Library/service modules: lowercase `.ts` (`src/lib/api.ts`, `src/lib/supabase.ts`, `src/lib/utils.ts`, `src/services/gemini.ts`)
- Server modules: lowercase `.ts` (`server/index.ts`, `server/auth.ts`, `server/db.ts`)
- Python backend: snake_case `.py` (`backend/app.py`)
- Type definitions: shared types live in `src/types.ts` (no per-domain split)
- No test files exist anywhere in the repo

**Functions:**
- React components: `PascalCase` (`Workspace`, `Dashboard`, `AuthModal`, `ProjectDial`)
- Hooks: `camelCase` starting with `use` (`useAuth`, `useProjects`, `useProjectContext`)
- Event handlers: `handle` + EventName (`handleSubmit`, `handleRun`, `handleNextStep`, `handleAIHelp`, `handleClickOutside`)
- Async network helpers: verb-led `camelCase` (`generateProject`, `getAIHelp`, `checkStepCompletion`)
- Server route callbacks: inline arrow functions; auth middleware exported as `requireAuth`
- Python: snake_case (`generate_project`, `get_ai_help`, `check_step_completion`)

**Variables:**
- `camelCase` for locals and props (`isAuthModalOpen`, `chatHistory`, `currentStep`)
- `UPPER_SNAKE_CASE` for module-level constants (`BACKEND_URL` in `src/services/gemini.ts:3`, `MODEL_ID` in `backend/app.py:19`, `FEATURED_CHALLENGES` / `PRESET_PROJECTS` arrays in `src/pages/Challenges.tsx:6` and `src/pages/School.tsx:6`)
- Booleans typically prefixed with `is`, `has`, `show` (`isLogin`, `showAI`, `aiLoading`)
- No leading-underscore private convention; `_event`, `_ignore` used only to mark intentionally unused destructured fields (`server/index.ts:55`, `src/contexts/AuthContext.tsx:29`)

**Types:**
- `PascalCase` for `interface` and `type` aliases, no `I` prefix (`UserProject`, `ProjectFile`, `LessonStep`, `AuthContextType`, `ProjectContextType`)
- Component prop interfaces named `<Component>Props` (`AuthModalProps`, `ProjectDialProps`)
- String-literal union types used for closed sets (`Language = 'html-css-js' | 'python' | 'react'`, `Difficulty = 'Beginner' | 'Intermediate' | 'Advanced'` in `src/types.ts`)
- No enums in use; prefer string-literal unions

## Code Style

**Formatting:**
- No Prettier or formatter config committed (no `.prettierrc`, `.editorconfig`)
- 2-space indentation throughout TS/TSX
- Mixed quote style: most files use single quotes (`src/App.tsx`, `src/contexts/*`); `src/services/gemini.ts` and `src/lib/utils.ts` use double quotes. New code SHOULD use single quotes to match the majority.
- Semicolons: required (every statement terminates with `;`)
- Trailing commas: present in multi-line object/array literals
- JSX attribute style: double quotes for static values, braces for expressions (standard React)

**Linting:**
- No ESLint configuration committed
- The only "lint" is `npm run lint` which executes `tsc --noEmit` (`package.json:13`) — purely a TypeScript type check
- TypeScript config (`tsconfig.json`): `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `jsx: react-jsx`, `allowJs: true`, `noEmit: true`, no `strict` flag enabled

## Import Organization

**Order observed across `src/`:**
1. React core (`import React, { useState } from 'react';`)
2. Third-party packages (`react-router-dom`, `motion/react`, `lucide-react`, `@monaco-editor/react`, `@supabase/supabase-js`)
3. Internal relative imports (`../contexts/...`, `../hooks/...`, `../lib/...`, `../services/...`, `../types`)

**Grouping:**
- Single block, no blank lines between groups (see `src/pages/Workspace.tsx:1-14`, `src/pages/Generation.tsx:1-7`)
- No alphabetical sort enforced
- No `import type { ... }` syntax used; types are imported from the same statement as values

**Path Aliases:**
- `@/*` is declared in `tsconfig.json` and `vite.config.ts` mapping to repo root, but no source file currently uses it — every import is relative (`../`, `./`)
- New code should continue using relative imports to match the existing pattern (or adopt `@/` consistently if introducing it)

## Error Handling

**Patterns:**
- Frontend: `try { ... } catch (e) { console.error(...); }` around async network calls; UI fallbacks rather than re-throwing
  - `src/contexts/ProjectContext.tsx:36-41` — fetch projects, fall back to `localStorage` on failure
  - `src/services/gemini.ts:64-70` — `checkStepCompletion` returns a default `{ isComplete: false, feedback: ... }` object on failure
  - `src/pages/Workspace.tsx:136-140` — chat calls catch and append a friendly error message to chat history
- User-facing errors: `alert(error instanceof Error ? error.message : 'Generation failed')` (`src/pages/Generation.tsx:51`); inline `<div>` error banners inside forms (`src/components/AuthModal.tsx:110-114`)
- Express server: every route wrapped in `try/catch`, returning `res.status(500).json({ error: '<verb> failed', detail: String(err) })` (`server/index.ts:33`, `47`, `74`, `87`). Auth failures use `401` with `{ error: '<reason>' }` (`server/auth.ts:36`, `50`, `53`)
- Python Flask: each route wraps the Gemini call in `try/except Exception as e`, prints to stdout, and returns a JSON error with HTTP 500 (`backend/app.py:97-99`, `127-129`)
- `throw new Error('...')` is used for true failures: missing env vars (`server/db.ts:9`), missing context provider (`src/contexts/ProjectContext.tsx:85`), non-OK fetch responses (`src/lib/api.ts:21`, `src/services/gemini.ts:19`, `38`)

**Error Types:**
- No custom Error subclasses
- No `Result<T, E>` pattern; functions either return data or throw
- Error messages are short ad-hoc strings; the API client embeds method/path/status (`src/lib/api.ts:21`)

## Logging

**Framework:**
- Plain `console.log` / `console.error` / `console.warn` — no logger library
- Server uses `console.log` for the listen banner only (`server/index.ts:93`)
- Python backend uses `print()` for error reporting (`backend/app.py:98`, `128`, `181`)

**Patterns:**
- `console.log` at the start of an outbound API call (`src/services/gemini.ts:6,23`)
- `console.error` inside `catch` blocks before falling back (`src/contexts/ProjectContext.tsx:30,38,67`)
- `console.warn` for missing config detected at module load (`src/lib/supabase.ts:7`)
- No structured logging, no request IDs, no log levels beyond the console method choice

## Comments

**When to Comment:**
- Comments are sparse and explain intent or non-obvious geometry (e.g., the SVG arc math in `src/components/ProjectDial.tsx:24-31,49`)
- Section dividers inside JSX use `{/* Section Name */}` (`src/pages/Workspace.tsx:185,262,316`)
- Backend prompt-engineering rationale is documented inline as triple-quoted strings (`backend/app.py:31-61`)
- The HMR config in `vite.config.ts:19-21` carries a "do not modify" warning

**JSDoc/TSDoc:**
- Not used anywhere in the codebase. Functions rely on TypeScript signatures and prop interfaces for documentation.

**TODO Comments:**
- No `TODO`, `FIXME`, `HACK`, or `XXX` markers found. Use `// TODO: <description>` if one is needed; do not invent a username/issue convention.

## Function Design

**Size:**
- Page components are large (300–500 lines: `Workspace.tsx`, `Generation.tsx`, `Home.tsx`, `Challenges.tsx`) — they own state, effects, handlers, and JSX in a single function. New pages may follow this pattern, but extracting handler bodies once a component exceeds ~400 lines is preferred.
- Library functions are small and single-purpose (`src/lib/utils.ts`, `src/lib/api.ts`)

**Parameters:**
- 1–4 positional parameters are typical (`generateProject(prompt, language, difficulty)`, `getAIHelp(code, question, context)`)
- React components destructure props in the parameter list with defaults: `function ProjectDial({ projects = [] }: ProjectDialProps)`
- No options-object pattern used for service functions yet

**Return Values:**
- Explicit `return` statements; no implicit-undefined returns from non-void functions
- Async functions consistently typed with `Promise<T>` (`src/lib/api.ts:9`, `src/services/gemini.ts:5,27,49`)
- Early returns are used as guard clauses (`src/pages/Workspace.tsx:34,68,89,123`, `server/index.ts:84`)

## Module Design

**Exports:**
- Named exports are the norm for everything except the root `App` component (`src/App.tsx:15` uses `export default function App()`)
- Pages, components, hooks, contexts, and lib modules all use named exports
- Match this when adding new modules: prefer `export function Foo()` over `export default`

**Barrel Files:**
- No `index.ts` re-export files exist. Every consumer imports from the exact file path.
- Do not introduce barrel files unless paired with a clear public-API boundary; the current convention is direct imports.

**Module Boundaries:**
- `src/lib/` — generic helpers and external clients (Supabase, fetch wrapper, `cn` classname helper)
- `src/services/` — domain-specific network calls (currently just `gemini.ts` for the Python backend)
- `src/contexts/` — React Context providers paired with `useX` hook exported from the same file
- `src/hooks/` — thin wrappers over context hooks (`useProjects.ts` simply re-exports `useProjectContext`)
- `src/pages/` — route-level components rendered by `<Routes>` in `src/App.tsx:150-158`
- `src/components/` — shared presentational components reused across pages
- `server/` — Express + MongoDB + JWT verification (TypeScript, run via `tsx watch`)
- `backend/` — Flask + Gemini AI generation (Python, run via `py backend/app.py`)

---

*Convention analysis: 2026-04-26*
