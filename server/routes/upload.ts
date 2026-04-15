import express, { Router, Response } from "express";
import multer from "multer";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { pickUploadTarget } from "../services/uploadDistributor.js";
import { decryptToken } from "../utils/encryption.js";
import GoogleApiClient from "../utils/googleApiClient.js";
import prisma from "../utils/prisma.js";

const router: Router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

router.post("/", requireAuth, upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "No file uploaded. Send multipart/form-data with file field 'file'." });
      return;
    }

    const targetAccount = await pickUploadTarget(userId, file.size);

    const apiClient = new GoogleApiClient(
      {
        id: targetAccount.id,
        accessToken: decryptToken(targetAccount.accessToken),
        refreshToken: decryptToken(targetAccount.refreshToken),
        tokenExpiry: targetAccount.tokenExpiry,
      },
      prisma
    );

    const uploadToken = await apiClient.uploadBytes(file.buffer, file.mimetype || "application/octet-stream", file.originalname);
    const mediaItem = await apiClient.createMediaItem(uploadToken, file.originalname);

    const takenAt = mediaItem.mediaMetadata?.creationTime
      ? new Date(mediaItem.mediaMetadata.creationTime)
      : new Date();

    const savedPhoto = await prisma.photo.upsert({
      where: { googleMediaId: mediaItem.id },
      update: {
        googleAccountId: targetAccount.id,
        filename: mediaItem.filename || file.originalname,
        takenAt,
        width: mediaItem.mediaMetadata?.width ? parseInt(mediaItem.mediaMetadata.width, 10) : 0,
        height: mediaItem.mediaMetadata?.height ? parseInt(mediaItem.mediaMetadata.height, 10) : 0,
        baseUrl: mediaItem.baseUrl || "",
        thumbnailUrl: mediaItem.baseUrl ? `${mediaItem.baseUrl}=w512-h512` : "",
        baseUrlExpiry: new Date(Date.now() + 55 * 60 * 1000),
        sizeBytes: mediaItem.mediaFile?.sizeBytes ? BigInt(mediaItem.mediaFile.sizeBytes) : BigInt(file.size),
        isVideo: mediaItem.mimeType?.startsWith("video/") || false,
        syncedAt: new Date(),
      },
      create: {
        googleAccountId: targetAccount.id,
        googleMediaId: mediaItem.id,
        filename: mediaItem.filename || file.originalname,
        takenAt,
        width: mediaItem.mediaMetadata?.width ? parseInt(mediaItem.mediaMetadata.width, 10) : 0,
        height: mediaItem.mediaMetadata?.height ? parseInt(mediaItem.mediaMetadata.height, 10) : 0,
        baseUrl: mediaItem.baseUrl || "",
        thumbnailUrl: mediaItem.baseUrl ? `${mediaItem.baseUrl}=w512-h512` : "",
        baseUrlExpiry: new Date(Date.now() + 55 * 60 * 1000),
        sizeBytes: mediaItem.mediaFile?.sizeBytes ? BigInt(mediaItem.mediaFile.sizeBytes) : BigInt(file.size),
        isVideo: mediaItem.mimeType?.startsWith("video/") || false,
      },
    });

    const quota = await apiClient.getStorageQuota();
    await prisma.googleAccount.update({
      where: { id: targetAccount.id },
      data: {
        storageUsedBytes: BigInt(quota.usage || 0),
        storageTotalBytes: BigInt(quota.limit || 16106127360),
      },
    });

    res.status(201).json({
      message: `Uploaded to ${targetAccount.email} (most free space)`,
      accountId: targetAccount.id,
      accountEmail: targetAccount.email,
      photo: {
        id: savedPhoto.id,
        googleMediaId: savedPhoto.googleMediaId,
        filename: savedPhoto.filename,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "All accounts are full. Please add a new Google account." ? 409 : 500;
    res.status(status).json({ error: message });
  }
});

export default router;
