import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth/require-auth";
import { isSessionUser } from "@/lib/auth/require-auth";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PaymentNotificationsClient } from "./_components/payment-notifications-client";

export default async function CreatorPaymentNotificationsPage() {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) redirect("/login");

  const notifications = await prisma.paymentNotification.findMany({
    where: { creatorId: auth.id },
    include: {
      invoice: {
        select: {
          id: true,
          verificationStatus: true,
          extractedSubtotal: true,
          extractedWithholding: true,
          extractedNetAmount: true,
          fileName: true,
        },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const data = notifications.map((n) => ({
    id: n.id,
    year: n.year,
    month: n.month,
    subtotal: n.subtotal,
    consumptionTax: n.consumptionTax,
    withholdingTax: n.withholdingTax,
    netAmount: n.netAmount,
    invoice: n.invoice
      ? {
          id: n.invoice.id,
          verificationStatus: n.invoice.verificationStatus,
          extractedSubtotal: n.invoice.extractedSubtotal,
          extractedWithholding: n.invoice.extractedWithholding,
          extractedNetAmount: n.invoice.extractedNetAmount,
          fileName: n.invoice.fileName,
        }
      : null,
  }));

  return (
    <PageContainer title="支払通知書">
      <PaymentNotificationsClient notifications={data} />
    </PageContainer>
  );
}
