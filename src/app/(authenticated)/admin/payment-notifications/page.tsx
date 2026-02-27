import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { PaymentNotificationsClient } from "./_components/payment-notifications-client";

async function getCreators() {
  const creators = await prisma.user.findMany({
    where: { role: "CREATOR", isActive: true },
    select: {
      id: true,
      name: true,
      profile: { select: { entityType: true } },
      compensation: { select: { type: true } },
    },
    orderBy: { name: "asc" },
  });

  return creators.map((c) => ({
    id: c.id,
    name: c.name,
    entityType: c.profile?.entityType || null,
    hasCompensation: !!c.compensation,
  }));
}

export default async function AdminPaymentNotificationsPage() {
  const creators = await getCreators();

  return (
    <PageContainer title="支払通知書">
      <PaymentNotificationsClient creators={creators} />
    </PageContainer>
  );
}
