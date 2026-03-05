import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Building2, Film, CalendarDays, Send } from "lucide-react";

export const revalidate = 30; // 30秒キャッシュ

function getWeekRange() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ...
  const diff = day === 0 ? -6 : 1 - day; // Monday
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { monday, sunday };
}

function formatDate(d: Date) {
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "下書き", color: "bg-gray-100 text-gray-600" },
  PENDING_APPROVAL: { label: "承認待ち", color: "bg-amber-100 text-amber-700" },
  APPROVED: { label: "承認済み", color: "bg-blue-100 text-blue-700" },
  SENT: { label: "送信済み", color: "bg-emerald-100 text-emerald-700" },
  FAILED: { label: "失敗", color: "bg-red-100 text-red-700" },
};

async function getDeliveryDashboardData() {
  const { monday, sunday } = getWeekRange();

  const [
    activeClients,
    totalStocks,
    unusedStocks,
    pendingSchedules,
    approvedSchedules,
    sentSchedules,
    weeklySchedules,
    allActiveClients,
  ] = await Promise.all([
    prisma.deliveryClient.count({ where: { isActive: true } }),
    prisma.videoStock.count(),
    prisma.videoStock.count({ where: { isUsed: false } }),
    prisma.deliverySchedule.count({
      where: { status: { in: ["DRAFT", "PENDING_APPROVAL"] } },
    }),
    prisma.deliverySchedule.count({ where: { status: "APPROVED" } }),
    prisma.deliverySchedule.count({ where: { status: "SENT" } }),
    prisma.deliverySchedule.findMany({
      where: {
        weekStart: { gte: monday, lte: sunday },
      },
      include: {
        client: { select: { id: true, name: true, monthlyDeliveryCount: true } },
        videoStock: { select: { title: true } },
      },
      orderBy: [{ clientId: "asc" }, { createdAt: "asc" }],
    }),
    prisma.deliveryClient.findMany({
      where: { isActive: true },
      select: { id: true, name: true, monthlyDeliveryCount: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // クライアント別にグループ化
  const byClient = new Map<
    string,
    {
      clientName: string;
      monthlyTarget: number;
      schedules: typeof weeklySchedules;
    }
  >();

  for (const s of weeklySchedules) {
    const key = s.clientId;
    if (!byClient.has(key)) {
      byClient.set(key, {
        clientName: s.client.name,
        monthlyTarget: s.client.monthlyDeliveryCount,
        schedules: [],
      });
    }
    byClient.get(key)!.schedules.push(s);
  }

  // スケジュール未登録のアクティブクライアントも表示
  for (const c of allActiveClients) {
    if (!byClient.has(c.id)) {
      byClient.set(c.id, {
        clientName: c.name,
        monthlyTarget: c.monthlyDeliveryCount,
        schedules: [],
      });
    }
  }

  return {
    activeClients,
    totalStocks,
    unusedStocks,
    pendingSchedules,
    approvedSchedules,
    sentSchedules,
    weeklyByClient: Array.from(byClient.entries())
      .sort(([, a], [, b]) => a.clientName.localeCompare(b.clientName, "ja")),
    weekRange: { monday, sunday },
  };
}

export default async function DeliveryDashboardPage() {
  const data = await getDeliveryDashboardData();

  const statCards = [
    {
      label: "アクティブクライアント",
      value: data.activeClients,
      icon: Building2,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "未使用ストック",
      value: `${data.unusedStocks} / ${data.totalStocks}`,
      icon: Film,
      color: "text-emerald-600 bg-emerald-50",
    },
    {
      label: "承認待ちスケジュール",
      value: data.pendingSchedules,
      icon: CalendarDays,
      color: "text-amber-600 bg-amber-50",
    },
    {
      label: "送信済み",
      value: data.sentSchedules,
      icon: Send,
      color: "text-violet-600 bg-violet-50",
    },
  ];

  const weekLabel = `${formatDate(data.weekRange.monday)} 〜 ${formatDate(data.weekRange.sunday)}`;

  return (
    <PageContainer title="納品ダッシュボード">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label}>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg p-3 ${card.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{card.label}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {card.value}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 週間スケジュール */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              今週の納品スケジュール
            </h2>
            <span className="text-sm text-gray-500">{weekLabel}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {data.weeklyByClient.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">
              アクティブなクライアントがありません
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">クライアント</th>
                  <th className="px-6 py-3 font-medium">今週の納品</th>
                  <th className="px-6 py-3 font-medium">月間目標</th>
                  <th className="px-6 py-3 font-medium">動画</th>
                  <th className="px-6 py-3 font-medium">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {data.weeklyByClient.map(([clientId, group]) => {
                  const count = group.schedules.length;
                  const hasSchedule = count > 0;

                  if (!hasSchedule) {
                    return (
                      <tr key={clientId} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium text-gray-900">
                          {group.clientName}
                        </td>
                        <td className="px-6 py-3">
                          <span className="text-gray-300">0本</span>
                        </td>
                        <td className="px-6 py-3 text-gray-500">
                          月{group.monthlyTarget}本
                        </td>
                        <td className="px-6 py-3 text-gray-300">-</td>
                        <td className="px-6 py-3">
                          <span className="inline-block rounded px-2 py-0.5 text-xs bg-gray-50 text-gray-400">
                            未登録
                          </span>
                        </td>
                      </tr>
                    );
                  }

                  return group.schedules.map((s, i) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-50 hover:bg-gray-50"
                    >
                      {i === 0 && (
                        <td
                          className="px-6 py-3 font-medium text-gray-900 align-top"
                          rowSpan={count}
                        >
                          {group.clientName}
                        </td>
                      )}
                      {i === 0 && (
                        <td
                          className="px-6 py-3 align-top"
                          rowSpan={count}
                        >
                          <span className="text-lg font-bold text-gray-900">{count}</span>
                          <span className="text-gray-500">本</span>
                        </td>
                      )}
                      {i === 0 && (
                        <td
                          className="px-6 py-3 text-gray-500 align-top"
                          rowSpan={count}
                        >
                          月{group.monthlyTarget}本
                        </td>
                      )}
                      <td className="px-6 py-3 text-gray-700">
                        {s.videoStock.title}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
                            STATUS_LABEL[s.status]?.color ?? "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {STATUS_LABEL[s.status]?.label ?? s.status}
                        </span>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}
