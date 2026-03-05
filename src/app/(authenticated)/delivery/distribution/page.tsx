import { PageContainer } from "@/components/layout/page-container";
import { DistributionClient } from "./_components/distribution-client";

export default function DeliveryDistributionPage() {
  return (
    <PageContainer title="月次配分ダッシュボード">
      <DistributionClient />
    </PageContainer>
  );
}
