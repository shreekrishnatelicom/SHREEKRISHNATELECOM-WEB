import prisma from "@/lib/prisma";
import crypto from "crypto";

function hashPassword(password: string) {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Call this to seed admin and announcement on first run
export async function seedDefaults() {
  // Admin user is now managed via Firebase Auth

  // Announcement bar
  const existingAnnouncement = await prisma.announcementBar.findFirst();
  if (!existingAnnouncement) {
    await prisma.announcementBar.create({
      data: {
        message: "📢 Welcome to Shree Krishna Telecom! Color & B&W prints available. Pay at the counter.",
        isActive: true,
        color: "bauhaus-red",
      },
    });
  }
}
