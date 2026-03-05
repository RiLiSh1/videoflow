"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Package,
} from "lucide-react";

type ClientSummary = {
  client: { id: string; name: string; monthlyDeliveryCount: number };
  target: number;
  sent: number;
  scheduled: number;
  shortage: number;
  clientStockCount: number;
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

type StockPool = {
  allStores: { id: string; title: string }[];
  unassigned: { id: string; title: string }[];
  total: number;
};

type DistributionData = {
  year: number;
  month: number;
  clientSummary: ClientSummary[];
  weekSummary: WeekSummary[];
  stockPool: StockPool;
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
  const [distributing, setDistributing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/delivery/distribution?year=${year}&month=${month}`);
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function prevMonth() {
    if (month === 1) { setYear(year - 1); setMonth(12); }
    else setMonth(month - 1);
  }

  function nextMonth() {
    if (month === 12) { setYear(year + 1); setMonth(1); }
    else setMonth(month + 1);
  }

  async function handleAutoDistribute() {
    if (!confirm("不足しているクライアントに在庫を自動で振り分けます。\nDRAFT（下書き）スケジュールとして作成されます。\n\n実行しますか？")) return;
    setDistributing(true);
    try {
      const res = await fetch("/api/delivery/distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month }),
      });
      const json = await res.json();
      if (json.success) {
        alert(json.data.message);
        fetchData();
      } else {
        alert(json.error || "振り分けに失敗しました");
      }
    } finally {
      setDistributing(false);
    }
  }

  if (loading) return <p className="text-gray-500">読み込み中...</p>;
  if (!data) return <p className="text-gray-500">データの取得に失敗しました</p>;

  const totalShortage = data.clientSummary.reduce((s, c) => s + c.shortage, 0);
  const totalTarget = data.clientSummary.reduce((s, c) => s + c.target, 0);
  const totalDelivered = data.clientSummary.reduce((s, c) => s + c.sent, 0);
  const totalScheduled = data.clientSummary.reduce((s, c) => s + c.scheduled, 0);

  return (
    <div>
      {/* ヘッダー: 月選択 + 自動振り分け */}
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold text-gray-900">
            {year}年{month}月
          </span>
          <Button variant="ghost" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="ml-auto">
          <Button
            onClick={handleAutoDistribute}
            loading={distributing}
            disabled={totalShortage === 0 || data.stockPool.total === 0}
          >
            <Zap className="h-4 w-4 mr-1.5" />
            自動振り分け
          </Button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
        <Card>
          <CardContent>
            <div className="pt-1">
              <p className="text-xs text-gray-500">月間目標</p>
              <p className="text-2xl font-bold text-gray-900">{totalTarget}<span className="text-sm font-normal text-gray-500">本</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="pt-1">
              <p className="text-xs text-gray-500">配信済み</p>
              <p className="text-2xl font-bold text-emerald-600">{totalDelivered}<span className="text-sm font-normal text-gray-500">本</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="pt-1">
              <p className="text-xs text-gray-500">予定済み</p>
              <p className="text-2xl font-bold text-blue-600">{totalScheduled}<span className="text-sm font-normal text-gray-500">本</span></p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="pt-1">
              <p className="text-xs text-gray-500">不足</p>
              <p className={`text-2xl font-bold ${totalShortage > 0 ? "text-red-600" : "text-gray-400"}`}>
                {totalShortage}<span className="text-sm font-normal text-gray-500">本</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 在庫プール */}
      <Card className="mb-6">
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <h2 className="text-sm font-semibold text-gray-900">在庫プール</h2>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-500">全店舗用: </span>
              <span className="font-semibold text-gray-900">{data.stockPool.allStores.length}本</span>
            </div>
            <div>
              <span className="text-gray-500">未割当: </span>
              <span className="font-semibold text-gray-900">{data.stockPool.unassigned.length}本</span>
            </div>
            <div>
              <span className="text-gray-500">合計未使用: </span>
              <span className="font-semibold text-gray-900">{data.stockPool.total}本</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* クライアント別過不足テーブル */}
      <Card className="mb-6">
        <CardHeader className="py-3">
          <h2 className="text-sm font-semibold text-gray-900">クライアント別配分状況</h2>
        </CardHeader>
        <CardContent className="p-0">
          {data.clientSummary.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400">
              アクティブなクライアントがありません
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-6 py-3 font-medium">クライアント</th>
                  <th className="px-4 py-3 font-medium text-center">月間目標</th>
                  <th className="px-4 py-3 font-medium text-center">配信済み</th>
                  <th className="px-4 py-3 font-medium text-center">予定済み</th>
                  <th className="px-4 py-3 font-medium text-center">不足</th>
                  <th className="px-4 py-3 font-medium text-center">専用在庫</th>
                  <th className="px-4 py-3 font-medium text-center">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {data.clientSummary.map((cs) => {
                  const fulfilled = cs.shortage === 0;
                  const hasStock = cs.clientStockCount > 0 || data.stockPool.allStores.length > 0;
                  return (
                    <tr key={cs.client.id} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {cs.client.name}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-700">
                        {cs.target}本
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-emerald-600">{cs.sent}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-blue-600">{cs.scheduled}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {cs.shortage > 0 ? (
                          <span className="font-bold text-red-600">{cs.shortage}本</span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">
                        {cs.clientStockCount > 0 ? `${cs.clientStockCount}本` : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {fulfilled ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            充足
                          </span>
                        ) : hasStock ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                            <AlertTriangle className="h-3 w-3" />
                            不足
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700">
                            <AlertTriangle className="h-3 w-3" />
                            在庫なし
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* 週別スケジュール */}
      <Card>
        <CardHeader className="py-3">
          <h2 className="text-sm font-semibold text-gray-900">週別スケジュール</h2>
        </CardHeader>
        <CardContent className="p-0">
          {data.weekSummary.length === 0 ? (
            <p className="px-6 py-8 text-center text-gray-400">
              この月のスケジュールはありません
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.weekSummary.map((ws) => (
                <div key={ws.week}>
                  <div className="px-6 py-2 bg-gray-50">
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {new Date(ws.week + "T00:00:00").toLocaleDateString("ja-JP", {
                        month: "long",
                        day: "numeric",
                      })}〜
                    </span>
                    <span className="ml-2 text-xs text-gray-400">{ws.schedules.length}件</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {ws.schedules.map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-6 py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-900 w-28 truncate">
                            {s.clientName}
                          </span>
                          <span className="text-sm text-gray-500">{s.videoTitle}</span>
                        </div>
                        <Badge className={STATUS_STYLES[s.status] || "bg-gray-100 text-gray-600"}>
                          {STATUS_LABELS[s.status] || s.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
