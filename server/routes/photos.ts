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

export default router;
