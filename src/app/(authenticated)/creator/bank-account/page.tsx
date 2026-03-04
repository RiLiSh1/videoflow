import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BankAccountClient } from "./_components/bank-account-client";

export default async function CreatorBankAccountPage() {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) redirect("/login");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: auth.id },
    select: {
      bankName: true,
      bankBranch: true,
      bankAccountType: true,
      bankAccountNumber: true,
      bankAccountHolder: true,
    },
  });

  return (
    <PageContainer title="銀行口座設定">
      <BankAccountClient
        bankAccount={
          profile
            ? {
                bankName: profile.bankName || "",
                bankBranch: profile.bankBranch || "",
                bankAccountType: profile.bankAccountType || "",
                bankAccountNumber: profile.bankAccountNumber || "",
                bankAccountHolder: profile.bankAccountHolder || "",
              }
            : null
        }
      />
    </PageContainer>
  );
}
