import express, { NextFunction, Router, Response } from "express";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import prisma from "../utils/prisma.js";
import { AppError } from "../middleware/error.js";

const router: Router = express.Router();

function bytesToGb(value: bigint): number {
  return Number(value) / 1024 / 1024 / 1024;
}

router.get("/accounts", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const accounts = await prisma.googleAccount.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        email: true,
        storageUsedBytes: true,
        storageTotalBytes: true,
        createdAt: true,
      },
    });

    const formatted = accounts.map((account) => {
      const usedGB = bytesToGb(account.storageUsedBytes);
      const totalGB = bytesToGb(account.storageTotalBytes);
      const freeGB = Math.max(0, totalGB - usedGB);
      const percentUsed = totalGB > 0 ? (usedGB / totalGB) * 100 : 0;

      return {
        id: account.id,
        email: account.email,
        usedGB: Number(usedGB.toFixed(2)),
        totalGB: Number(totalGB.toFixed(2)),
        freeGB: Number(freeGB.toFixed(2)),
        percentUsed: Number(percentUsed.toFixed(1)),
      };
    });

    res.status(200).json({ accounts: formatted });
  } catch (error) {
    next(error);
  }
});

router.delete("/accounts/:id", requireAuth, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;
    const accountId = String(req.params.id);

    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const account = await prisma.googleAccount.findFirst({
      where: {
        id: accountId,
        userId,
      },
      select: {
        id: true,
        email: true,
      },
    });

    if (!account) {
      throw new AppError("Account not found", 404);
    }

    await prisma.googleAccount.delete({
      where: { id: account.id },
    });

    res.status(200).json({
      message: `Disconnected ${account.email}`,
      accountId: account.id,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
