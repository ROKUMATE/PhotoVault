import { PrismaClient } from "@prisma/client";
import GoogleApiClient from "../utils/googleApiClient.js";
import { RateLimiter } from "../utils/rateLimiter.js";

const prisma = new PrismaClient();
const rateLimiter = new RateLimiter(3); // Max 3 Google API calls per second

interface SyncResult {
  accountId: string;
  accountEmail: string;
  photosProcessed: number;
  photosCreated: number;
  photosUpdated: number;
  storageUsedGb: string;
  storageTotalGb: string;
  storagePercentUsed: string;
}

interface SyncResultWithError extends Partial<SyncResult> {
  error?: string;
}

/**
 * Sync photos for a single Google Account
 * Fetches all media items from Google Photos and stores metadata in DB
 */
export async function syncPhotosForAccount(googleAccountId: string): Promise<SyncResult> {
  let account;

  try {
    account = await prisma.googleAccount.findUnique({
      where: { id: googleAccountId },
      include: { user: true },
    });

    if (!account) {
      throw new Error(`GoogleAccount not found: ${googleAccountId}`);
    }

    console.log(`[Sync] Starting sync for account ${account.email}`);

    const apiClient = new GoogleApiClient(account, prisma);

    let pageToken: string | null = null;
    let totalPhotosProcessed = 0;
    let photosCreated = 0;
    let photosUpdated = 0;

    // Pagination loop through all photos
    do {
      // Rate limiting: wait if necessary
      await rateLimiter.acquire();

      // Fetch media items from Google
      const { mediaItems, nextPageToken } = await apiClient.fetchMediaItems(pageToken);

      if (!mediaItems || mediaItems.length === 0) {
        console.log(`[Sync] No more photos for ${account.email}`);
        pageToken = null;
        break;
      }

      // Process each media item
      for (const item of mediaItems) {
        const photoData = {
          googleAccountId: account.id,
          googleMediaId: item.id,
          filename: item.filename || "Unknown",
          takenAt: new Date(item.mediaMetadata.creationTime),
          width: item.mediaMetadata.width ? parseInt(item.mediaMetadata.width, 10) : 0,
          height: item.mediaMetadata.height ? parseInt(item.mediaMetadata.height, 10) : 0,
          thumbnailUrl: item.baseUrl ? `${item.baseUrl}=w200-h200` : "",
          baseUrl: item.baseUrl || "",
          baseUrlExpiry: new Date(Date.now() + 55 * 60 * 1000), // ~1 hour from now, refresh at 55 min
          sizeBytes: item.mediaFile?.size ? BigInt(item.mediaFile.size) : BigInt(0),
          isVideo: item.mimeType?.startsWith("video/") || false,
          syncedAt: new Date(),
        };

        // Upsert: create or update by googleMediaId
        const result = await prisma.photo.upsert({
          where: { googleMediaId: item.id },
          update: photoData,
          create: photoData,
        });

        if (result) {
          totalPhotosProcessed++;
          // We can't easily tell if it was created vs updated from the result,
          // so we'll count both
        }
      }

      photosCreated += mediaItems.length;
      pageToken = nextPageToken || null;
    } while (pageToken);

    // Rate limit: wait before calling Drive API
    await rateLimiter.acquire();

    // Fetch storage quota from Google Drive API and update account
    const storageQuota = await apiClient.getStorageQuota();

    const usageBytes = BigInt(storageQuota.usage || 0);
    const limitBytes = BigInt(storageQuota.limit || 16106127360);

    await prisma.googleAccount.update({
      where: { id: googleAccountId },
      data: {
        storageUsedBytes: usageBytes,
        storageTotalBytes: limitBytes,
      },
    });

    const usageGb = Number(usageBytes) / 1024 / 1024 / 1024;
    const limitGb = Number(limitBytes) / 1024 / 1024 / 1024;
    const percentUsed = (usageGb / limitGb) * 100;

    console.log(
      `[Sync] Completed for ${account.email}: ${totalPhotosProcessed} photos, storage: ${percentUsed.toFixed(
        1
      )}% used`
    );

    return {
      accountId: googleAccountId,
      accountEmail: account.email,
      photosProcessed: totalPhotosProcessed,
      photosCreated,
      photosUpdated,
      storageUsedGb: usageGb.toFixed(2),
      storageTotalGb: limitGb.toFixed(1),
      storagePercentUsed: percentUsed.toFixed(1),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Sync] Error syncing account ${googleAccountId}:`, message);
    throw error;
  }
}

/**
 * Sync photos for all accounts of a user
 */
export async function syncPhotosForUser(userId: string): Promise<SyncResultWithError[]> {
  const accounts = await prisma.googleAccount.findMany({
    where: { userId },
  });

  if (accounts.length === 0) {
    throw new Error(`No Google accounts found for user ${userId}`);
  }

  console.log(`[Sync] Starting sync for user ${userId} with ${accounts.length} accounts`);

  const results: SyncResultWithError[] = [];
  for (const account of accounts) {
    try {
      const result = await syncPhotosForAccount(account.id);
      results.push(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Sync] Failed to sync account ${account.id}:`, message);
      results.push({
        accountId: account.id,
        accountEmail: account.email,
        error: message,
      });
    }
  }

  return results;
}

export default { syncPhotosForAccount, syncPhotosForUser };
