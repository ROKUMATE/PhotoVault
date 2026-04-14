# Architecture Decisions (Non-Negotiable)

## Core Principles
1. Frontend never calls Google APIs directly.
2. Frontend talks only to PhotoVault backend API.
3. Photo metadata is cached in Postgres and timeline reads from DB.
4. Sync jobs are the only path that fetches metadata from Google.
5. Access tokens refresh automatically and transparently.

## Token + URL Lifecycle
- Store Google access/refresh tokens encrypted (AES-256).
- Refresh access tokens before Google calls when needed.
- Google Photos base URLs expire around 1 hour.
- Thumbnail proxy must validate base URL expiry and refresh base URL if stale.

## Rate Limiting + Reliability
- BullMQ workers limited to max 3 Google API calls per second.
- Retry with exponential backoff for HTTP 429 cases.

## Upload Distribution Rule
- Always choose account with max free space.
- Formula: free = storageTotalBytes - storageUsedBytes.

## Account Color Rule
Account badge colors are fixed by account index:
- #4285F4
- #EA4335
- #34A853
- #FBBC04
- #9334E6
- #00BCD4
- #FF6D00
- #F06292

This mapping must be deterministic so an account retains the same visual color.
