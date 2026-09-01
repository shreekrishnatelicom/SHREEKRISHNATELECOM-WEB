import { PrismaClient } from '@prisma/client'
import crypto from 'crypto'

const prisma = new PrismaClient()

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex')
}

async function main() {
  // Admin user is now managed via Firebase Auth

  // Create default announcement
  const existingAnnouncement = await prisma.announcementBar.findFirst()
  if (!existingAnnouncement) {
    await prisma.announcementBar.create({
      data: {
        message: '📢 Welcome to Shree Krishna Telecom! Color & B&W prints available. Pay at the counter.',
        isActive: true,
        color: 'bauhaus-red',
      },
    })
  }

  console.log('✅ Seed complete. Admin: admin / admin123')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
