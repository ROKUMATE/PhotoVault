# Build Plan (Strict Sequence)

Follow this order exactly unless explicitly overridden.

## Step 1
Project skeleton + Prisma schema + Docker Compose.

### Deliverables
- Directory structure:
  - client/src/components
  - client/src/pages
  - client/src/hooks
  - client/src/api
  - server/routes
  - server/services
  - server/workers
  - server/middleware
  - server/utils
  - prisma/schema.prisma
- docker-compose.yml with Postgres + Redis
- .env.example with required vars
- Basic README setup instructions

## Step 2
Google OAuth multi-account system.

### Deliverables
- Passport Google strategy setup
- Primary login and add-account OAuth flows
- Account linking in DB
- Token encryption/decryption utilities
- Auth account list/disconnect endpoints

## Step 3
Photo sync engine + BullMQ worker.

### Deliverables
- Sync services per account + all accounts
- BullMQ queue + worker + retry/backoff
- Storage quota sync logic
- Persist metadata in DB

## Step 4
Unified gallery API + thumbnail proxy.

### Deliverables
- Timeline pagination endpoint
- Single-photo detail endpoint
- Thumbnail proxy with base URL refresh behavior

## Step 5
Smart distributor + upload endpoint.

### Deliverables
- Account selection by max free space
- Upload logic routed to selected account
- Success response includes target account email

## Step 6
React frontend pages/components.

### Deliverables
- Login page
- Dashboard layout (navbar, sidebar, timeline)
- Settings page
- Notifications dropdown
- Infinite scroll and loading skeletons
- Upload FAB + progress + toasts

## Step 7
Polish.

### Deliverables
- Error handling and edge cases
- UI polishing and states
- Documentation and setup verification
