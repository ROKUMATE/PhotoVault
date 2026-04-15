import { GoogleAccount } from "@prisma/client";
import prisma from "../utils/prisma.js";

export async function pickUploadTarget(
  userId: string,
  fileSizeBytes: number | bigint
): Promise<GoogleAccount> {
  const size = typeof fileSizeBytes === "bigint" ? fileSizeBytes : BigInt(fileSizeBytes);

  const accounts = await prisma.googleAccount.findMany({
    where: { userId },
  });

  if (accounts.length === 0) {
    throw new Error("All accounts are full. Please add a new Google account.");
  }

  const eligible = accounts
    .map((account) => ({
      account,
      freeBytes: account.storageTotalBytes - account.storageUsedBytes,
    }))
    .filter((entry) => entry.freeBytes > size)
    .sort((a, b) => {
      if (a.freeBytes === b.freeBytes) {
        return a.account.createdAt.getTime() - b.account.createdAt.getTime();
      }
      return a.freeBytes > b.freeBytes ? -1 : 1;
    });

  if (eligible.length === 0) {
    throw new Error("All accounts are full. Please add a new Google account.");
  }

  return eligible[0].account;
}

export default { pickUploadTarget };
