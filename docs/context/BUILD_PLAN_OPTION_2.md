# Option 2 Implementation Plan: Google Photos Picker API

## Phase 1: Authentication & Setup
1. Modify Google Cloud Console OAuth consent screen to keep `photoslibrary.readonly.appcreateddata` and `photoslibrary.appendonly`.
2. Ensure the Google Picker API is enabled in the Google Cloud Console library.
3. Add Google API loader script to the frontend (`<script async defer src="https://apis.google.com/js/api.js"></script>`).

## Phase 2: Frontend Integration
1. Build `useGooglePicker` hook using `gapi.picker` inside `client/src/hooks`.
2. Load the Picker using the current OAuth `accessToken` passed from the backend (or fetched anew).
3. When the user clicks "Import Historical Photos", launch the Picker modal allowing them to select multiple photo assets.

## Phase 3: Backend Bridge
1. Create a new REST endpoint (e.g., `POST /sync/import` or `POST /photos/import-batch`) to receive chosen MediaItem IDs from the Picker.
2. The backend uses the `auth` token to fetch the selected photos and upsert them to Prisma database, explicitly bypassing the `photoslibrary.readonly` restriction since the user actively picked them.

## Phase 4: UI Updates
1. Dashboard: Display a clear distinction between "App Uploaded Photos" and "Manually Imported Historical Photos".
2. Introduce an "Import Past Photos" FAB or banner next to the "Upload" button.

Let's review to start Phase 1!