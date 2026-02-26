import { PageContainer } from "@/components/layout/page-container";

export default function ReviewsLoading() {
  return (
    <PageContainer title="レビュー一覧">
      <div className="animate-pulse space-y-4">
        <div className="flex gap-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-8 w-20 rounded-md bg-gray-200" />
          ))}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white">
          <div className="h-10 border-b border-gray-100 bg-gray-50" />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-gray-100 last:border-0">
              <div className="h-4 w-20 rounded bg-gray-200" />
              <div className="h-4 w-40 rounded bg-gray-200 flex-1" />
              <div className="h-4 w-16 rounded bg-gray-200" />
              <div className="h-5 w-16 rounded-full bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
