# Photo Sync Engine Documentation

## Overview
The photo sync engine fetches photo metadata from Google Photos Library API and stores it in the local PostgreSQL database. It uses BullMQ for job queuing and includes automatic token refresh, rate limiting, and exponential backoff retry logic.

## Architecture

```
Routes (/sync)
   ↓
BullMQ Queue (photo-sync)
   ↓
Worker (syncWorker.js)
   ↓
Photo Sync Service (photoSync.js)
   ↓
Google API Client (with token refresh)
   ↓
Google Photos Library API + Google Drive API
```

## Key Components

### 1. Google API Client (`server/utils/googleApiClient.js`)
Wrapper for Google API calls with automatic token refresh.

**Features:**
- Automatically refreshes access tokens 5 minutes before expiry
- Handles 429 (rate limit) errors with proper status codes
- Manages both Google Photos and Drive API calls

**Methods:**
- `getValidAccessToken()` - Returns valid access token, refreshing if needed
- `refreshToken()` - Uses refresh token to get new access token
- `fetchMediaItems(pageToken)` - Fetches up to 100 media items from Google Photos
- `getStorageQuota()` - Fetches storage quota from Google Drive API

### 2. Rate Limiter (`server/utils/rateLimiter.js`)
Ensures max 3 Google API calls per second.

**Features:**
- Sliding window approach (last 1 second)
- Non-blocking: `await limiter.acquire()` waits until slot available
- `canMakeCall()` for synchronous checks

```javascript
import { RateLimiter } from "../utils/rateLimiter.js";

const limiter = new RateLimiter(3); // 3 calls/sec max
await limiter.acquire(); // Wait until slot available
// Make API call
```

### 3. Backoff Utility (`server/utils/backoff.js`)
Exponential backoff for retries.

**Methods:**
- `getBackoffMs(attempt)` - Returns exponential backoff delay in ms (with ±10% jitter)
- `isRetryableError(error)` - Returns true for 429, 500, 502, 503, 504 errors

### 4. Photo Sync Service (`server/services/photoSync.js`)
Main business logic for syncing photos.

**Functions:**

#### `syncPhotosForAccount(googleAccountId)`
Syncs all photos for a single Google Account.

```javascript
import { syncPhotosForAccount } from "../services/photoSync.js";

const result = await syncPhotosForAccount(accountId);
// Returns: { accountId, accountEmail, photosProcessed, storageUsedGb, ... }
```

**Process:**
1. Fetches GoogleAccount from DB
2. Creates GoogleApiClient with account tokens
3. Paginates through all media items from Google Photos Library API
4. For each item:
   - Extracts metadata: filename, creation time, dimensions, URLs, size, MIME type
   - Upserts to Photo table (by googleMediaId)
   - Stores baseUrl with 55-minute expiry (refreshed lazily when serving)
5. Fetches storage quota from Google Drive API
6. Updates GoogleAccount with storageUsedBytes and storageTotalBytes
7. Returns summary stats

#### `syncPhotosForUser(userId)`
Syncs all photos for all accounts of a user.

```javascript
const results = await syncPhotosForUser(userId);
// Returns: array of per-account results (some may have errors)
```

### 5. BullMQ Worker (`server/workers/syncWorker.js`)
Background job processor for async sync operations.

**Configuration:**
- **Concurrency:** 1 (one job at a time to respect rate limits)
- **Max retries:** 5
- **Backoff:** Exponential with 1000ms base delay
- **Completed jobs retention:** 1 hour
- **Failed jobs retention:** 24 hours

**Supported Job Types:**
1. `sync-account` - Sync single account
   ```json
   { "type": "sync-account", "accountId": "...", "userId": "..." }
   ```

2. `sync-user` - Sync all accounts for a user
   ```json
   { "type": "sync-user", "userId": "..." }
   ```

**Error Handling:**
- Retryable errors (429, 5xx): automatic exponential backoff
- Non-retryable errors: fail immediately

### 6. Sync Routes (`server/routes/sync.js`)

#### `POST /sync/:accountId`
Trigger manual sync for a specific Google Account.

**Request:**
```bash
curl -X POST http://localhost:3001/sync/123abc \
  -H "x-user-id: user123"
```

**Response (202):**
```json
{
  "message": "Sync started",
  "jobId": "12345",
  "accountId": "123abc"
}
```

#### `POST /sync/all`
Trigger sync for all accounts of the logged-in user.

**Request:**
```bash
curl -X POST http://localhost:3001/sync/all \
  -H "x-user-id: user123"
```

**Response (202):**
```json
{
  "message": "Full sync started for all accounts",
  "jobId": "12345",
  "userId": "user123"
}
```

#### `GET /sync/status`
Get current sync job status from BullMQ queue.

**Request:**
```bash
curl http://localhost:3001/sync/status \
  -H "x-user-id: user123"
```

**Response (200):**
```json
{
  "queueStats": {
    "active": 1,
    "waiting": 3,
    "delayed": 0,
    "completed": 25,
    "failed": 0
  },
  "userJobs": {
    "activeCount": 1,
    "completedCount": 5,
    "recentJobs": [
      {
        "id": "12345",
        "data": { "type": "sync-account", "accountId": "..." },
        "progress": 50,
        "attemptsMade": 0
      }
    ]
  }
}
```

## Token Encryption (`server/utils/encryption.js`)

Stores Google OAuth tokens encrypted with AES-256.

```javascript
import { encryptToken, decryptToken } from "../utils/encryption.js";

// Store in DB
const encrypted = encryptToken(accessToken);
// await prisma.googleAccount.create({ accessToken: encrypted, ... });

// Retrieve from DB
const accessToken = decryptToken(encrypted);
```

**Requirements:**
- `ENCRYPTION_KEY` env var: 32-byte hex string
- Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Photo Metadata Schema

Photos stored in the database include:

```javascript
{
  googleMediaId: "media-id-from-google", // @unique
  filename: "IMG_1234.jpg",
  takenAt: DateTime,                      // Photo creation time
  width: 4096,
  height: 3072,
  thumbnailUrl: "https://...",            // Pre-sized to 200x200
  baseUrl: "https://lh3.googleusercontent.com/...",
  baseUrlExpiry: DateTime,                // Refreshed lazily when serving (every ~55 min)
  sizeBytes: 2048000n,
  isVideo: false,
  syncedAt: DateTime,                     // When this metadata was synced
}
```

## Rate Limiting & Backoff

### Rate Limiter
- **Max calls:** 3 per second
- **Implementation:** Sliding 1-second window
- **Fairness:** `await limiter.acquire()` blocks until slot available

### Backoff on 429 / Server Errors
- **Formula:** `2^attempt * 1000ms ± 10% jitter`
- **Attempt 1:** ~1 second
- **Attempt 2:** ~2 seconds
- **Attempt 3:** ~4 seconds
- **Attempt 4:** ~8 seconds
- **Attempt 5:** ~16 seconds
- **Total max wait:** ~31 seconds

Example retry timeline for a 429 error:
```
Attempt 1: Get 429 → wait 1.2s
Attempt 2: Get 429 → wait 2.1s
Attempt 3: Get 429 → wait 3.8s
Attempt 4: Get 429 → wait 8.4s
Attempt 5: Fail with "Max retries exceeded"
```

## Testing the Sync Engine

### 1. Start server and Redis
```bash
docker compose up -d
npm run dev:server
```

### 2. Create test data (manual DB insert or via GraphQL/API)
```javascript
// Create user and account (Step 2 will automate this via OAuth)
const user = await prisma.user.create({
  data: { email: "test@example.com" }
});

const account = await prisma.googleAccount.create({
  data: {
    userId: user.id,
    email: "photos@gmail.com",
    accessToken: encryptToken("real-google-access-token"),
    refreshToken: encryptToken("real-google-refresh-token"),
    tokenExpiry: new Date(Date.now() + 3600 * 1000),
  }
});
```

### 3. Trigger sync
```bash
# Sync single account
curl -X POST http://localhost:3001/sync/abc123 \
  -H "x-user-id: userid123" \
  -H "Content-Type: application/json"

# Check status
curl http://localhost:3001/sync/status \
  -H "x-user-id: userid123"
```

### 4. Monitor logs
```bash
# Watch server logs for sync progress
# Watch Redis for job queue
```

## Integration Points

### With OAuth (Step 2)
- When user connects a Google account, store encrypted tokens
- GoogleAccount.accessToken and refreshToken come from OAuth flow

### With Photo Gallery (Step 4)
- Listed photos served from the Photo table (cached metadata)
- baseUrl used for thumbnail proxy
- baseUrl refreshed lazily when approaching expiry

### With Upload (Step 5)
- Smart distributor checks storageTotalBytes - storageUsedBytes per account
- Selects account with max free space

## Environment Variables Required

```
GOOGLE_CLIENT_ID=              # From Google Cloud Console
GOOGLE_CLIENT_SECRET=          # From Google Cloud Console
DATABASE_URL=                  # PostgreSQL connection string
REDIS_URL=                     # Redis connection string (default: redis://localhost:6379)
ENCRYPTION_KEY=                # 32-byte hex string (generate with crypto.randomBytes(32).toString('hex'))
```

## Common Issues & Troubleshooting

### Issue: "Cannot find @prisma/client"
**Solution:** Run `npm install` in server directory

### Issue: Redis connection refused
**Solution:** Ensure Redis is running (`docker compose up -d redis`)

### Issue: Google API 401 Unauthorized
**Solution:** Check that refresh token is valid and not expired

### Issue: Rate limiter blocking all calls
**Solution:** Check that Redis is accessible; rate limiter uses in-memory window

### Issue: Photos not syncing
**Solution:** Check worker logs; ensure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set
