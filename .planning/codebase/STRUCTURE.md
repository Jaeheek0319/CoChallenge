# Codebase Structure

**Analysis Date:** 2026-04-26

## Directory Layout

```
manama/
├── .context/                 # Local notes and todos
├── .planning/                # GSD project and codebase mapping documents
│   └── codebase/             # STACK, ARCHITECTURE, STRUCTURE, etc.
├── backend/                  # Python Flask/Socket.IO AI and terminal service
├── public/                   # Static Vite assets
│   └── test_data/            # Sample generated project JSON files
├── scripts/                  # Manual MongoDB seed scripts
├── server/                   # TypeScript Express API
├── src/                      # React/Vite browser application
│   ├── components/           # Reusable UI components
│   ├── contexts/             # React Context providers
│   ├── hooks/                # Custom React hooks
│   ├── lib/                  # SDK clients, API clients, utilities
│   ├── pages/                # Top-level route components
│   └── services/             # Domain service clients
├── index.html                # Vite HTML entry
├── package.json              # npm scripts and dependencies
├── tsconfig.json             # TypeScript compiler settings
└── vite.config.ts            # Vite, React, Tailwind, proxy config
```

## Directory Purposes

**`.context/`:**
- Purpose: Free-form workspace context.
- Contains: Markdown notes and todos.
- Key files: `.context/notes.md`, `.context/todos.md`.
- Subdirectories: None observed.

**`.planning/`:**
- Purpose: GSD planning and mapping artifacts.
- Contains: Codebase analysis documents under `.planning/codebase/`.
- Key files: `.planning/codebase/ARCHITECTURE.md`, `.planning/codebase/STRUCTURE.md`, plus sibling mapper outputs.
- Subdirectories: `.planning/codebase/`.

**`backend/`:**
- Purpose: Python service for AI project generation, AI tutor help, step evaluation, and Socket.IO terminal execution.
- Contains: Flask app and Python dependency list.
- Key files: `backend/app.py`, `backend/requirements.txt`.
- Subdirectories: None observed.

**`public/`:**
- Purpose: Static files served directly by Vite.
- Contains: Sample generated project JSON used by the generation flow.
- Key files: `public/test_data/project.json`, `public/test_data/agent_project.json`.
- Subdirectories: `public/test_data/`.

**`scripts/`:**
- Purpose: Manual data seeding against the same MongoDB accessed by the Express API.
- Contains: TypeScript scripts.
- Key files: `scripts/seed-challenges.ts`, `scripts/seed-submissions.ts`.
- Subdirectories: None observed.

**`server/`:**
- Purpose: Node/TypeScript API server for persisted app features.
- Contains: Express routes, Supabase JWT middleware, and MongoDB connection helper.
- Key files: `server/index.ts`, `server/auth.ts`, `server/db.ts`.
- Subdirectories: None observed.

**`src/`:**
- Purpose: Browser application source.
- Contains: React app entry, global CSS, route pages, components, contexts, clients, hooks, and shared types.
- Key files: `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/types.ts`.
- Subdirectories: `src/components/`, `src/contexts/`, `src/hooks/`, `src/lib/`, `src/pages/`, `src/services/`.

**`src/components/`:**
- Purpose: Shared UI widgets used by route pages.
- Contains: Auth modal, avatar crop modal, challenge/profile widgets, charts, project stats, user search, and terminal component.
- Key files: `src/components/AuthModal.tsx`, `src/components/XTerm.tsx`, `src/components/ChallengeDojo.tsx`, `src/components/UserSearch.tsx`.
- Subdirectories: None observed.

**`src/contexts/`:**
- Purpose: Cross-page React state providers.
- Contains: Auth and project providers.
- Key files: `src/contexts/AuthContext.tsx`, `src/contexts/ProjectContext.tsx`.
- Subdirectories: None observed.

**`src/hooks/`:**
- Purpose: Custom hooks.
- Contains: A project hook wrapper.
- Key files: `src/hooks/useProjects.ts`.
- Subdirectories: None observed.

**`src/lib/`:**
- Purpose: Low-level clients and utilities.
- Contains: Authenticated API wrapper, Supabase client, profile/user/avatar API helpers, and class-name utility.
- Key files: `src/lib/api.ts`, `src/lib/supabase.ts`, `src/lib/profileApi.ts`, `src/lib/usersApi.ts`, `src/lib/avatarApi.ts`, `src/lib/utils.ts`.
- Subdirectories: None observed.

**`src/pages/`:**
- Purpose: Top-level React Router route components.
- Contains: Home, generation, workspace, challenge, dashboard, profile, and school flows.
- Key files: `src/pages/Generation.tsx`, `src/pages/Workspace.tsx`, `src/pages/Challenges.tsx`, `src/pages/Profile.tsx`.
- Subdirectories: None observed.

**`src/services/`:**
- Purpose: Domain-specific service clients that do not fit the lower-level `src/lib/` wrappers.
- Contains: Gemini/Flask API client.
- Key files: `src/services/gemini.ts`.
- Subdirectories: None observed.

## Key File Locations

**Entry Points:**
- `index.html`: Vite HTML shell.
- `src/main.tsx`: React `createRoot` bootstrap and `AuthProvider` installation.
- `src/App.tsx`: App shell, route table, navigation, auth modal, and `ProjectProvider`.
- `server/index.ts`: Express API process entry point.
- `backend/app.py`: Flask and Socket.IO process entry point.
- `start.sh`: Local helper that starts Vite, Express, and Flask commands sequentially.

**Configuration:**
- `package.json`: npm scripts, runtime dependencies, and dev dependencies.
- `package-lock.json`: Locked npm dependency graph.
- `tsconfig.json`: TypeScript target, JSX mode, bundler module resolution, and `@/*` path alias.
- `vite.config.ts`: React/Tailwind plugins, `@` alias, `/api` proxy, and HMR setting.
- `backend/requirements.txt`: Python dependencies for the Flask service.
- `.gitignore`: Excludes dependencies, build output, Python virtualenv, and `.env*` files.
- `metadata.json`: AI Studio app metadata.

**Core Logic:**
- `src/types.ts`: Shared browser data types for generated projects, profiles, users, and challenges.
- `src/contexts/AuthContext.tsx`: Supabase auth state provider.
- `src/contexts/ProjectContext.tsx`: Project load/save state provider with localStorage and Express persistence.
- `src/lib/api.ts`: Authenticated JSON fetch wrapper for Express.
- `src/lib/supabase.ts`: Browser Supabase client.
- `src/services/gemini.ts`: Browser client for Flask AI endpoints.
- `server/auth.ts`: Supabase JWT verification middleware.
- `server/db.ts`: MongoDB connection singleton.
- `server/index.ts`: Profiles, projects, challenges, submissions, GitHub export, signed upload/download URLs, grading, and Elo APIs.
- `backend/app.py`: Google ADK/Gemini lesson pipeline, AI help, step completion evaluation, and C/C++ terminal execution.

**Testing and Manual Fixtures:**
- `public/test_data/project.json`: Manual fixture loaded by `src/pages/Generation.tsx`.
- `public/test_data/agent_project.json`: Additional generated project fixture.
- `test_runner.py`: Manual Google ADK runner inspection script.
- `check_adk.py`, `check_adk_methods.py`: Manual ADK diagnostics.
- No `tests/` directory or `*.test.*` files were observed.

**Documentation:**
- `README.md`: AI Studio/local run instructions.
- `README-SETUP.md`: Present but currently empty.
- `.planning/codebase/*.md`: GSD codebase mapping documents.

**Generated or Extracted Artifacts:**
- `app_adk.py`: Extracted/generated Python content stored as a quoted string-like artifact.
- `extracted_app.py`: Extracted Python artifact with nonstandard encoding bytes.
- `extract.py`: One-off extractor referencing a Windows log path.

## Naming Conventions

**Files:**
- `PascalCase.tsx` for React components and pages, such as `src/pages/CreateChallenge.tsx` and `src/components/AuthModal.tsx`.
- `camelCase.ts` for browser utility/service modules, such as `src/lib/profileApi.ts` and `src/services/gemini.ts`.
- `<Name>Context.tsx` for context providers, such as `src/contexts/AuthContext.tsx`.
- `use<Name>.ts` for hooks, such as `src/hooks/useProjects.ts`.
- Lowercase TypeScript files in `server/`, such as `server/index.ts`, `server/auth.ts`, and `server/db.ts`.
- `snake_case.py` for Python scripts when applicable, such as `test_runner.py`.

**Directories:**
- Lowercase collection directories: `src/pages`, `src/components`, `src/contexts`, `src/hooks`, `src/lib`, `src/services`, `server`, `backend`, `scripts`, `public`.
- No feature-folder nesting is currently used inside `src/pages` or `src/components`; both are flat.

**Special Patterns:**
- API routes use `/api/...` paths.
- Public profile routes use `/u/:username` in `src/App.tsx`.
- Public static assets are referenced from `public/` with root-relative paths such as `/test_data/project.json`.
- Shared TypeScript interfaces are centralized in `src/types.ts`, while Express has separate local document interfaces in `server/index.ts`.

## Where to Add New Code

**New Page or Route:**
- Primary code: `src/pages/<Name>.tsx`.
- Route wiring: import the page and add a `<Route>` in `src/App.tsx`.
- Navigation: add a `Link` in `src/App.tsx` when the route should appear in the top nav or profile menu.

**New Shared Component:**
- Implementation: `src/components/<Name>.tsx`.
- Types: colocate component-local props in the component file unless shared externally.
- Styling: use Tailwind classes and `cn()` from `src/lib/utils.ts` when conditional class merging is needed.

**New Cross-Page State:**
- Implementation: `src/contexts/<Name>Context.tsx`.
- Hook: export a `use<Name>` or `use<Name>Context` hook from the same file.
- Provider placement: add the provider near `AuthProvider` in `src/main.tsx` or inside `BrowserRouter` in `src/App.tsx` depending on whether it needs router APIs.

**New Browser API Client:**
- Authenticated Express calls: add methods around `api` in `src/lib/<domain>Api.ts`.
- Public Express calls: follow the `getJson()` pattern in `src/lib/usersApi.ts` if no bearer token is needed.
- Flask AI calls: add typed functions in `src/services/gemini.ts`.
- Supabase Storage calls: place bucket-specific helpers in `src/lib/<domain>Api.ts`.

**New Express Endpoint:**
- Definition: `server/index.ts`.
- Auth: use `requireAuth` from `server/auth.ts` for user-scoped endpoints.
- Database: use `getDb()` from `server/db.ts`.
- Shared browser types: update `src/types.ts` if the response is consumed by the React app.

**New Mongo Collection or Document Shape:**
- Server shape: add or update a local interface in `server/index.ts`.
- Seed data: add scripts under `scripts/` if demo data is needed.
- Browser shape: add exported interfaces to `src/types.ts` when consumed by the SPA.

**New Flask AI or Terminal Capability:**
- HTTP route: add `@app.route('/api/...', methods=['POST'])` to `backend/app.py`.
- Socket event: add a `@socketio.on(...)` handler in `backend/app.py`.
- Browser caller: add a function in `src/services/gemini.ts` or extend `src/components/XTerm.tsx`.
- Dependencies: update `backend/requirements.txt`.

**New Static Fixture or Asset:**
- Static path: `public/<name>` or `public/test_data/<name>.json`.
- Reference: root-relative path from browser code.

**New Tests:**
- Current repo has no configured test runner.
- For TypeScript tests, add the test runner dependency and script in `package.json`; colocated `*.test.ts` or `*.test.tsx` files would match the existing flat source structure.
- For backend Python tests, add test dependencies to `backend/requirements.txt` and keep tests outside runtime service files.

## Special Directories

**`public/`:**
- Purpose: Vite-served static files.
- Source: Manually maintained fixtures/assets.
- Committed: Yes.

**`dist/`:**
- Purpose: Vite production build output.
- Source: Generated by `npm run build`.
- Committed: No, excluded by `.gitignore`.

**`node_modules/`:**
- Purpose: npm dependency installation.
- Source: Generated by `npm install`.
- Committed: No, excluded by `.gitignore`.

**`.venv/`:**
- Purpose: Optional Python virtual environment for `backend/`.
- Source: Generated locally.
- Committed: No, excluded by `.gitignore`.

**`.planning/`:**
- Purpose: GSD state and codebase mapping docs.
- Source: Generated/maintained by GSD workflow commands.
- Committed: Yes in this workspace.

**`.context/`:**
- Purpose: Scratch notes and todos.
- Source: Manually maintained.
- Committed: Yes in this workspace.

---

*Structure analysis: 2026-04-26*
*Update when directory structure changes*
