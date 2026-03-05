"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

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
  createdAt: string;
  client: { id: string; name: string } | null;
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
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {stock.client?.name || "-"}
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
