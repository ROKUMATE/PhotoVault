import { http } from "./http";
import type {
  ConnectedAccountsResponse,
  DisconnectAccountResponse,
  GalleryPageResponse,
  NotificationResponse,
  PickerAuthResponse,
  StorageSummaryResponse,
  UploadResponse,
} from "./types";

export async function fetchGalleryPage(cursor?: string | null, limit = 50): Promise<GalleryPageResponse> {
  const response = await http.get<GalleryPageResponse>("/photos", {
    params: {
      cursor: cursor || undefined,
      limit,
    },
  });

  return response.data;
}

export async function fetchStorageSummary(): Promise<StorageSummaryResponse> {
  const response = await http.get<StorageSummaryResponse>("/storage/summary");
  return response.data;
}

export async function fetchNotifications(): Promise<NotificationResponse> {
  const response = await http.get<NotificationResponse>("/notifications");
  return response.data;
}

export async function uploadPhoto(file: File, onProgress?: (progressPercent: number) => void): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await http.post<UploadResponse>("/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    onUploadProgress: (progressEvent) => {
      if (!progressEvent.total) {
        return;
      }

      onProgress?.(Math.round((progressEvent.loaded / progressEvent.total) * 100));
    },
  });

  return response.data;
}

export async function fetchThumbnailBlob(photoId: string): Promise<Blob> {
  const response = await http.get(`/photos/${photoId}/thumbnail`, {
    responseType: "blob",
  });

  return response.data;
}

export async function fetchConnectedAccounts(): Promise<ConnectedAccountsResponse> {
  const response = await http.get<ConnectedAccountsResponse>("/auth/accounts");
  return response.data;
}

export async function disconnectAccount(accountId: string): Promise<DisconnectAccountResponse> {
  const response = await http.delete<DisconnectAccountResponse>(`/auth/accounts/${accountId}`);
  return response.data;
}

export async function fetchPickerAuth(accountId: string): Promise<PickerAuthResponse> {
  const response = await http.get<PickerAuthResponse>(`/auth/accounts/${accountId}/picker-auth`);
  return response.data;
}

export async function importPickedPhotos(accountId: string, mediaItems: any[]): Promise<{ imported: number }> {
  const response = await http.post<{ imported: number }>('/photos/import', {
    accountId,
    mediaItems
  });
  return response.data;
}
