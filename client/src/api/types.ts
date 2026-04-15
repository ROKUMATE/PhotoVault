export interface StorageAccountSummary {
  accountId: string;
  email: string;
  usedGB: number;
  totalGB: number;
  percentUsed: number;
  freeGB: number;
}

export interface StorageSummaryResponse {
  accounts: StorageAccountSummary[];
  combined: {
    usedGB: number;
    totalGB: number;
    percentUsed: number;
    freeGB: number;
  };
}

export interface GalleryPhoto {
  id: string;
  googleMediaId: string;
  googleAccountId: string;
  googleAccountEmail: string;
  accountColor: string;
  filename: string;
  takenAt: string;
  width: number;
  height: number;
  thumbnailUrl: string;
  baseUrl: string;
  baseUrlExpiry: string;
  sizeBytes: string;
  isVideo: boolean;
  syncedAt: string;
  createdAt: string;
}

export interface PhotoGroup {
  date: string;
  photos: GalleryPhoto[];
}

export interface GalleryPageResponse {
  groups: PhotoGroup[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface UploadResponse {
  message: string;
  accountId: string;
  accountEmail: string;
  photo: {
    id: string;
    googleMediaId: string;
    filename: string;
  };
}

export interface NotificationItem {
  id: string;
  userId: string;
  message: string;
  seen: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  count: number;
  notifications: NotificationItem[];
}
