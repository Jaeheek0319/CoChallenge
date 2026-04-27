# CoChallenge

CoChallenge is a full-stack learning platform for building, sharing, and grading coding challenges with AI-enhanced lesson generation.

The project combines:
- A React + Vite frontend in `src/`
- An Express API backend in `server/`
- A Python Flask agent service in `backend/` for Google Gemini / ADK-powered project generation and ranking
- Supabase authentication and storage integration
- MongoDB for application data persistence

## Key Features

- User authentication and profile management
- Challenge creation, submission, grading, and leaderboard tracking
- AI-assisted lesson generation via a Gemini ADK pipeline
- Automated AI ranking for submissions using metadata signals
- School projects and guided lessons generated from winning challenge entries
- File upload and signed storage via Supabase

## Repository Structure

- `src/` - React application source
  - `pages/` - main screens like Home, Workspace, Dashboard, Challenges, School, Leaderboard
  - `components/` - reusable UI components
  - `contexts/` - auth and project context providers
  - `hooks/` - custom hooks
  - `lib/` - API clients, utilities, and services
- `server/` - Node.js / Express API, authentication, and database integration
- `backend/` - Python Flask agent service and ADK pipeline
- `public/` - static assets and test data
- `package.json` - frontend/backend scripts and dependencies
- `backend/requirements.txt` - Python dependencies for the agent service

## Prerequisites

- Node.js 18+ installed
- Python 3.11+ installed
- MongoDB connection available
- Supabase project with auth and storage configured
- Google Gemini API key for AI generation and ranking

## Setup

1. Install Node dependencies:

```bash
npm install
```

2. Create a Python virtual environment and install backend dependencies:

```bash
python -m venv .venv
# On macOS / Linux
source .venv/bin/activate
# On Windows PowerShell
.\.venv\Scripts\Activate.ps1

pip install -r backend/requirements.txt
```

3. Create an `.env` file in the project root with the required environment variables.

## Required Environment Variables

```env
MONGODB_URI=
SUPABASE_URL=
SUPABASE_SECRET_KEY=
# or SUPABASE_SERVICE_ROLE_KEY=
SUBMISSION_BUCKET=challenge-submissions
LOGO_BUCKET=logos
GEMINI_API_KEY=
FLASK_URL=http://localhost:5000
RANKER_MODEL=gemini-2.5-flash
```

- `MONGODB_URI` - MongoDB connection string used by the API server
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key for signed uploads and storage access
- `SUBMISSION_BUCKET` - Supabase bucket used for challenge submission uploads
- `LOGO_BUCKET` - Supabase public bucket for company logos
- `GEMINI_API_KEY` - Google Gemini API key used by the Python agent and server ranking pipeline
- `FLASK_URL` - endpoint for the Python agent service (default `http://localhost:5000`)
- `RANKER_MODEL` - optional ranking model override

## Running Locally

The application runs as three cooperating processes:

1. Frontend dev server:
```bash
npm run dev
```

2. Express API server:
```bash
npm run dev:server
```

3. Python Flask agent service:
```bash
npm run dev:agent
```

### Alternative startup

If you prefer a simple startup script on macOS/Linux, `start.sh` shows an example workflow for running frontend, server, and agent services together.

## Build & Preview

Build the frontend assets:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Notes

- The Python backend in `backend/app.py` powers AI-driven project generation using Google Gemini ADK and handles lesson synthesis.
- The Express server in `server/index.ts` manages challenge, submission, ranking, and school project data.
- Authentication is implemented using Supabase JWT tokens verified via `server/auth.ts`.
- MongoDB is used for storing profiles, challenges, submissions, school projects, and Elo history.

## Useful Scripts

- `npm run dev` - start Vite frontend
- `npm run dev:server` - start Express API server
- `npm run dev:agent` - start Python Flask AI agent service
- `npm run build` - build the frontend
- `npm run preview` - preview production build
- `npm run lint` - typecheck the TypeScript source
