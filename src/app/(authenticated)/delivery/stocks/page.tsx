import { PageContainer } from "@/components/layout/page-container";
import { StocksClient } from "./_components/stocks-client";

export default function DeliveryStocksPage() {
  return (
    <PageContainer title="動画ストック管理">
      <StocksClient />
    </PageContainer>
  );
}
