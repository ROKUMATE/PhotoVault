import { NextFunction, Request, Response } from "express";

export interface AuthRequest extends Request {
  userId?: string;
}

export function attachUserFromHeader(req: AuthRequest, _res: Response, next: NextFunction): void {
  const headerUserId = req.headers["x-user-id"] as string | undefined;
  const sessionUserId = (req.session as { userId?: string } | undefined)?.userId;
  req.userId = headerUserId || sessionUserId;
  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}
