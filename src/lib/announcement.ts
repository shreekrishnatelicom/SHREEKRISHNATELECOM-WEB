import prisma from "@/lib/prisma";

export interface AnnouncementData {
  message: string;
  isActive: boolean;
  color: string;
}

export async function getAnnouncement(): Promise<AnnouncementData | null> {
  try {
    const announcement = await prisma.announcementBar.findFirst({
      orderBy: { createdAt: "desc" },
    });
    if (!announcement || !announcement.isActive) return null;
    return announcement;
  } catch {
    return null;
  }
}
