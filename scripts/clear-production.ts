import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Clearing all production data...");

  // Delete in dependency order (children first)
  const results = {
    creatorInvoices: await prisma.creatorInvoice.deleteMany(),
    paymentNotifications: await prisma.paymentNotification.deleteMany(),
    creatorCompensations: await prisma.creatorCompensation.deleteMany(),
    creatorProfiles: await prisma.creatorProfile.deleteMany(),
    companySettings: await prisma.companySettings.deleteMany(),
    notifications: await prisma.notification.deleteMany(),
    feedbacks: await prisma.feedback.deleteMany(),
    versions: await prisma.version.deleteMany(),
    referenceUrls: await prisma.referenceUrl.deleteMany(),
    videos: await prisma.video.deleteMany(),
    projectDirectors: await prisma.projectDirector.deleteMany(),
    projects: await prisma.project.deleteMany(),
    googleDriveSettings: await prisma.googleDriveSetting.deleteMany(),
    users: await prisma.user.deleteMany(),
  };

  console.log("Deleted records:");
  for (const [table, result] of Object.entries(results)) {
    console.log(`  ${table}: ${result.count}`);
  }

  console.log("\nAll production data cleared successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
