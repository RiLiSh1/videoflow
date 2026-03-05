import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils/format-date";
import Link from "next/link";

const ACTION_LABELS: Record<string, { label: string; className: string }> = {
  CREATE: { label: "作成", className: "bg-green-100 text-green-800" },
  UPDATE: { label: "更新", className: "bg-yellow-100 text-yellow-800" },
  DELETE: { label: "削除", className: "bg-red-100 text-red-800" },
  APPROVE: { label: "承認", className: "bg-blue-100 text-blue-800" },
  SEND: { label: "送信", className: "bg-purple-100 text-purple-800" },
};

const PAGE_SIZE = 50;

async function getLogs(page: number) {
  const [logs, total] = await Promise.all([
    prisma.deliveryChangeLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        actor: { select: { id: true, name: true } },
        schedule: {
          select: {
            id: true,
            client: { select: { name: true } },
            videoStock: { select: { title: true } },
          },
        },
      },
    }),
    prisma.deliveryChangeLog.count(),
  ]);
  return { logs, total };
}

export default async function DeliveryLogsPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, parseInt(searchParams.page || "1", 10) || 1);
  const { logs, total } = await getLogs(page);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <PageContainer title="変更ログ">
      {logs.length === 0 && page === 1 ? (
        <p className="text-center text-gray-500 py-8">
          変更ログがありません
        </p>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-500">
            全 {total} 件中 {(page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, total)} 件を表示
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    日時
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    操作
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    実行者
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    クライアント
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    動画
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {logs.map((log) => {
                  const actionInfo = ACTION_LABELS[log.action] || {
                    label: log.action,
                    className: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={actionInfo.className}>
                          {actionInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {log.actor.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {log.schedule?.client?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {log.schedule?.videoStock?.title || "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              {page > 1 && (
                <Link
                  href={`/delivery/logs?page=${page - 1}`}
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  前へ
                </Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 2
                )
                .reduce<number[]>((acc, p) => {
                  if (acc.length > 0 && p - acc[acc.length - 1] > 1) {
                    acc.push(-1); // ellipsis marker
                  }
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === -1 ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-gray-400">
                      ...
                    </span>
                  ) : (
                    <Link
                      key={p}
                      href={`/delivery/logs?page=${p}`}
                      className={`px-3 py-1.5 text-sm rounded border ${
                        p === page
                          ? "bg-yellow-500 text-white border-yellow-500"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {p}
                    </Link>
                  )
                )}
              {page < totalPages && (
                <Link
                  href={`/delivery/logs?page=${page + 1}`}
                  className="px-3 py-1.5 text-sm rounded border border-gray-300 hover:bg-gray-50"
                >
                  次へ
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </PageContainer>
  );
}
