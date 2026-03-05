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

// ─── Types ──────────────────────────────────────────

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
  monthlyDeliveryCount: number;
  contractStatus: ContractStatusType;
  renewalNote: string | null;
  lastRenewedAt: string | null;
  createdAt: string;
  _count: { videoStocks: number; deliverySchedules: number };
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
  monthlyDeliveryCount: string;
  contractStatus: ContractStatusType;
  renewalNote: string;
};

// ─── Constants ──────────────────────────────────────

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
  monthlyDeliveryCount: "1",
  contractStatus: "ACTIVE",
  renewalNote: "",
};

const CONTRACT_STATUS: Record<ContractStatusType, { label: string; className: string }> = {
  ACTIVE: { label: "契約中", className: "bg-green-100 text-green-800" },
  EXPIRING_SOON: { label: "満了間近", className: "bg-amber-100 text-amber-800" },
  EXPIRED: { label: "契約満了", className: "bg-red-100 text-red-800" },
  PENDING_RENEWAL: { label: "更新検討中", className: "bg-blue-100 text-blue-800" },
  RENEWED: { label: "更新済み", className: "bg-emerald-100 text-emerald-800" },
  CANCELLED: { label: "解約", className: "bg-gray-100 text-gray-600" },
};

const MONTHS_OPTIONS = [
  { value: "3", label: "3ヶ月" },
  { value: "6", label: "6ヶ月" },
  { value: "12", label: "1年" },
  { value: "24", label: "2年" },
];

// ─── Helpers ────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("ja-JP", { year: "numeric", month: "short", day: "numeric" });
}

function daysUntil(endDate: string | null): number | null {
  if (!endDate) return null;
  const end = new Date(endDate);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86400000);
}

/** 契約開始日と期間から、納品対象の月リストを生成 */
function deliveryMonthLabels(
  startDate: string | null,
  contractMonths: number | null
): string[] {
  if (!startDate || !contractMonths) return [];
  const start = new Date(startDate);
  const labels: string[] = [];
  for (let i = 0; i < contractMonths; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    labels.push(
      d.toLocaleDateString("ja-JP", { year: "numeric", month: "short" })
    );
  }
  return labels;
}

/** 契約開始日から現在が何ヶ月目かを返す */
function currentContractMonth(startDate: string | null): number | null {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now = new Date();
  const diff =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth()) +
    1;
  return diff < 1 ? null : diff;
}

function calcEndDate(startDate: string, months: string): string {
  if (!startDate || !months) return "";
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + parseInt(months, 10));
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

// ─── Sub-components ─────────────────────────────────

function DeliveryMonthsDisplay({
  startDate,
  contractMonths,
}: {
  startDate: string | null;
  contractMonths: number | null;
}) {
  const labels = deliveryMonthLabels(startDate, contractMonths);
  if (labels.length === 0) return <span className="text-gray-300">-</span>;

  const cur = currentContractMonth(startDate);

  return (
    <div className="flex flex-wrap gap-1">
      {labels.map((label, i) => {
        const monthNum = i + 1;
        const isPast = cur !== null && monthNum < cur;
        const isCurrent = cur !== null && monthNum === cur;
        return (
          <span
            key={i}
            className={`text-[10px] px-1.5 py-0.5 rounded ${
              isCurrent
                ? "bg-yellow-400 text-yellow-900 font-bold"
                : isPast
                  ? "bg-gray-100 text-gray-400 line-through"
                  : "bg-gray-50 text-gray-600"
            }`}
          >
            {label}
          </span>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────

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

  // ─── Form handlers ──────────────────────────

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
      contractStartDate: client.contractStartDate?.split("T")[0] || "",
      contractEndDate: client.contractEndDate?.split("T")[0] || "",
      contractMonths: client.contractMonths?.toString() || "6",
      monthlyDeliveryCount: client.monthlyDeliveryCount?.toString() || "1",
      contractStatus: client.contractStatus,
      renewalNote: client.renewalNote || "",
    });
    setShowForm(true);
  }

  function handleStartDateChange(val: string) {
    const f = { ...form, contractStartDate: val };
    if (val && form.contractMonths) f.contractEndDate = calcEndDate(val, form.contractMonths);
    setForm(f);
  }

  function handleMonthsChange(val: string) {
    const f = { ...form, contractMonths: val };
    if (form.contractStartDate && val) f.contractEndDate = calcEndDate(form.contractStartDate, val);
    setForm(f);
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
      monthlyDeliveryCount: form.monthlyDeliveryCount || "1",
      renewalNote: form.renewalNote || null,
    };
    if (editingId) {
      await fetch(`/api/delivery/clients/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    } else {
      await fetch("/api/delivery/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
    await fetch(`/api/delivery/clients/${client.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !client.isActive }) });
    fetchClients();
  }

  function openRenew(client: DeliveryClient) {
    setRenewingId(client.id);
    setRenewForm({ contractMonths: client.contractMonths?.toString() || "6", contractEndDate: "", renewalNote: "" });
  }

  async function handleRenew(e: React.FormEvent) {
    e.preventDefault();
    if (!renewingId) return;
    const res = await fetch(`/api/delivery/clients/${renewingId}/renew`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(renewForm) });
    const json = await res.json();
    if (!json.success) { alert(json.error); return; }
    setRenewingId(null);
    fetchClients();
  }

  // ─── Computed ───────────────────────────────

  const expiringCount = clients.filter((c) => { const d = daysUntil(c.contractEndDate); return d !== null && d <= 30 && d > 0; }).length;
  const expiredCount = clients.filter((c) => { const d = daysUntil(c.contractEndDate); return d !== null && d <= 0; }).length;

  // ─── Render ─────────────────────────────────

  return (
    <div>
      {/* アラートバナー */}
      {(expiringCount > 0 || expiredCount > 0) && (
        <div className="mb-4 flex gap-3">
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4" />契約満了: {expiredCount}件
            </div>
          )}
          {expiringCount > 0 && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-2 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4" />30日以内に満了: {expiringCount}件
            </div>
          )}
        </div>
      )}

      {/* ツールバー */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <select className="rounded-md border border-gray-300 px-3 py-2 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">すべての契約状態</option>
            {Object.entries(CONTRACT_STATUS).map(([k, { label }]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            <button className={`px-2.5 py-2 ${viewMode === "list" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-400 hover:text-gray-600"}`} onClick={() => setViewMode("list")} title="リスト表示">
              <LayoutList className="h-4 w-4" />
            </button>
            <button className={`px-2.5 py-2 border-l border-gray-300 ${viewMode === "card" ? "bg-gray-100 text-gray-900" : "bg-white text-gray-400 hover:text-gray-600"}`} onClick={() => setViewMode("card")} title="カード表示">
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />新規クライアント
        </Button>
      </div>

      {/* ─── 作成・編集フォーム ─── */}
      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">{editingId ? "クライアント編集" : "新規クライアント"}</h3>

              <p className="text-sm font-medium text-gray-500">基本情報</p>
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

              <p className="text-sm font-medium text-gray-500">契約情報</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">契約開始日</label>
                  <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.contractStartDate} onChange={(e) => handleStartDateChange(e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">契約期間</label>
                  <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.contractMonths} onChange={(e) => handleMonthsChange(e.target.value)}>
                    <option value="">未設定</option>
                    {MONTHS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">契約終了日</label>
                  <input type="date" className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.contractEndDate} onChange={(e) => setForm({ ...form, contractEndDate: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">月の納品本数</label>
                  <Input type="number" min="1" value={form.monthlyDeliveryCount} onChange={(e) => setForm({ ...form, monthlyDeliveryCount: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">契約ステータス</label>
                  <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={form.contractStatus} onChange={(e) => setForm({ ...form, contractStatus: e.target.value as ContractStatusType })}>
                    {Object.entries(CONTRACT_STATUS).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">更新メモ</label>
                <Input value={form.renewalNote} onChange={(e) => setForm({ ...form, renewalNote: e.target.value })} placeholder="契約更新に関するメモ" />
              </div>

              <p className="text-sm font-medium text-gray-500">連携設定</p>
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

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>キャンセル</Button>
                <Button type="submit">{editingId ? "更新" : "作成"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* ─── 契約更新ダイアログ ─── */}
      {renewingId && (
        <Card className="mb-6 border-blue-200">
          <CardContent>
            <form onSubmit={handleRenew} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-blue-600" />契約更新
              </h3>
              <p className="text-sm text-gray-500">{clients.find((c) => c.id === renewingId)?.name} の契約を更新します</p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">更新期間</label>
                  <select className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" value={renewForm.contractMonths} onChange={(e) => setRenewForm({ ...renewForm, contractMonths: e.target.value })}>
                    {MONTHS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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

      {/* ─── メインコンテンツ ─── */}
      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : clients.length === 0 ? (
        <Card><CardContent><p className="text-center text-gray-500 py-8">クライアントがまだ登録されていません</p></CardContent></Card>
      ) : viewMode === "list" ? (
        /* ==================== リスト表示 ==================== */
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">クライアント</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">契約状態</th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">月/本数</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">契約期間</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">納品月</th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clients.map((c) => {
                const st = CONTRACT_STATUS[c.contractStatus] || CONTRACT_STATUS.ACTIVE;

                return (
                  <tr key={c.id} className="hover:bg-gray-50">
                    {/* クライアント */}
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">{c.contactName || ""}</div>
                    </td>
                    {/* 契約状態 */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge className={st.className}>{st.label}</Badge>
                      {!c.isActive && <Badge className="ml-1 bg-gray-100 text-gray-500">無効</Badge>}
                    </td>
                    {/* 月/本数 */}
                    <td className="px-4 py-3 text-center whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-900">{c.monthlyDeliveryCount}</span>
                      <span className="text-xs text-gray-400">本/月</span>
                    </td>
                    {/* 契約期間 */}
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {c.contractStartDate && c.contractEndDate
                        ? `${fmtDate(c.contractStartDate)} 〜 ${fmtDate(c.contractEndDate)}`
                        : c.contractMonths ? `${c.contractMonths}ヶ月` : "-"}
                    </td>
                    {/* 納品月 */}
                    <td className="px-4 py-3">
                      <DeliveryMonthsDisplay startDate={c.contractStartDate} contractMonths={c.contractMonths} />
                    </td>
                    {/* 操作 */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex justify-end gap-1">
                        {c.contractStatus !== "CANCELLED" && (
                          <Button variant="ghost" size="sm" onClick={() => openRenew(c)} title="契約更新"><RefreshCw className="h-3.5 w-3.5" /></Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* ==================== カード表示 ==================== */
        <div className="space-y-2">
          {clients.map((c) => {
            const st = CONTRACT_STATUS[c.contractStatus] || CONTRACT_STATUS.ACTIVE;
            const isExpanded = expandedId === c.id;

            return (
              <Card key={c.id}>
                <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(isExpanded ? null : c.id)}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900">{c.name}</span>
                      <Badge className={st.className}>{st.label}</Badge>
                      {!c.isActive && <Badge className="bg-gray-100 text-gray-500">無効</Badge>}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                      <span>{c.monthlyDeliveryCount}本/月</span>
                      {c.contractMonths && <span>{c.contractMonths}ヶ月契約</span>}
                      {c.contractStartDate && c.contractEndDate && (
                        <span>{fmtDate(c.contractStartDate)} 〜 {fmtDate(c.contractEndDate)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    {c.contractStatus !== "CANCELLED" && (
                      <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); openRenew(c); }}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />更新
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(c); }}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                    {/* 納品月カレンダー */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1">納品月</p>
                      <DeliveryMonthsDisplay startDate={c.contractStartDate} contractMonths={c.contractMonths} />
                    </div>
                    {/* 詳細グリッド */}
                    <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4">
                      <div><p className="text-gray-500">契約開始</p><p className="font-medium">{fmtDate(c.contractStartDate)}</p></div>
                      <div><p className="text-gray-500">契約終了</p><p className="font-medium">{fmtDate(c.contractEndDate)}</p></div>
                      <div><p className="text-gray-500">契約期間</p><p className="font-medium">{c.contractMonths ? `${c.contractMonths}ヶ月` : "-"}</p></div>
                      <div><p className="text-gray-500">月の納品本数</p><p className="font-medium">{c.monthlyDeliveryCount}本</p></div>
                      <div><p className="text-gray-500">担当者</p><p className="font-medium">{c.contactName || "-"}</p></div>
                      <div><p className="text-gray-500">メール</p><p className="font-medium">{c.contactEmail || "-"}</p></div>
                      <div><p className="text-gray-500">LINE</p><p className="font-medium">{c.lineGroupId ? "連携済み" : "未設定"}</p></div>
                      <div><p className="text-gray-500">Drive</p><p className="font-medium">{c.googleDriveFolderId ? "連携済み" : "未設定"}</p></div>
                      <div>
                        <p className="text-gray-500">有効/無効</p>
                        <button onClick={() => toggleActive(c)}>
                          <Badge className={c.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{c.isActive ? "有効" : "無効"}</Badge>
                        </button>
                      </div>
                      <div><p className="text-gray-500">最終更新日</p><p className="font-medium">{fmtDate(c.lastRenewedAt)}</p></div>
                      {c.renewalNote && <div className="col-span-2 md:col-span-4"><p className="text-gray-500">更新メモ</p><p className="font-medium">{c.renewalNote}</p></div>}
                      {c.note && <div className="col-span-2 md:col-span-4"><p className="text-gray-500">備考</p><p className="font-medium">{c.note}</p></div>}
                    </div>
                    {c.contractStatus !== "CANCELLED" && (
                      <div className="pt-3 border-t border-gray-100 flex gap-2">
                        <Button variant="secondary" size="sm" onClick={() => openRenew(c)}><RefreshCw className="h-3.5 w-3.5 mr-1" />契約更新</Button>
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
