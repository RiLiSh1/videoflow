import { PageContainer } from "@/components/layout/page-container";
import { AnnouncementsList } from "@/components/announcements/announcements-list";

export default function DirectorAnnouncementsPage() {
  return (
    <PageContainer title="お知らせ">
      <AnnouncementsList target="DIRECTOR" />
    </PageContainer>
  );
}
