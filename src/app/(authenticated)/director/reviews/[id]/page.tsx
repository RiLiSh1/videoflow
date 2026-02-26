import { PageContainer } from "@/components/layout/page-container";

export default function DirectorReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <PageContainer title="レビュー画面">
      <p className="text-gray-500">動画ID: {params.id} のレビュー画面が表示されます（実装予定）</p>
    </PageContainer>
  );
}
