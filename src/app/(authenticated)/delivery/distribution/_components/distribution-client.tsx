"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight } from "lucide-react";

type ClientSummary = {
  client: { id: string; name: string };
  total: number;
  sent: number;
  approved: number;
  pending: number;
  failed: number;
};

type WeekScheduleItem = {
  id: string;
  clientName: string;
  videoTitle: string;
  status: string;
};

type WeekSummary = {
  week: string;
  schedules: WeekScheduleItem[];
};

type DistributionData = {
  year: number;
  month: number;
  clientSummary: ClientSummary[];
  weekSummary: WeekSummary[];
  unusedStockCount: number;
  totalSchedules: number;
};

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  SENT: "bg-blue-100 text-blue-800",
  FAILED: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  PENDING_APPROVAL: "承認待ち",
  APPROVED: "承認済み",
  SENT: "送信済み",
  FAILED: "失敗",
};

export function DistributionClient() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState<DistributionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/delivery/distribution?year=${year}&month=${month}`
    );
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function prevMonth() {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  }

  if (loading) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  if (!data) {
    return <p className="text-gray-500">データの取得に失敗しました</p>;
  }

  return (
    <div>
      {/* 月選択 */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold text-gray-900">
          {year}年{month}月
        </span>
        <Button variant="ghost" size="sm" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <div className="ml-auto flex gap-4 text-sm text-gray-500">
          <span>
            スケジュール合計:{" "}
            <strong className="text-gray-900">{data.totalSchedules}件</strong>
          </span>
          <span>
            未使用ストック:{" "}
            <strong className="text-gray-900">{data.unusedStockCount}本</strong>
          </span>
        </div>
      </div>

      {/* クライアント別集計 */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        クライアント別配分
      </h2>
      {data.clientSummary.length === 0 ? (
        <Card className="mb-6">
          <CardContent>
            <p className="text-center text-gray-500 py-4">
              アクティブなクライアントがありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-8">
          {data.clientSummary.map((cs) => (
            <Card key={cs.client.id}>
              <CardContent>
                <div className="pt-4">
                  <h3 className="font-semibold text-gray-900 mb-2">
                    {cs.client.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">
                      合計 <strong>{cs.total}</strong>
                    </span>
                    {cs.sent > 0 && (
                      <Badge className="bg-blue-100 text-blue-800">
                        送信済 {cs.sent}
                      </Badge>
                    )}
                    {cs.approved > 0 && (
                      <Badge className="bg-green-100 text-green-800">
                        承認済 {cs.approved}
                      </Badge>
                    )}
                    {cs.pending > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-800">
                        未承認 {cs.pending}
                      </Badge>
                    )}
                    {cs.failed > 0 && (
                      <Badge className="bg-red-100 text-red-800">
                        失敗 {cs.failed}
                      </Badge>
                    )}
                  </div>
                  {cs.total === 0 && (
                    <p className="text-xs text-gray-400 mt-1">
                      この月のスケジュールなし
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 週別スケジュール */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        週別スケジュール
      </h2>
      {data.weekSummary.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-gray-500 py-4">
              この月のスケジュールはありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {data.weekSummary.map((ws) => (
            <Card key={ws.week}>
              <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                <h3 className="font-medium text-gray-900">
                  {new Date(ws.week + "T00:00:00").toLocaleDateString("ja-JP", {
                    month: "long",
                    day: "numeric",
                  })}
                  〜 の週
                </h3>
              </div>
              <CardContent>
                <div className="divide-y divide-gray-100">
                  {ws.schedules.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-2"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          {s.clientName}
                        </span>
                        <span className="text-sm text-gray-500">
                          {s.videoTitle}
                        </span>
                      </div>
                      <Badge
                        className={
                          STATUS_STYLES[s.status] || "bg-gray-100 text-gray-600"
                        }
                      >
                        {STATUS_LABELS[s.status] || s.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
