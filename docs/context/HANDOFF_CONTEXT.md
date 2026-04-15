# Cross-IDE Handoff Context

Use this file to resume work in another IDE/agent without re-sharing the full brief.

## Project
PhotoVault: unified multi-account Google Photos manager.

## Problem It Solves
- Aggregates photo timeline across multiple Google accounts.
- Routes uploads to account with most free storage.
- Shows storage usage totals across all linked accounts.

## Hard Constraints
- Frontend calls only backend, never Google APIs directly.
- Server stores metadata only, not photo binaries.
- Tokens encrypted with AES-256.
- Timeline served from Postgres cache.
- Background sync fetches from Google APIs.
- BullMQ workers rate-limited to 3 calls/sec with exponential backoff on 429.
- Thumbnail proxy refreshes expired Google base URLs.

## Tech Stack
- Frontend: React (Vite), TailwindCSS, React Query, Axios, react-hot-toast
- Backend: Node.js, Express, Passport Google OAuth, Prisma, BullMQ
- Infra: PostgreSQL, Redis, Docker Compose

## Canonical Build Sequence
1. Skeleton + Prisma + Docker
2. OAuth multi-account
3. Sync engine + BullMQ
4. Unified gallery API + thumbnail proxy
5. Smart upload distributor
6. Frontend pages and UX
7. Polish

## Current Status
Step 4 completed as well: unified photo gallery API.
- Full TypeScript/TSX codebase throughout (server and client)
- Photo sync engine with automated token refresh, rate limiting, and exponential backoff
- BullMQ job queue worker for async sync jobs
- Sync routes implemented: POST /sync/:accountId, POST /sync/all, GET /sync/status
- Gallery routes implemented: GET /photos, GET /photos/:id, GET /photos/:id/thumbnail
- Photos are queried from local Postgres only; thumbnails refresh expired Google base URLs lazily
- Main server entry point: `server/src/index.ts` (uses tsx runner)
- Dependencies installed for frontend/backend stack and Prisma client generation is configured.

## Instruction For Any New Agent Session
- Follow docs/context files as source of truth.
- Do not deviate from architecture or sequencing unless user explicitly requests changes.
- If user says "now build step X", implement only that step and keep docs updated.

## Quick Resume Prompt
"Continue PhotoVault from this repository. Read docs/context/PROJECT_BRIEF.md, docs/context/ARCHITECTURE_DECISIONS.md, docs/context/API_CONTRACT.md, docs/context/BUILD_PLAN.md, and docs/context/HANDOFF_CONTEXT.md. Then implement the next requested step without deviating from these constraints."
