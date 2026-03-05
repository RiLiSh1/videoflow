"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  LayoutGrid,
  LayoutList,
} from "lucide-react";

type DeliveryClient = {
  id: string;
  name: string;
  lineGroupId: string | null;
  googleDriveFolderId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  note: string | null;
  isActive: boolean;
  contractStartDate: string | null;
  contractEndDate: string | null;
  contractMonths: number | null;
  contractStatus: ContractStatusType;
  renewalNote: string | null;
  lastRenewedAt: string | null;
  createdAt: string;
  _count: {
    videoStocks: number;
    deliverySchedules: number;
  };
};

type ContractStatusType =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "PENDING_RENEWAL"
  | "RENEWED"
  | "CANCELLED";

type ViewMode = "list" | "card";

type FormData = {
  name: string;
  lineGroupId: string;
  googleDriveFolderId: string;
  contactName: string;
  contactEmail: string;
  note: string;
  contractStartDate: string;
  contractEndDate: string;
  contractMonths: string;
  contractStatus: ContractStatusType;
  renewalNote: string;
};

const emptyForm: FormData = {
  name: "",
  lineGroupId: "",
  googleDriveFolderId: "",
  contactName: "",
  contactEmail: "",
  note: "",
  contractStartDate: "",
  contractEndDate: "",
  contractMonths: "6",
  contractStatus: "ACTIVE",
  renewalNote: "",
};

const CONTRACT_STATUS_LABELS: Record<
  ContractStatusType,
  { label: string; className: string }
> = {
  ACTIVE: { label: "契約中", className: "bg-green-100 text-green-800" },
  EXPIRING_SOON: {
    label: "満了間近",
    className: "bg-amber-100 text-amber-800",
  },
  EXPIRED: { label: "契約満了", className: "bg-red-100 text-red-800" },
  PENDING_RENEWAL: {
    label: "更新検討中",
    className: "bg-blue-100 text-blue-800",
  },
  RENEWED: { label: "更新済み", className: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "解約", className: "bg-gray-100 text-gray-600" },
};

const CONTRACT_MONTHS_OPTIONS = [
  { value: "3", label: "3ヶ月" },
  { value: "6", label: "6ヶ月" },
  { value: "12", label: "12ヶ月（1年）" },
  { value: "24", label: "24ヶ月（2年）" },
];

function formatDate(dateStr: string | null) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("ja-JP");
}

function getDaysUntilExpiry(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

function calcEndDate(startDate: string, months: string): string {
  if (!startDate || !months) return "";
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + parseInt(months, 10));
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

function ExpiryBadge({ days }: { days: number | null }) {
  if (days === null) return <span className="text-gray-400">-</span>;
  if (days <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
        {Math.abs(days)}日超過
      </span>
    );
  }
  if (days <= 30) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
        残{days}日
      </span>
    );
  }
  return (
    <span className="text-xs text-gray-500">残{days}日</span>
  );
}

export function ClientsClient() {
  const [clients, setClients] = useState<DeliveryClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [renewForm, setRenewForm] = useState({
    contractMonths: "6",
    contractEndDate: "",
    renewalNote: "",
  });
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set("contractStatus", filterStatus);
    const res = await fetch(`/api/delivery/clients?${params}`);
    const json = await res.json();
    if (json.success) setClients(json.data);
    setLoading(false);
  }, [filterStatus]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(client: DeliveryClient) {
    setEditingId(client.id);
    setForm({
      name: client.name,
      lineGroupId: client.lineGroupId || "",
      googleDriveFolderId: client.googleDriveFolderId || "",
      contactName: client.contactName || "",
      contactEmail: client.contactEmail || "",
      note: client.note || "",
      contractStartDate: client.contractStartDate
        ? client.contractStartDate.split("T")[0]
        : "",
      contractEndDate: client.contractEndDate
        ? client.contractEndDate.split("T")[0]
        : "",
      contractMonths: client.contractMonths?.toString() || "6",
      contractStatus: client.contractStatus,
      renewalNote: client.renewalNote || "",
    });
    setShowForm(true);
  }

  function handleStartDateChange(startDate: string) {
    const newForm = { ...form, contractStartDate: startDate };
    if (startDate && form.contractMonths) {
      newForm.contractEndDate = calcEndDate(startDate, form.contractMonths);
    }
    setForm(newForm);
  }

  function handleMonthsChange(months: string) {
    const newForm = { ...form, contractMonths: months };
    if (form.contractStartDate && months) {
      newForm.contractEndDate = calcEndDate(form.contractStartDate, months);
    }
    setForm(newForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      lineGroupId: form.lineGroupId || null,
      googleDriveFolderId: form.googleDriveFolderId || null,
      contactName: form.contactName || null,
      contactEmail: form.contactEmail || null,
      note: form.note || null,
      contractStartDate: form.contractStartDate || null,
      contractEndDate: form.contractEndDate || null,
      contractMonths: form.contractMonths || null,
      renewalNote: form.renewalNote || null,
    };

    if (editingId) {
      await fetch(`/api/delivery/clients/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/delivery/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setShowForm(false);
    fetchClients();
  }

  async function handleDelete(id: string) {
    if (!confirm("このクライアントを削除しますか？")) return;
    await fetch(`/api/delivery/clients/${id}`, { method: "DELETE" });
    fetchClients();
  }

  async function toggleActive(client: DeliveryClient) {
    await fetch(`/api/delivery/clients/${client.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !client.isActive }),
    });
    fetchClients();
  }

  function openRenew(client: DeliveryClient) {
    setRenewingId(client.id);
    setRenewForm({
      contractMonths: client.contractMonths?.toString() || "6",
      contractEndDate: "",
      renewalNote: "",
    });
  }

  async function handleRenew(e: React.FormEvent) {
    e.preventDefault();
    if (!renewingId) return;
    const res = await fetch(`/api/delivery/clients/${renewingId}/renew`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(renewForm),
    });
    const json = await res.json();
    if (!json.success) {
      alert(json.error);
      return;
    }
    setRenewingId(null);
    fetchClients();
  }

  const expiringCount = clients.filter((c) => {
    const days = getDaysUntilExpiry(c.contractEndDate);
    return days !== null && days <= 30 && days > 0;
  }).length;
  const expiredCount = clients.filter((c) => {
    const days = getDaysUntilExpiry(c.contractEndDate);
    return days !== null && days <= 0;
  }).length;

  return (
    <div>
      {/* 契約アラート */}
      {(expiringCount > 0 || expiredCount > 0) && (
        <div className="mb-4 flex gap-3">
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4" />
              契約満了: {expiredCount}件
            </div>
          )}
          {expiringCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              30日以内に満了: {expiringCount}件
            </div>
          )}
        </div>
      )}

      {/* ツールバー */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">すべての契約状態</option>
            {Object.entries(CONTRACT_STATUS_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          {/* ビュー切替 */}
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <button
              className={`px-2.5 py-2 ${viewMode === "list" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-400 hover:text-gray-600"}`}
              onClick={() => setViewMode("list")}
              title="リスト表示"
            >
              <LayoutList className="h-4 w-4" />
            </button>
            <button
              className={`px-2.5 py-2 border-l border-gray-300 ${viewMode === "card" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-400 hover:text-gray-600"}`}
              onClick={() => setViewMode("card")}
              title="カード表示"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新規クライアント
        </Button>
      </div>

      {/* 作成・編集フォーム */}
      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">
                {editingId ? "クライアント編集" : "新規クライアント"}
              </h3>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">基本情報</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">クライアント名 *</label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">担当者名</label>
                    <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">担当者メール</label>
                    <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
                    <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                  </div>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">契約情報</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">契約開始日</label>
                    <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.contractStartDate} onChange={(e) => handleStartDateChange(e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">契約期間</label>
                    <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.contractMonths} onChange={(e) => handleMonthsChange(e.target.value)}>
                      <option value="">未設定</option>
                      {CONTRACT_MONTHS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">契約終了日</label>
                    <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.contractEndDate} onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">契約ステータス</label>
                    <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.contractStatus} onChange={(e) => setForm({ ...form, contractStatus: e.target.value as ContractStatusType })}>
                      {Object.entries(CONTRACT_STATUS_LABELS).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">更新メモ</label>
                  <Input value={form.renewalNote} onChange={(e) => setForm({ ...form, renewalNote: e.target.value })} placeholder="契約更新に関するメモ" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">連携設定</p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">LINEグループID</label>
                    <Input value={form.lineGroupId} onChange={(e) => setForm({ ...form, lineGroupId: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Google DriveフォルダID</label>
                    <Input value={form.googleDriveFolderId} onChange={(e) => setForm({ ...form, googleDriveFolderId: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>キャンセル</Button>
                <Button type="submit">{editingId ? "更新" : "作成"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* 契約更新ダイアログ */}
      {renewingId && (
        <Card className="mb-6 border-blue-200">
          <CardContent>
            <form onSubmit={handleRenew} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                契約更新
              </h3>
              <p className="text-sm text-gray-500">
                {clients.find((c) => c.id === renewingId)?.name} の契約を更新します
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">更新期間</label>
                  <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={renewForm.contractMonths} onChange={(e) => setRenewForm({ ...renewForm, contractMonths: e.target.value })}>
                    {CONTRACT_MONTHS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">終了日（直接指定）</label>
                  <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={renewForm.contractEndDate} onChange={(e) => setRenewForm({ ...renewForm, contractEndDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">更新メモ</label>
                  <Input value={renewForm.renewalNote} onChange={(e) => setRenewForm({ ...renewForm, renewalNote: e.target.value })} placeholder="更新理由など" />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setRenewingId(null)}>キャンセル</Button>
                <Button type="submit">契約を更新する</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* メインコンテンツ */}
      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-gray-500 py-8">
              クライアントがまだ登録されていません
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "list" ? (
        /* ========== リスト表示 ========== */
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  クライアント名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  担当者
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  契約状態
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  契約期間
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  契約終了日
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  残日数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  ストック
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  配信数
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  連携
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                  有効
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map((client) => {
                const statusInfo = CONTRACT_STATUS_LABELS[client.contractStatus] || CONTRACT_STATUS_LABELS.ACTIVE;
                const daysUntilExpiry = getDaysUntilExpiry(client.contractEndDate);
                const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
                const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

                return (
                  <tr
                    key={client.id}
                    className={`hover:bg-gray-50 ${isExpired ? "bg-red-50/40" : isExpiring ? "bg-amber-50/40" : ""}`}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {client.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {client.contactName || "-"}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={statusInfo.className}>
                        {statusInfo.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {client.contractMonths ? `${client.contractMonths}ヶ月` : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {formatDate(client.contractEndDate)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ExpiryBadge days={daysUntilExpiry} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">
                      {client._count.videoStocks}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 text-center">
                      {client._count.deliverySchedules}
                    </td>
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {client.lineGroupId && (
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="LINE連携済み" />
                        )}
                        {client.googleDriveFolderId && (
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" title="Drive連携済み" />
                        )}
                        {!client.lineGroupId && !client.googleDriveFolderId && (
                          <span className="text-gray-300">-</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => toggleActive(client)}>
                        <Badge className={client.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                          {client.isActive ? "有効" : "無効"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        {(isExpiring || isExpired) &&
                          client.contractStatus !== "RENEWED" &&
                          client.contractStatus !== "CANCELLED" && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openRenew(client)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(client)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(client.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ========== カード表示 ========== */
        <div className="space-y-2">
          {clients.map((client) => {
            const statusInfo = CONTRACT_STATUS_LABELS[client.contractStatus] || CONTRACT_STATUS_LABELS.ACTIVE;
            const daysUntilExpiry = getDaysUntilExpiry(client.contractEndDate);
            const isExpanded = expandedId === client.id;
            const isExpiring = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
            const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;

            return (
              <Card
                key={client.id}
                className={isExpired ? "border-red-200" : isExpiring ? "border-amber-200" : ""}
              >
                <div
                  className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedId(isExpanded ? null : client.id)}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900 truncate">
                          {client.name}
                        </span>
                        <Badge className={statusInfo.className}>
                          {statusInfo.label}
                        </Badge>
                        {!client.isActive && (
                          <Badge className="bg-gray-100 text-gray-500">無効</Badge>
                        )}
                        {daysUntilExpiry !== null && (
                          <ExpiryBadge days={daysUntilExpiry} />
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500">
                        <span>担当: {client.contactName || "-"}</span>
                        {client.contractMonths && (
                          <span>契約: {client.contractMonths}ヶ月</span>
                        )}
                        {client.contractEndDate && (
                          <span>終了: {formatDate(client.contractEndDate)}</span>
                        )}
                        <span>ストック: {client._count.videoStocks}</span>
                        <span>配信: {client._count.deliverySchedules}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(isExpiring || isExpired) &&
                      client.contractStatus !== "RENEWED" &&
                      client.contractStatus !== "CANCELLED" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); openRenew(client); }}
                        >
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          更新
                        </Button>
                      )}
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(client); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                    {isExpanded ? (
                      <ChevronUp className="h-4 w-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4">
                      <div>
                        <p className="text-gray-500">契約開始日</p>
                        <p className="font-medium">{formatDate(client.contractStartDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">契約終了日</p>
                        <p className="font-medium">{formatDate(client.contractEndDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">契約期間</p>
                        <p className="font-medium">{client.contractMonths ? `${client.contractMonths}ヶ月` : "-"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">最終更新日</p>
                        <p className="font-medium">{formatDate(client.lastRenewedAt)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">メール</p>
                        <p className="font-medium">{client.contactEmail || "-"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">LINE連携</p>
                        <p className="font-medium">{client.lineGroupId ? "設定済み" : "未設定"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Drive連携</p>
                        <p className="font-medium">{client.googleDriveFolderId ? "設定済み" : "未設定"}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">有効/無効</p>
                        <button onClick={() => toggleActive(client)}>
                          <Badge className={client.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>
                            {client.isActive ? "有効" : "無効"}
                          </Badge>
                        </button>
                      </div>
                      {client.renewalNote && (
                        <div className="col-span-2 md:col-span-4">
                          <p className="text-gray-500">更新メモ</p>
                          <p className="font-medium">{client.renewalNote}</p>
                        </div>
                      )}
                      {client.note && (
                        <div className="col-span-2 md:col-span-4">
                          <p className="text-gray-500">備考</p>
                          <p className="font-medium">{client.note}</p>
                        </div>
                      )}
                    </div>
                    {client.contractStatus !== "CANCELLED" && (
                      <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openRenew(client)}>
                          <RefreshCw className="h-3.5 w-3.5 mr-1" />
                          契約更新
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
