# PhotoVault Master Brief

## Product Summary
PhotoVault is a full-stack web application that lets one user connect multiple Google accounts and manage all Google Photos from one unified UI.

The key user behavior: people create multiple Google accounts to extend free cloud storage (15 GB per account), but currently cannot manage all photos in one timeline.

## Problems Solved
1. No unified view across multiple Google Photos accounts.
2. No intelligent upload routing based on free storage.
3. No total storage visibility across all connected accounts.

## Target User
Users with 2-10 Google accounts used for extra storage of photos/videos.

## Core Features
1. Multi-account Google OAuth in one PhotoVault session.
2. Unified photo timeline across all linked accounts.
3. Smart upload distributor (account with most free space).
4. Storage dashboard (per-account and total usage).
5. Background metadata sync from all connected accounts.
6. Storage alerts when any account crosses 90% usage.

## Non-Goals
- Do not store real photo binaries on PhotoVault servers.
- Do not merge accounts in Google ecosystem.
- Not a photo editing tool.

## Stack

### Frontend
- React (Vite)
- TailwindCSS
- React Query
- react-hot-toast
- Axios

### Backend
- Node.js + Express
- Passport.js + passport-google-oauth20
- Prisma ORM
- BullMQ
- AES-256 encryption for tokens using Node crypto

### Infrastructure
- PostgreSQL
- Redis
- Docker Compose for local Postgres + Redis

### Google APIs
- Google Photos Library API
- Google Drive API (storage quota)

### OAuth Scopes
- https://www.googleapis.com/auth/photoslibrary
- https://www.googleapis.com/auth/drive.metadata.readonly
- https://www.googleapis.com/auth/userinfo.email
## April 2026 Architectural Shift
Due to restrictive changes in the Google Photos Library API (removal of `photoslibrary.readonly`), PhotoVault resolves to use the **Google Photos Picker API** (Option 2) to manually import historical photos per user selection. To ensure long-tail viability for a unified storage dashboard without restrictions, the product will eventually pivot to utilizing Google Drive (Option 3) as the backend image storage vault.


## April 2026 Architectural Shift
Due to restrictive changes in the Google Photos Library API (removal of `photoslibrary.readonly`), PhotoVault resolves to use the **Google Photos Picker API** (Option 2) to manually import historical photos per user selection. To ensure long-tail viability for a unified storage dashboard without restrictions, the product will eventually pivot to utilizing Google Drive (Option 3) as the backend image storage vault.