import { PageContainer } from "@/components/layout/page-container";

export default function CreatorVideoDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PageContainer title="動画詳細">
      <p className="text-gray-500">動画ID: {params.id} の詳細が表示されます（実装予定）</p>
    </PageContainer>
  );
}
