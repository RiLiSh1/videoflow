import { PageContainer } from "@/components/layout/page-container";

export default function ProgressLoading() {
  return (
    <PageContainer title="進捗管理">
      <div className="animate-pulse">
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-gray-200" />
                <div className="space-y-2">
                  <div className="h-3 w-16 rounded bg-gray-200" />
                  <div className="h-6 w-10 rounded bg-gray-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="h-5 w-24 rounded bg-gray-200 mb-4" />
        {[0, 1].map((i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-6 mb-4">
            <div className="flex justify-between mb-4">
              <div className="space-y-1">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="h-3 w-16 rounded bg-gray-200" />
              </div>
              <div className="h-4 w-20 rounded bg-gray-200" />
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200" />
          </div>
        ))}
      </div>
    </PageContainer>
  );
}
