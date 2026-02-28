import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.create({
    data: {
      loginId: "admin",
      passwordHash,
      name: "管理者",
      role: "ADMIN",
      isActive: true,
    },
  });

  console.log(`Admin account created: ${admin.id} (login: admin)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
