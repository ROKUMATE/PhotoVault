import prisma from "../utils/prisma.js";

export async function getUnseenNotifications(userId: string) {
  return prisma.notification.findMany({
    where: { userId, seen: false },
    orderBy: { createdAt: "desc" },
  });
}

export async function createStorageWarning(userId: string, message: string): Promise<void> {
  const existing = await prisma.notification.findFirst({
    where: {
      userId,
      message,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (existing) {
    return;
  }

  await prisma.notification.create({
    data: {
      userId,
      message,
      seen: false,
    },
  });
}

export default { getUnseenNotifications, createStorageWarning };
