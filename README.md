# PhotoVault

PhotoVault is a full-stack app to connect multiple Google accounts and manage Google Photos in one unified interface.

## Current Status
Step 3 and Step 4 backend APIs are complete:
- Full TypeScript/TSX codebase (backend + frontend)
- Photo sync engine with Google Photos Library API integration
- BullMQ worker with rate limiting (3 calls/sec) and exponential backoff
- Sync routes complete (POST /sync/:accountId, POST /sync/all, GET /sync/status)
- Token encryption with AES-256
- Unified photo gallery API (GET /photos, GET /photos/:id, GET /photos/:id/thumbnail)
- Cursor pagination by createdAt + id and per-account color mapping

## Previous Completion
Step 1 foundation initialized:
- Monorepo skeleton (`client`, `server`, `prisma`)
- React + Vite frontend scaffold
- Express backend scaffold
- Prisma schema for core entities
- Docker Compose for PostgreSQL + Redis
- Environment template

Step 2 (OAuth) is next to build.

## Start Here
- Master project context: `docs/context/PROJECT_BRIEF.md`
- Architecture and non-negotiables: `docs/context/ARCHITECTURE_DECISIONS.md`
- API map and contracts: `docs/context/API_CONTRACT.md`
- Build sequence and delivery checkpoints: `docs/context/BUILD_PLAN.md`
- Cross-IDE handoff prompt: `docs/context/HANDOFF_CONTEXT.md`

## Monorepo Structure
```
photovault/
  client/   # React + Vite frontend
  server/   # Node.js + Express backend
  prisma/   # Prisma schema
```

## Prerequisites
- Node.js 20+
- Docker + Docker Compose

## Local Setup
1. Install dependencies:
	- `npm install`
	- `npm install --prefix server`
2. Copy env file:
	- `cp .env.example .env`
3. Start infrastructure:
	- `docker compose up -d`
4. Generate Prisma client:
	- `npm run prisma:generate`
5. Start apps separately as needed:
	- Client: `npm run dev:client`
	- Server: `npm run dev:server`

## Workflow Rule
Follow the build sequence in `docs/context/BUILD_PLAN.md` and do not deviate unless explicitly requested.
