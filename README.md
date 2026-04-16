# PhotoVault

PhotoVault is a full-stack app that connects multiple Google accounts and gives users one unified Google Photos dashboard.

## Monorepo Structure
```
photovault/
  client/   # React + Vite + Tailwind frontend
  server/   # Node.js + Express backend
  prisma/   # Prisma schema
```

## Prerequisites
1. Node.js 20+
2. Docker + Docker Compose
3. A Google Cloud project with OAuth credentials

## 1) Create a Google Cloud Project
1. Open Google Cloud Console.
2. Create a new project named `PhotoVault` (or any name you prefer).
3. Select that project in the project picker.

## 2) Enable Required APIs
Enable these APIs in the selected project:
1. Google Photos Library API
2. Google Drive API

Path in Google Cloud Console:
1. APIs & Services
2. Library
3. Search each API and click Enable

## 3) Configure OAuth Consent Screen
1. Go to APIs & Services -> OAuth consent screen.
2. Choose External (unless your organization requires Internal).
3. Fill app info:
	- App name: PhotoVault
	- Support email: your email
	- Developer contact: your email
4. Add scopes used by backend:
	- `https://www.googleapis.com/auth/photoslibrary`
	- `https://www.googleapis.com/auth/drive.metadata.readonly`
	- `https://www.googleapis.com/auth/userinfo.email`
5. Add test users for development if app is in testing mode.

## 4) Create OAuth Client and Redirect URIs
1. Go to APIs & Services -> Credentials.
2. Click Create Credentials -> OAuth client ID.
3. Choose Web application.
4. Add Authorized redirect URIs:
	- Local development: `http://localhost:3001/auth/google/callback`
	- Add-account local: `http://localhost:3001/auth/google/add-account/callback`
	- Production primary: `https://your-domain.com/auth/google/callback`
	- Production add-account: `https://your-domain.com/auth/google/add-account/callback`
5. Save and copy Client ID and Client Secret.

## 5) Configure Environment (.env)
1. Copy template:
	- `cp .env.example .env`
2. Fill values in `.env`:
	- `GOOGLE_CLIENT_ID=` from Google Cloud OAuth client
	- `GOOGLE_CLIENT_SECRET=` from Google Cloud OAuth client
	- `DATABASE_URL=postgresql://photovault:photovault@localhost:5432/photovault`
	- `REDIS_URL=redis://localhost:6379`
	- `ENCRYPTION_KEY=` 32-byte hex string
	- `SESSION_SECRET=` any long random string
	- `CLIENT_URL=http://localhost:5173`
	- `PORT=3001`

Generate a secure encryption key:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 6) Start Infrastructure with Docker Compose
This repository includes Docker services in [docker-compose.yml](docker-compose.yml):
1. PostgreSQL (`photovault-postgres`) on `5432`
2. Redis (`photovault-redis`) on `6379`

Start containers:
```
docker compose up -d
```

Stop containers:
```
docker compose down
```

## 7) Install Dependencies and Generate Prisma Client
From repo root:
```
npm install
npm run prisma:generate
```

Apply migrations:
```
npm run prisma:migrate
```

## 8) Run the App Locally
Run backend:
```
npm run dev:server
```

Run frontend:
```
npm run dev:client
```

Open:
1. Frontend: `http://localhost:5173`
2. Backend health: `http://localhost:3001/health`

## Notes
1. Frontend never calls Google APIs directly.
2. Photos are served through backend proxy endpoints.
3. Storage and notifications depend on Redis worker jobs.

## Project Docs
1. [docs/context/PROJECT_BRIEF.md](docs/context/PROJECT_BRIEF.md)
2. [docs/context/ARCHITECTURE_DECISIONS.md](docs/context/ARCHITECTURE_DECISIONS.md)
3. [docs/context/API_CONTRACT.md](docs/context/API_CONTRACT.md)
4. [docs/context/BUILD_PLAN.md](docs/context/BUILD_PLAN.md)
5. [docs/context/HANDOFF_CONTEXT.md](docs/context/HANDOFF_CONTEXT.md)
