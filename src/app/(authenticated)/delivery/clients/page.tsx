import { PageContainer } from "@/components/layout/page-container";
import { ClientsClient } from "./_components/clients-client";

export default function DeliveryClientsPage() {
  return (
    <PageContainer title="クライアント管理">
      <ClientsClient />
    </PageContainer>
  );
}
