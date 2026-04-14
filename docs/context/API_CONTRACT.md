# API Contract

## Auth Routes
- GET /auth/google
  - Starts OAuth login for primary account.
- GET /auth/google/callback
  - Handles OAuth callback for primary account.
- GET /auth/google/add-account
  - Starts OAuth flow to attach another Google account.
- GET /auth/google/add-account/callback
  - Saves additional Google account to existing user.
- GET /auth/accounts
  - Returns connected accounts.
- DELETE /auth/accounts/:id
  - Disconnects selected account.

## Photos Routes
- GET /photos?cursor=&limit=50
  - Unified timeline pagination from local DB.
- GET /photos/:id/thumbnail
  - Backend thumbnail proxy stream.
  - Must refresh base URL if expired.
- GET /photos/:id
  - Single photo detail.

## Sync Routes
- POST /sync/:accountId
  - Trigger sync for one account.
- POST /sync/all
  - Trigger sync for all accounts.
- GET /sync/status
  - BullMQ queue/job status.

## Upload + Storage Routes
- POST /upload
  - Smart upload endpoint; auto-selects account with most free space.
- GET /storage/summary
  - Per-account + total storage stats.

## Notification Routes
- GET /notifications
  - Returns unseen user alerts.
