import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning production database...");

  // Delete all data in dependency order
  await prisma.paymentNotification.deleteMany();
  await prisma.creatorCompensation.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.companySettings.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.version.deleteMany();
  await prisma.referenceUrl.deleteMany();
  await prisma.video.deleteMany();
  await prisma.projectDirector.deleteMany();
  await prisma.project.deleteMany();
  await prisma.googleDriveSetting.deleteMany();
  await prisma.user.deleteMany();

  console.log("All data deleted.");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: hashedPassword,
      name: "管理者",
      role: Role.ADMIN,
    },
  });

  console.log(`Admin user created: ${admin.username} (id: ${admin.id})`);
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
