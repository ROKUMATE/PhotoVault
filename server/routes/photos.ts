import { decryptToken } from "../utils/encryption.js";
import prisma from "../utils/prisma.js";
import axios from "axios";
import express, { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { getGalleryPage, getPhotoDetail, getThumbnailTarget } from "../services/photoGallery.js";

const router: Router = express.Router();

router.get("/", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : 50;
    const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;

    const page = await getGalleryPage(userId, limit, cursor);
    res.status(200).json(page);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("GET /photos error:", message);
    res.status(500).json({ error: message });
  }
});

router.get("/:id/thumbnail", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const photoId = String(req.params.id);
    const target = await getThumbnailTarget(userId, photoId);
    if (!target) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    const upstream = await axios.get(target.url, { responseType: "stream" });
    res.setHeader("Content-Type", upstream.headers["content-type"] || "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=300");
    upstream.data.pipe(res);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`GET /photos/${String(req.params.id)}/thumbnail error:`, message);
    res.status(500).json({ error: message });
  }
});

router.get("/:id", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const photoId = String(req.params.id);
    const photo = await getPhotoDetail(userId, photoId);
    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    res.status(200).json(photo);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`GET /photos/${String(req.params.id)} error:`, message);
    res.status(500).json({ error: message });
  }
});


router.post("/import", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const accountId = req.body.accountId;
    const mediaItems = req.body.mediaItems;
    
    if (!accountId || !Array.isArray(mediaItems)) {
      res.status(400).json({ error: "Invalid request body" });
      return;
    }

    const account = await prisma.googleAccount.findFirst({
      where: { id: accountId, userId },
    });

    if (!account) {
      res.status(404).json({ error: "Account not found" });
      return;
    }

    let importedCount = 0;
    
    for (const doc of mediaItems) {
      try {
        const mediaId = doc.id;
        const baseUrl = doc.url || "";
        if (!mediaId || !baseUrl) continue;
        
        const timestamp = doc.lastEditedUtc ? new Date(doc.lastEditedUtc) : new Date();
        const width = doc.width ? parseInt(String(doc.width), 10) : 0;
        const height = doc.height ? parseInt(String(doc.height), 10) : 0;
        const isVideo = doc.mimeType?.startsWith("video/") || doc.type === "video" || false;
        
        const filename = doc.name || doc.description || "Imported Photo";

        const photoData = {
          googleAccountId: account.id,
          filename,
          takenAt: timestamp,
          width,
          height,
          baseUrl: baseUrl.split('=')[0],
          thumbnailUrl: baseUrl,
          baseUrlExpiry: new Date(Date.now() + 55 * 60 * 1000),
          sizeBytes: doc.sizeBytes ? BigInt(doc.sizeBytes) : BigInt(0),
          isVideo,
          syncedAt: new Date(),
        };
        
        await prisma.photo.upsert({
          where: { googleMediaId: mediaId },
          update: photoData,
          create: {
            ...photoData,
            googleMediaId: mediaId,
          },
        });
        
        importedCount++;
      } catch (err) {
        console.error("Failed to import picker item:", err);
      }
    }

    res.status(200).json({ imported: importedCount });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("POST /photos/import error:", message);
    res.status(500).json({ error: message });
  }
});

export default router;
