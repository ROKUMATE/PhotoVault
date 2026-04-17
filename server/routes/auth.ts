import express, { NextFunction, Router, Response } from "express";
import dotenv from "dotenv";
import passport, { Profile } from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { AuthRequest, requireAuth } from "../middleware/auth.js";
import { encryptToken } from "../utils/encryption.js";
import prisma from "../utils/prisma.js";
import { AppError } from "../middleware/error.js";
import { enqueueAccountSync, enqueueUserSync } from "../utils/syncQueue.js";

type OAuthMode = "login" | "add-account";

dotenv.config({ path: new URL("../../.env", import.meta.url).pathname });
dotenv.config();

type GoogleAuthResult = {
  accessToken: string;
  refreshToken?: string;
  profile: Profile;
  email: string;
};

interface OAuthSessionData {
  userId?: string;
  oauthMode?: OAuthMode;
}

declare module "express-session" {
  interface SessionData extends OAuthSessionData {}
}

const router: Router = express.Router();
const clientUrl = process.env.CLIENT_URL || "http://localhost:5173";
const serverUrl = process.env.GOOGLE_CALLBACK_URL || "http://localhost:3001/auth/google/callback";
const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
const oauthConfigured = Boolean(googleClientId && googleClientSecret);

const googleScopes = [
  "https://www.googleapis.com/auth/photoslibrary.readonly.appcreateddata",
  "https://www.googleapis.com/auth/photoslibrary.appendonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

function redirectToClient(res: Response, path: string, params: Record<string, string> = {}): void {
  const url = new URL(path, clientUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  res.redirect(url.toString());
}

function bytesToGb(value: bigint): number {
  return Number(value) / 1024 / 1024 / 1024;
}

function getSession(req: express.Request): OAuthSessionData {
  return req.session as unknown as OAuthSessionData;
}

function setSessionMode(req: express.Request, mode: OAuthMode): Promise<void> {
  return new Promise((resolve, reject) => {
    const session = getSession(req);
    session.oauthMode = mode;

    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function saveSessionUser(req: express.Request, userId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const session = getSession(req);
    session.userId = userId;
    delete session.oauthMode;

    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function clearOAuthMode(req: express.Request): Promise<void> {
  return new Promise((resolve, reject) => {
    const session = getSession(req);
    delete session.oauthMode;

    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function requireOAuthConfig(res: Response): boolean {
  if (oauthConfigured) {
    return true;
  }

  redirectToClient(res, "/", {
    authError: "Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
  });
  return false;
}

function upsertGoogleStrategy(): void {
  if (!oauthConfigured) {
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: googleClientId,
        clientSecret: googleClientSecret,
        callbackURL: serverUrl,
        passReqToCallback: true,
      },
      (req: express.Request, accessToken: string, refreshToken: string, profile: Profile, done) => {
        const email = profile.emails?.[0]?.value;

        if (!email) {
          done(new Error("Google account email is unavailable"));
          return;
        }

        done(null, {
          accessToken,
          refreshToken,
          profile,
          email,
        } satisfies GoogleAuthResult);
      }
    )
  );
}

upsertGoogleStrategy();

async function ensureAppUser(email: string): Promise<{ id: string; email: string }> {
  return prisma.user.upsert({
    where: { email },
    create: { email },
    update: { email },
  });
}

async function createOrUpdateConnectedAccount(params: {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken?: string;
}): Promise<{ id: string; email: string }> {
  const existing = await prisma.googleAccount.findFirst({
    where: {
      userId: params.userId,
      email: params.email,
    },
    select: {
      id: true,
      email: true,
      refreshToken: true,
    },
  });

  if (existing) {
    const nextRefreshToken = params.refreshToken ?? existing.refreshToken;
    if (!nextRefreshToken) {
      throw new Error("Google refresh token missing. Revoke the app in Google Account settings and connect again.");
    }

    const updated = await prisma.googleAccount.update({
      where: { id: existing.id },
      data: {
        accessToken: encryptToken(params.accessToken),
        refreshToken: encryptToken(nextRefreshToken),
        tokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
      select: {
        id: true,
        email: true,
      },
    });

    return updated;
  }

  if (!params.refreshToken) {
    throw new Error("Google refresh token missing. Revoke the app in Google Account settings and connect again.");
  }

  const created = await prisma.googleAccount.create({
    data: {
      userId: params.userId,
      email: params.email,
      accessToken: encryptToken(params.accessToken),
      refreshToken: encryptToken(params.refreshToken),
      tokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      storageUsedBytes: BigInt(0),
      storageTotalBytes: BigInt(15 * 1024 * 1024 * 1024),
    },
    select: {
      id: true,
      email: true,
    },
  });

  return created;
}

function handleOAuthFailure(res: Response, error: unknown): void {
  const message = error instanceof Error ? error.message : "Google OAuth failed";
  console.error("[Auth] OAuth failed:", message);
  redirectToClient(res, "/", {
    authError: message,
  });
}

router.get("/google", async (req, res, next) => {
  try {
    if (!requireOAuthConfig(res)) {
      return;
    }

    await setSessionMode(req, "login");

    passport.authenticate("google", {
      scope: googleScopes,
      session: false,
      accessType: "offline",
      prompt: "consent",
    })(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.get("/google/add-account", async (req, res, next) => {
  try {
    if (!requireOAuthConfig(res)) {
      return;
    }

    const session = getSession(req);
    const queryUserId = typeof req.query.userId === "string" ? req.query.userId : undefined;

    if (!session.userId && queryUserId) {
      const user = await prisma.user.findUnique({ where: { id: queryUserId } });
      if (user) {
        session.userId = user.id;
        await new Promise<void>((resolve, reject) => {
          req.session.save((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        });
      }
    }

    if (!getSession(req).userId) {
      redirectToClient(res, "/", {
        authError: "Sign in first before adding another Google account.",
      });
      return;
    }

    await setSessionMode(req, "add-account");

    passport.authenticate("google", {
      scope: googleScopes,
      session: false,
      accessType: "offline",
      prompt: "consent",
    })(req, res, next);
  } catch (error) {
    next(error);
  }
});

router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, async (error: unknown, authResult: GoogleAuthResult | false) => {
    try {
      if (error || !authResult) {
        handleOAuthFailure(res, error ?? new Error("Google OAuth returned no account"));
        return;
      }

      const session = getSession(req);
      const mode: OAuthMode = session.oauthMode ?? "login";
      const appUser = mode === "add-account" ? session.userId : undefined;

      if (mode === "add-account" && !appUser) {
        handleOAuthFailure(res, new Error("No PhotoVault session found. Sign in before adding another account."));
        return;
      }

      const user = appUser ? await prisma.user.findUnique({ where: { id: appUser } }) : await ensureAppUser(authResult.email);

      if (!user) {
        handleOAuthFailure(res, new Error("PhotoVault user session is missing."));
        return;
      }

      const account = await createOrUpdateConnectedAccount({
        userId: user.id,
        email: authResult.email,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
      });

      await saveSessionUser(req, user.id);

      if (mode === "login") {
        await enqueueUserSync(user.id);
        redirectToClient(res, "/", {
          userId: user.id,
          signedIn: "1",
        });
        return;
      }

      await enqueueAccountSync(account.id, user.id);
      redirectToClient(res, "/settings", {
        userId: user.id,
        accountAdded: "1",
      });
    } catch (callbackError) {
      handleOAuthFailure(res, callbackError);
    }
  })(req, res, next);
});

router.get("/google/add-account/callback", (req, res, next) => {
  passport.authenticate("google", { session: false }, async (error: unknown, authResult: GoogleAuthResult | false) => {
    try {
      if (error || !authResult) {
        handleOAuthFailure(res, error ?? new Error("Google OAuth returned no account"));
        return;
      }

      const session = getSession(req);
      const userId = session.userId;

      if (!userId) {
        handleOAuthFailure(res, new Error("No PhotoVault session found. Sign in before adding another account."));
        return;
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) {
        handleOAuthFailure(res, new Error("PhotoVault user session is missing."));
        return;
      }

      const account = await createOrUpdateConnectedAccount({
        userId: user.id,
        email: authResult.email,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
      });

      await saveSessionUser(req, user.id);
      await enqueueAccountSync(account.id, user.id);

      redirectToClient(res, "/settings", {
        userId: user.id,
        accountAdded: "1",
      });
    } catch (callbackError) {
      handleOAuthFailure(res, callbackError);
    }
  })(req, res, next);
});

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