import axios, { AxiosError } from "axios";
import { PrismaClient, GoogleAccount } from "@prisma/client";
import { decryptToken, encryptToken } from "./encryption.js";

const GOOGLE_PHOTOS_API_BASE = "https://photoslibrary.googleapis.com/v1";
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

interface MediaItem {
  id: string;
  filename: string;
  mediaMetadata: {
    creationTime: string;
    width?: string;
    height?: string;
  };
  baseUrl?: string;
  mimeType?: string;
  mediaFile?: {
    sizeBytes?: string;
  };
}

interface MediaItemsResponse {
  mediaItems?: MediaItem[];
  nextPageToken: string | null;
}

interface BatchCreateResponse {
  newMediaItemResults?: Array<{
    uploadToken?: string;
    status?: {
      code?: number;
      message?: string;
    };
    mediaItem?: MediaItem;
  }>;
}

interface StorageQuota {
  usage?: string;
  limit?: string;
}

interface About {
  storageQuota: StorageQuota;
}

interface GoogleApiError extends Error {
  status?: number;
  retryAfter?: string;
}

type GoogleAccountWithTokens = Pick<GoogleAccount, "id" | "accessToken" | "refreshToken" | "tokenExpiry">;

/**
 * Client wrapper for Google Photos and Drive APIs
 * Handles automatic token refresh and error handling
 */
class GoogleApiClient {
  private googleAccount: GoogleAccountWithTokens;
  private prismaClient: PrismaClient;

  constructor(googleAccount: GoogleAccountWithTokens, prismaClient: PrismaClient) {
    this.googleAccount = googleAccount;
    this.prismaClient = prismaClient;
  }

  /**
   * Get valid access token, refreshing if necessary
   */
  async getValidAccessToken(): Promise<string> {
    const now = new Date();

    // If token expired or expiring within 5 minutes, refresh it
    if (this.googleAccount.tokenExpiry <= new Date(now.getTime() + 5 * 60 * 1000)) {
      await this.refreshToken();
    }

    return this.googleAccount.accessToken;
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshToken(): Promise<void> {
    try {
      const decryptedRefreshToken = decryptToken(this.googleAccount.refreshToken);
      const response = await axios.post<{
        access_token: string;
        expires_in: number;
      }>("https://oauth2.googleapis.com/token", {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: decryptedRefreshToken,
        grant_type: "refresh_token",
      });

      const { access_token, expires_in } = response.data;

      // Update in database
      const newExpiry = new Date(Date.now() + expires_in * 1000);
      const refreshedAccount = await this.prismaClient.googleAccount.update({
        where: { id: this.googleAccount.id },
        data: {
          accessToken: encryptToken(access_token),
          tokenExpiry: newExpiry,
        },
      });

      this.googleAccount = {
        id: refreshedAccount.id,
        accessToken: access_token,
        refreshToken: decryptedRefreshToken,
        tokenExpiry: refreshedAccount.tokenExpiry,
      };
    } catch (error: unknown) {
      const message =
        error instanceof AxiosError ? error.message : "Unknown error during token refresh";
      console.error(`Token refresh failed for account ${this.googleAccount.id}:`, message);
      throw new Error(`Failed to refresh token for account ${this.googleAccount.id}`);
    }
  }

  /**
   * Fetch media items from Google Photos Library API using mediaItems.list
   */
  async fetchMediaItems(pageToken: string | null = null): Promise<MediaItemsResponse> {
    const accessToken = await this.getValidAccessToken();

    try {
      const response = await axios.get<MediaItemsResponse>(`${GOOGLE_PHOTOS_API_BASE}/mediaItems`, {
        params: {
          pageSize: 100,
          pageToken: pageToken || undefined,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return {
        mediaItems: response.data.mediaItems || [],
        nextPageToken: response.data.nextPageToken ?? null,
      };
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 429) {
        const googleError: GoogleApiError = new Error("Rate limited");
        googleError.status = 429;
        googleError.retryAfter = axiosError.response.headers["retry-after"] as string;
        throw googleError;
      }
      throw error;
    }
  }

  /**
   * Fetch a single media item by ID from Google Photos Library API
   */
  async fetchMediaItem(mediaItemId: string): Promise<MediaItem> {
    const accessToken = await this.getValidAccessToken();

    try {
      const response = await axios.get<MediaItem>(
        `${GOOGLE_PHOTOS_API_BASE}/mediaItems/${mediaItemId}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 429) {
        const googleError: GoogleApiError = new Error("Rate limited");
        googleError.status = 429;
        googleError.retryAfter = axiosError.response.headers["retry-after"] as string;
        throw googleError;
      }
      throw error;
    }
  }

  /**
   * Upload raw file bytes to Google Photos and return upload token
   */
  async uploadBytes(fileBuffer: Buffer, mimeType: string, fileName: string): Promise<string> {
    const accessToken = await this.getValidAccessToken();

    const response = await axios.post<string>(`${GOOGLE_PHOTOS_API_BASE}/uploads`, fileBuffer, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-type": "application/octet-stream",
        "X-Goog-Upload-Content-Type": mimeType,
        "X-Goog-Upload-Protocol": "raw",
        "X-Goog-Upload-File-Name": fileName,
      },
      responseType: "text",
    });

    return response.data;
  }

  /**
   * Create a media item from upload token
   */
  async createMediaItem(uploadToken: string, fileName: string): Promise<MediaItem> {
    const accessToken = await this.getValidAccessToken();

    const response = await axios.post<BatchCreateResponse>(
      `${GOOGLE_PHOTOS_API_BASE}/mediaItems:batchCreate`,
      {
        newMediaItems: [
          {
            simpleMediaItem: {
              uploadToken,
              fileName,
            },
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = response.data.newMediaItemResults?.[0];
    if (!result || !result.mediaItem) {
      throw new Error(result?.status?.message || "Failed to create media item");
    }

    return result.mediaItem;
  }

  /**
   * Get storage quota from Google Drive API
   */
  async getStorageQuota(): Promise<StorageQuota> {
    const accessToken = await this.getValidAccessToken();

    try {
      const response = await axios.get<About>(
        `${GOOGLE_DRIVE_API_BASE}/about?fields=storageQuota`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      return response.data.storageQuota;
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 429) {
        const googleError: GoogleApiError = new Error("Rate limited");
        googleError.status = 429;
        googleError.retryAfter = axiosError.response.headers["retry-after"] as string;
        throw googleError;
      }
      throw error;
    }
  }
}

export default GoogleApiClient;
