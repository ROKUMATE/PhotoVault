import axios from "axios";
import { Photo, GoogleAccount } from "@prisma/client";
import GoogleApiClient from "../utils/googleApiClient.js";
import { decryptToken } from "../utils/encryption.js";
import prisma from "../utils/prisma.js";
import { ACCOUNT_COLORS, buildAccountColorMap } from "../utils/accountColors.js";

export interface PhotoCursor {
  createdAt: string;
  id: string;
}

export interface GalleryPhotoDto {
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

export interface PhotoGroupDto {
  date: string;
  photos: GalleryPhotoDto[];
}

export interface GalleryPageDto {
  groups: PhotoGroupDto[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

export interface PhotoDetailDto extends GalleryPhotoDto {}

interface PhotoRecord extends Photo {
  googleAccount: Pick<GoogleAccount, "id" | "email" | "accessToken" | "refreshToken" | "tokenExpiry">;
}

const THUMBNAIL_WIDTH = 512;
const THUMBNAIL_HEIGHT = 512;

function encodeCursor(cursor: PhotoCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(cursor: string | undefined): PhotoCursor | null {
  if (!cursor) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as PhotoCursor;
  } catch {
    return null;
  }
}

function toIso(value: Date): string {
  return value.toISOString();
}

function getCalendarDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function buildPhotoDto(photo: PhotoRecord, accountColor: string): GalleryPhotoDto {
  return {
    id: photo.id,
    googleMediaId: photo.googleMediaId,
    googleAccountId: photo.googleAccountId,
    googleAccountEmail: photo.googleAccount.email,
    accountColor,
    filename: photo.filename,
    takenAt: toIso(photo.takenAt),
    width: photo.width,
    height: photo.height,
    thumbnailUrl: `/photos/${photo.id}/thumbnail`,
    baseUrl: photo.baseUrl,
    baseUrlExpiry: toIso(photo.baseUrlExpiry),
    sizeBytes: photo.sizeBytes.toString(),
    isVideo: photo.isVideo,
    syncedAt: toIso(photo.syncedAt),
    createdAt: toIso(photo.createdAt),
  };
}

async function getUserAccountColorMap(userId: string): Promise<Map<string, string>> {
  const accounts = await prisma.googleAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return buildAccountColorMap(accounts.map((account) => account.id));
}

export async function getGalleryPage(userId: string, limit = 50, cursor?: string): Promise<GalleryPageDto> {
  const safeLimit = Number.isFinite(limit) ? limit : 50;
  const take = Math.min(Math.max(safeLimit, 1), 100);
  const decodedCursor = decodeCursor(cursor);
  const accountColorMap = await getUserAccountColorMap(userId);

  const photos = await prisma.photo.findMany({
    where: {
      googleAccount: { userId },
      ...(decodedCursor
        ? {
            OR: [
              { createdAt: { lt: new Date(decodedCursor.createdAt) } },
              {
                createdAt: new Date(decodedCursor.createdAt),
                id: { lt: decodedCursor.id },
              },
            ],
          }
        : {}),
    },
    include: {
      googleAccount: {
        select: {
          id: true,
          email: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiry: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: take + 1,
  });

  const hasNextPage = photos.length > take;
  const pagePhotos = hasNextPage ? photos.slice(0, take) : photos;
  const nextCursorPhoto = pagePhotos[pagePhotos.length - 1];

  const grouped = new Map<string, GalleryPhotoDto[]>();

  for (const photo of pagePhotos as PhotoRecord[]) {
    const accountColor = accountColorMap.get(photo.googleAccountId) ?? ACCOUNT_COLORS[0];
    const dto = buildPhotoDto(photo, accountColor);
    const dateKey = getCalendarDate(photo.takenAt);

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }

    grouped.get(dateKey)!.push(dto);
  }

  return {
    groups: Array.from(grouped.entries()).map(([date, photosByDate]) => ({
      date,
      photos: photosByDate,
    })),
    nextCursor: nextCursorPhoto ? encodeCursor({ createdAt: toIso(nextCursorPhoto.createdAt), id: nextCursorPhoto.id }) : null,
    hasNextPage,
  };
}

export async function getPhotoDetail(userId: string, photoId: string): Promise<PhotoDetailDto | null> {
  const photo = await prisma.photo.findFirst({
    where: {
      id: photoId,
      googleAccount: { userId },
    },
    include: {
      googleAccount: {
        select: {
          id: true,
          email: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiry: true,
        },
      },
    },
  });

  if (!photo) {
    return null;
  }

  const accountColorMap = await getUserAccountColorMap(userId);
  const accountColor = accountColorMap.get(photo.googleAccountId) ?? ACCOUNT_COLORS[0];

  return buildPhotoDto(photo as PhotoRecord, accountColor);
}

async function refreshBaseUrlIfNeeded(photoId: string, userId: string): Promise<PhotoRecord | null> {
  const photo = await prisma.photo.findFirst({
    where: {
      id: photoId,
      googleAccount: { userId },
    },
    include: {
      googleAccount: {
        select: {
          id: true,
          email: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiry: true,
        },
      },
    },
  });

  if (!photo) {
    return null;
  }

  if (photo.baseUrlExpiry > new Date() && photo.baseUrl) {
    return photo as PhotoRecord;
  }

  const apiClient = new GoogleApiClient(
    {
      ...photo.googleAccount,
      accessToken: decryptToken(photo.googleAccount.accessToken),
      refreshToken: decryptToken(photo.googleAccount.refreshToken),
    },
    prisma
  );

  const refreshed = await apiClient.fetchMediaItem(photo.googleMediaId);
  const nextBaseUrl = refreshed.baseUrl || photo.baseUrl;
  const nextThumbnailUrl = nextBaseUrl ? `${nextBaseUrl}=w${THUMBNAIL_WIDTH}-h${THUMBNAIL_HEIGHT}` : photo.thumbnailUrl;

  const updated = await prisma.photo.update({
    where: { id: photo.id },
    data: {
      baseUrl: nextBaseUrl,
      thumbnailUrl: nextThumbnailUrl,
      baseUrlExpiry: new Date(Date.now() + 55 * 60 * 1000),
    },
    include: {
      googleAccount: {
        select: {
          id: true,
          email: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiry: true,
        },
      },
    },
  });

  return updated as PhotoRecord;
}

export async function getThumbnailTarget(userId: string, photoId: string): Promise<{ url: string; contentType?: string } | null> {
  const photo = await refreshBaseUrlIfNeeded(photoId, userId);
  if (!photo) {
    return null;
  }

  const url = photo.thumbnailUrl || (photo.baseUrl ? `${photo.baseUrl}=w${THUMBNAIL_WIDTH}-h${THUMBNAIL_HEIGHT}` : "");
  if (!url) {
    return null;
  }

  return { url };
}
