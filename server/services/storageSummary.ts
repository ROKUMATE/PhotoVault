import prisma from "../utils/prisma.js";

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

function bytesToGb(value: bigint): number {
  return Number(value) / 1024 / 1024 / 1024;
}

export async function getStorageSummary(userId: string): Promise<StorageSummaryResponse> {
  const accounts = await prisma.googleAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  const accountSummaries = accounts.map((account) => {
    const usedGB = bytesToGb(account.storageUsedBytes);
    const totalGB = bytesToGb(account.storageTotalBytes);
    const freeGB = Math.max(0, totalGB - usedGB);
    const percentUsed = totalGB > 0 ? (usedGB / totalGB) * 100 : 0;

    return {
      accountId: account.id,
      email: account.email,
      usedGB: Number(usedGB.toFixed(2)),
      totalGB: Number(totalGB.toFixed(2)),
      percentUsed: Number(percentUsed.toFixed(1)),
      freeGB: Number(freeGB.toFixed(2)),
    };
  });

  const combinedUsed = accountSummaries.reduce((acc, curr) => acc + curr.usedGB, 0);
  const combinedTotal = accountSummaries.reduce((acc, curr) => acc + curr.totalGB, 0);
  const combinedFree = Math.max(0, combinedTotal - combinedUsed);
  const combinedPercent = combinedTotal > 0 ? (combinedUsed / combinedTotal) * 100 : 0;

  return {
    accounts: accountSummaries,
    combined: {
      usedGB: Number(combinedUsed.toFixed(2)),
      totalGB: Number(combinedTotal.toFixed(2)),
      percentUsed: Number(combinedPercent.toFixed(1)),
      freeGB: Number(combinedFree.toFixed(2)),
    },
  };
}

export default { getStorageSummary };
