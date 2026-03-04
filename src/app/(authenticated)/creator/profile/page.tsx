import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { ProfileClient } from "./_components/profile-client";

export default async function CreatorProfilePage() {
  const auth = await requireAuth(["CREATOR", "DIRECTOR"]);
  if (!isSessionUser(auth)) redirect("/login");

  const profile = await prisma.creatorProfile.findUnique({
    where: { userId: auth.id },
  });

  return (
    <PageContainer title="請求元情報">
      <ProfileClient
        profile={
          profile
            ? {
                entityType: profile.entityType,
                businessName: profile.businessName || "",
                postalCode: profile.postalCode || "",
                address: profile.address || "",
                invoiceNumber: profile.invoiceNumber || "",
              }
            : null
        }
      />
    </PageContainer>
  );
}
