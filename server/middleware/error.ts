import { NextFunction, Request, Response } from "express";
import { AxiosError } from "axios";

export class AppError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.name = "AppError";
  }
}

export function notFoundHandler(_req: Request, _res: Response, next: NextFunction): void {
  next(new AppError("Route not found", 404));
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof AxiosError) {
    const status = err.response?.status ?? 502;
    const message =
      (typeof err.response?.data === "object" && err.response?.data && "error" in err.response.data
        ? String((err.response.data as Record<string, unknown>).error)
        : err.message) || "Upstream API error";
    res.status(status).json({ error: message });
    return;
  }

  if (err instanceof Error) {
    const statusCode = (err as Error & { statusCode?: number }).statusCode ?? 500;
    res.status(statusCode).json({ error: err.message || "Internal server error" });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
}
