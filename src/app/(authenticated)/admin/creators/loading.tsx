import { PageContainer } from "@/components/layout/page-container";

export default function AdminCreatorsLoading() {
  return (
    <PageContainer title="クリエイター管理">
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-lg border border-gray-200 bg-white animate-pulse"
          />
        ))}
      </div>
    </PageContainer>
  );
}
