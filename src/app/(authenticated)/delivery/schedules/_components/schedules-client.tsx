"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, CheckCircle, Pencil, Trash2, Send, Layers } from "lucide-react";

type DeliverySchedule = {
  id: string;
  clientId: string;
  videoStockId: string;
  weekStart: string;
  scheduledSendAt: string | null;
  actualSentAt: string | null;
  status: "DRAFT" | "PENDING_APPROVAL" | "APPROVED" | "SENT" | "FAILED";
  sendError: string | null;
  client: { id: string; name: string };
  videoStock: { id: string; title: string; fileName: string };
  approvals: {
    approver: { id: string; name: string };
    approvedAt: string;
  }[];
};

type DeliveryClient = { id: string; name: string };
type VideoStock = { id: string; title: string; fileName: string };

type FormData = {
  clientId: string;
  videoStockId: string;
  weekStart: string;
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  DRAFT: { label: "下書き", className: "bg-gray-100 text-gray-600" },
  PENDING_APPROVAL: { label: "承認待ち", className: "bg-yellow-100 text-yellow-800" },
  APPROVED: { label: "承認済み", className: "bg-green-100 text-green-800" },
  SENT: { label: "送信済み", className: "bg-blue-100 text-blue-800" },
  FAILED: { label: "送信失敗", className: "bg-red-100 text-red-800" },
};

export function SchedulesClient() {
  const [schedules, setSchedules] = useState<DeliverySchedule[]>([]);
  const [clients, setClients] = useState<DeliveryClient[]>([]);
  const [availableStocks, setAvailableStocks] = useState<VideoStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>({
    clientId: "",
    videoStockId: "",
    weekStart: "",
  });
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchWeekStart, setBatchWeekStart] = useState("");
  const [batchItems, setBatchItems] = useState<
    { clientId: string; videoStockId: string }[]
  >([{ clientId: "", videoStockId: "" }]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    const res = await fetch(`/api/delivery/schedules?${params}`);
    const json = await res.json();
    if (json.success) setSchedules(json.data);
    setLoading(false);
  }, [filterStatus]);

  const fetchClients = useCallback(async () => {
    const res = await fetch("/api/delivery/clients");
    const json = await res.json();
    if (json.success) setClients(json.data);
  }, []);

  const fetchAvailableStocks = useCallback(async () => {
    const res = await fetch("/api/delivery/stocks?isUsed=false");
    const json = await res.json();
    if (json.success) setAvailableStocks(json.data);
  }, []);

  useEffect(() => {
    fetchSchedules();
    fetchClients();
    fetchAvailableStocks();
  }, [fetchSchedules, fetchClients, fetchAvailableStocks]);

  function openCreate() {
    setEditingId(null);
    setForm({ clientId: "", videoStockId: "", weekStart: "" });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (editingId) {
      await fetch(`/api/delivery/schedules/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/delivery/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    setShowForm(false);
    fetchSchedules();
    fetchAvailableStocks();
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/delivery/schedules/${id}/approve`, {
      method: "POST",
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error);
      return;
    }
    fetchSchedules();
  }

  async function handleRequestApproval(id: string) {
    await fetch(`/api/delivery/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "PENDING_APPROVAL" }),
    });
    fetchSchedules();
  }

  async function handleManualSend(id: string) {
    if (!confirm("このスケジュールを手動送信しますか？")) return;
    setSendingId(id);
    const res = await fetch(`/api/delivery/schedules/${id}/send`, {
      method: "POST",
    });
    const json = await res.json();
    setSendingId(null);
    if (!json.success) {
      alert(json.error);
      return;
    }
    alert("送信が完了しました");
    fetchSchedules();
    fetchAvailableStocks();
  }

  async function handleDelete(id: string) {
    if (!confirm("このスケジュールを削除しますか？")) return;
    const res = await fetch(`/api/delivery/schedules/${id}`, {
      method: "DELETE",
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error);
      return;
    }
    fetchSchedules();
  }

  function openBatchCreate() {
    setBatchWeekStart("");
    setBatchItems([{ clientId: "", videoStockId: "" }]);
    setShowBatchForm(true);
    setShowForm(false);
  }

  function addBatchRow() {
    setBatchItems([...batchItems, { clientId: "", videoStockId: "" }]);
  }

  function removeBatchRow(index: number) {
    setBatchItems(batchItems.filter((_, i) => i !== index));
  }

  function updateBatchItem(
    index: number,
    field: "clientId" | "videoStockId",
    value: string
  ) {
    const updated = [...batchItems];
    updated[index] = { ...updated[index], [field]: value };
    setBatchItems(updated);
  }

  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validItems = batchItems.filter(
      (item) => item.clientId && item.videoStockId
    );
    if (!batchWeekStart || validItems.length === 0) {
      alert("配信週と少なくとも1つのクライアント・動画ペアを入力してください");
      return;
    }

    setBatchSubmitting(true);
    const res = await fetch("/api/delivery/schedules/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStart: batchWeekStart, items: validItems }),
    });
    const json = await res.json();
    setBatchSubmitting(false);

    if (!json.success) {
      alert(json.error);
      return;
    }

    alert(json.message);
    setShowBatchForm(false);
    fetchSchedules();
    fetchAvailableStocks();
  }

  // 一括作成フォームで選択済みの動画IDを取得（重複選択防止）
  const selectedVideoIds = new Set(
    batchItems.map((item) => item.videoStockId).filter(Boolean)
  );

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ja-JP");
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">すべて</option>
            <option value="DRAFT">下書き</option>
            <option value="PENDING_APPROVAL">承認待ち</option>
            <option value="APPROVED">承認済み</option>
            <option value="SENT">送信済み</option>
            <option value="FAILED">送信失敗</option>
          </select>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openBatchCreate}>
            <Layers className="h-4 w-4 mr-1" />
            一括作成
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            新規スケジュール
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">
                {editingId ? "スケジュール編集" : "新規スケジュール"}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    クライアント *
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.clientId}
                    onChange={(e) =>
                      setForm({ ...form, clientId: e.target.value })
                    }
                    required
                  >
                    <option value="">選択してください</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    動画 *
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.videoStockId}
                    onChange={(e) =>
                      setForm({ ...form, videoStockId: e.target.value })
                    }
                    required
                  >
                    <option value="">選択してください</option>
                    {availableStocks.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    配信週（月曜日） *
                  </label>
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.weekStart}
                    onChange={(e) =>
                      setForm({ ...form, weekStart: e.target.value })
                    }
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowForm(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit">
                  {editingId ? "更新" : "作成"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {showBatchForm && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={handleBatchSubmit} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">スケジュール一括作成</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  配信週（月曜日） *
                </label>
                <input
                  type="date"
                  className="w-64 rounded-md border border-gray-300 px-3 py-2 text-sm"
                  value={batchWeekStart}
                  onChange={(e) => setBatchWeekStart(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    クライアント・動画の割り当て
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={addBatchRow}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    行を追加
                  </Button>
                </div>
                {batchItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2"
                  >
                    <select
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={item.clientId}
                      onChange={(e) =>
                        updateBatchItem(index, "clientId", e.target.value)
                      }
                    >
                      <option value="">クライアントを選択</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm"
                      value={item.videoStockId}
                      onChange={(e) =>
                        updateBatchItem(index, "videoStockId", e.target.value)
                      }
                    >
                      <option value="">動画を選択</option>
                      {availableStocks
                        .filter(
                          (s) =>
                            !selectedVideoIds.has(s.id) ||
                            s.id === item.videoStockId
                        )
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title}
                          </option>
                        ))}
                    </select>
                    {batchItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBatchRow(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowBatchForm(false)}
                >
                  キャンセル
                </Button>
                <Button type="submit" disabled={batchSubmitting}>
                  {batchSubmitting
                    ? "作成中..."
                    : `${batchItems.filter((i) => i.clientId && i.videoStockId).length}件を一括作成`}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : schedules.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-gray-500 py-8">
              スケジュールがまだ登録されていません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  配信週
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  クライアント
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  動画
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  承認者
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schedules.map((schedule) => {
                const statusInfo = STATUS_LABELS[schedule.status] || {
                  label: schedule.status,
                  className: "bg-gray-100 text-gray-600",
                };
                return (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {formatDate(schedule.weekStart)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {schedule.client.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      {schedule.videoStock.title}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {schedule.approvals.length > 0
                        ? schedule.approvals
                            .map((a) => a.approver.name)
                            .join(", ")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {schedule.status === "DRAFT" && (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              handleRequestApproval(schedule.id)
                            }
                          >
                            承認申請
                          </Button>
                        )}
                        {schedule.status === "PENDING_APPROVAL" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(schedule.id)}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            承認
                          </Button>
                        )}
                        {schedule.status === "APPROVED" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleManualSend(schedule.id)}
                            disabled={sendingId === schedule.id}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            {sendingId === schedule.id ? "送信中..." : "手動送信"}
                          </Button>
                        )}
                        {schedule.status !== "SENT" && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingId(schedule.id);
                                setForm({
                                  clientId: schedule.clientId,
                                  videoStockId: schedule.videoStockId,
                                  weekStart: schedule.weekStart.split("T")[0],
                                });
                                setShowForm(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(schedule.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
