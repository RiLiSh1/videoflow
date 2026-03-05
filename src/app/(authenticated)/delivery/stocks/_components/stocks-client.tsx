"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Check, X } from "lucide-react";

type VideoStock = {
  id: string;
  title: string;
  fileName: string;
  googleDriveFileId: string | null;
  googleDriveUrl: string | null;
  blobUrl: string | null;
  clientId: string | null;
  isUsed: boolean;
  usedAt: string | null;
  note: string | null;
  sourceVideoId: string | null;
  deliveryScope: "ALL_STORES" | "SELECTED_STORES" | null;
  createdAt: string;
  client: { id: string; name: string } | null;
  sourceVideo: { id: string; videoCode: string; project: { projectCode: string } } | null;
};

type DeliveryClient = {
  id: string;
  name: string;
};

type FormData = {
  title: string;
  fileName: string;
  googleDriveFileId: string;
  googleDriveUrl: string;
  clientId: string;
  note: string;
};

const emptyForm: FormData = {
  title: "",
  fileName: "",
  googleDriveFileId: "",
  googleDriveUrl: "",
  clientId: "",
  note: "",
};

function InlineScopeEdit({
  stock,
  onSaved,
}: {
  stock: VideoStock;
  clients: DeliveryClient[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [scope, setScope] = useState<string>(stock.deliveryScope || "");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        {stock.deliveryScope === "ALL_STORES" ? (
          <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
            全店舗用
          </span>
        ) : stock.deliveryScope === "SELECTED_STORES" ? (
          <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
            店舗選択
          </span>
        ) : (
          <span className="text-gray-300 text-xs">未設定</span>
        )}
        <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600">
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    );
  }

  async function save() {
    if (!scope) return;
    setSaving(true);
    await fetch(`/api/delivery/stocks/${stock.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliveryScope: scope }),
    });
    setSaving(false);
    setEditing(false);
    onSaved();
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setScope("ALL_STORES")}
          className={`rounded border px-2 py-0.5 text-xs font-medium ${scope === "ALL_STORES" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
        >
          全店舗
        </button>
        <button
          type="button"
          onClick={() => setScope("SELECTED_STORES")}
          className={`rounded border px-2 py-0.5 text-xs font-medium ${scope === "SELECTED_STORES" ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
        >
          店舗選択
        </button>
      </div>
      <div className="flex gap-1">
        <button onClick={save} disabled={saving || !scope} className="inline-flex items-center rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
          <Check className="h-3 w-3" />
        </button>
        <button onClick={() => { setEditing(false); setScope(stock.deliveryScope || ""); }} className="inline-flex items-center rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-50">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function InlineClientEdit({
  stock,
  clients,
  onSaved,
}: {
  stock: VideoStock;
  clients: DeliveryClient[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [clientId, setClientId] = useState<string>(stock.clientId || "");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        <span className={stock.client ? "text-gray-700" : "text-gray-300"}>
          {stock.client?.name || "-"}
        </span>
        <button onClick={() => setEditing(true)} className="text-gray-400 hover:text-gray-600">
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    );
  }

  async function save() {
    setSaving(true);
    await fetch(`/api/delivery/stocks/${stock.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: clientId || null }),
    });
    setSaving(false);
    setEditing(false);
    onSaved();
  }

  return (
    <div className="space-y-1">
      <select
        className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
        value={clientId}
        onChange={(e) => setClientId(e.target.value)}
      >
        <option value="">未割当</option>
        {clients.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
      <div className="flex gap-1">
        <button onClick={save} disabled={saving} className="inline-flex items-center rounded bg-blue-600 px-1.5 py-0.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
          <Check className="h-3 w-3" />
        </button>
        <button onClick={() => { setEditing(false); setClientId(stock.clientId || ""); }} className="inline-flex items-center rounded border border-gray-200 px-1.5 py-0.5 text-xs text-gray-500 hover:bg-gray-50">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function StocksClient() {
  const [stocks, setStocks] = useState<VideoStock[]>([]);
  const [clients, setClients] = useState<DeliveryClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [filterUsed, setFilterUsed] = useState<string>("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterUsed) params.set("isUsed", filterUsed);
    const res = await fetch(`/api/delivery/stocks/init?${params}`);
    const json = await res.json();
    if (json.success) {
      setStocks(json.data.stocks);
      setClients(json.data.clients);
    }
    setLoading(false);
  }, [filterUsed]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(stock: VideoStock) {
    setEditingId(stock.id);
    setForm({
      title: stock.title,
      fileName: stock.fileName,
      googleDriveFileId: stock.googleDriveFileId || "",
      googleDriveUrl: stock.googleDriveUrl || "",
      clientId: stock.clientId || "",
      note: stock.note || "",
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = {
      ...form,
      googleDriveFileId: form.googleDriveFileId || null,
      googleDriveUrl: form.googleDriveUrl || null,
      clientId: form.clientId || null,
      note: form.note || null,
    };

    if (editingId) {
      await fetch(`/api/delivery/stocks/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      await fetch("/api/delivery/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("このストックを削除しますか？")) return;
    const res = await fetch(`/api/delivery/stocks/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!json.success) {
      alert(json.error);
      return;
    }
    fetchAll();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <select
            className="rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={filterUsed}
            onChange={(e) => setFilterUsed(e.target.value)}
          >
            <option value="">すべて</option>
            <option value="false">未使用</option>
            <option value="true">使用済み</option>
          </select>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新規ストック
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">
                {editingId ? "ストック編集" : "新規ストック"}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    タイトル *
                  </label>
                  <Input
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ファイル名 *
                  </label>
                  <Input
                    value={form.fileName}
                    onChange={(e) =>
                      setForm({ ...form, fileName: e.target.value })
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google DriveファイルID
                  </label>
                  <Input
                    value={form.googleDriveFileId}
                    onChange={(e) =>
                      setForm({ ...form, googleDriveFileId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google Drive URL
                  </label>
                  <Input
                    value={form.googleDriveUrl}
                    onChange={(e) =>
                      setForm({ ...form, googleDriveUrl: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    クライアント
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.clientId}
                    onChange={(e) =>
                      setForm({ ...form, clientId: e.target.value })
                    }
                  >
                    <option value="">未割当</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    備考
                  </label>
                  <Input
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
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

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : stocks.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-gray-500 py-8">
              動画ストックがまだ登録されていません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  タイトル
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ファイル名
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  納品区分
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  連携元
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  クライアント
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  ステータス
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stocks.map((stock) => (
                <tr key={stock.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {stock.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {stock.fileName}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <InlineScopeEdit stock={stock} clients={clients} onSaved={fetchAll} />
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {stock.sourceVideo ? (
                      <span className="inline-flex items-center gap-1 rounded bg-teal-50 px-2 py-0.5 text-xs text-teal-700">
                        {stock.sourceVideo.project.projectCode}/{stock.sourceVideo.videoCode}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">手動登録</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <InlineClientEdit stock={stock} clients={clients} onSaved={fetchAll} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={stock.isUsed ? "bg-gray-100 text-gray-600" : "bg-green-100 text-green-800"}>
                      {stock.isUsed ? "使用済み" : "未使用"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(stock)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!stock.isUsed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(stock.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
