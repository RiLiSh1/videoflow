import { PageContainer } from "@/components/layout/page-container";

export default function AdminProgressLoading() {
  return (
    <PageContainer title="進捗管理">
      {/* Summary Cards Skeleton */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-100 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-16 rounded bg-gray-100 animate-pulse" />
                <div className="h-6 w-10 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="rounded-lg border border-gray-200 bg-white">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-5 w-40 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-10 rounded bg-gray-50 animate-pulse" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
