import { PageContainer } from "@/components/layout/page-container";
import { SchedulesClient } from "./_components/schedules-client";

export default function DeliverySchedulesPage() {
  return (
    <PageContainer title="配信スケジュール">
      <SchedulesClient />
    </PageContainer>
  );
}
