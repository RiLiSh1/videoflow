import { PageContainer } from "@/components/layout/page-container";
import { AnnouncementsAdmin } from "./_components/announcements-admin";

export default function AdminAnnouncementsPage() {
  return (
    <PageContainer title="お知らせ管理">
      <AnnouncementsAdmin />
    </PageContainer>
  );
}
