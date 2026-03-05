import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Film, CalendarDays, Send } from "lucide-react";

async function getDeliveryDashboardData() {
  const [
    activeClients,
    totalStocks,
    unusedStocks,
    pendingSchedules,
    approvedSchedules,
    sentSchedules,
  ] = await Promise.all([
    prisma.deliveryClient.count({ where: { isActive: true } }),
    prisma.videoStock.count(),
    prisma.videoStock.count({ where: { isUsed: false } }),
    prisma.deliverySchedule.count({
      where: { status: { in: ["DRAFT", "PENDING_APPROVAL"] } },
    }),
    prisma.deliverySchedule.count({ where: { status: "APPROVED" } }),
    prisma.deliverySchedule.count({ where: { status: "SENT" } }),
  ]);

  return {
    activeClients,
    totalStocks,
    unusedStocks,
    pendingSchedules,
    approvedSchedules,
    sentSchedules,
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
    </PageContainer>
  );
}
