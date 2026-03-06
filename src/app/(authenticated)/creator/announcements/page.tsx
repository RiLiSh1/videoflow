import { PageContainer } from "@/components/layout/page-container";
import { AnnouncementsList } from "@/components/announcements/announcements-list";

export default function CreatorAnnouncementsPage() {
  return (
    <PageContainer title="お知らせ">
      <AnnouncementsList target="CREATOR" />
    </PageContainer>
  );
}
