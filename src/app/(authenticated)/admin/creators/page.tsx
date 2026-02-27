import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { CreatorsClient } from "./_components/creators-client";

async function getCreators() {
  const creators = await prisma.user.findMany({
    where: { role: "CREATOR" },
    select: {
      id: true,
      loginId: true,
      name: true,
      email: true,
      isActive: true,
      createdAt: true,
      compensation: true,
      _count: { select: { createdVideos: true } },
    },
    orderBy: { name: "asc" },
  });

  return creators.map((c) => ({
    id: c.id,
    loginId: c.loginId,
    name: c.name,
    email: c.email,
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    videoCount: c._count.createdVideos,
    compensation: c.compensation
      ? {
          type: c.compensation.type,
          perVideoRate: c.compensation.perVideoRate,
          customAmount: c.compensation.customAmount,
          customNote: c.compensation.customNote,
          isFixedMonthly: c.compensation.isFixedMonthly,
        }
      : null,
  }));
}

export default async function AdminCreatorsPage() {
  const creators = await getCreators();

  return (
    <PageContainer title="クリエイター管理">
      <CreatorsClient creators={creators} />
    </PageContainer>
  );
}
