"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2 } from "lucide-react";

type DeliveryClient = {
  id: string;
  name: string;
  lineGroupId: string | null;
  googleDriveFolderId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  note: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    videoStocks: number;
    deliverySchedules: number;
  };
};

type FormData = {
  name: string;
  lineGroupId: string;
  googleDriveFolderId: string;
  contactName: string;
  contactEmail: string;
  note: string;
};

const emptyForm: FormData = {
  name: "",
  lineGroupId: "",
  googleDriveFolderId: "",
  contactName: "",
  contactEmail: "",
  note: "",
};

export function ClientsClient() {
  const [clients, setClients] = useState<DeliveryClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/delivery/clients");
    const json = await res.json();
    if (json.success) setClients(json.data);
    setLoading(false);
  }, []);

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
    });
    setShowForm(true);
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

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新規クライアント
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">
                {editingId ? "クライアント編集" : "新規クライアント"}
              </h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    クライアント名 *
                  </label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    LINEグループID
                  </label>
                  <Input
                    value={form.lineGroupId}
                    onChange={(e) =>
                      setForm({ ...form, lineGroupId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Google DriveフォルダID
                  </label>
                  <Input
                    value={form.googleDriveFolderId}
                    onChange={(e) =>
                      setForm({ ...form, googleDriveFolderId: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    担当者名
                  </label>
                  <Input
                    value={form.contactName}
                    onChange={(e) =>
                      setForm({ ...form, contactName: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    担当者メール
                  </label>
                  <Input
                    type="email"
                    value={form.contactEmail}
                    onChange={(e) =>
                      setForm({ ...form, contactEmail: e.target.value })
                    }
                  />
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
      ) : clients.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-gray-500 py-8">
              クライアントがまだ登録されていません
            </p>
          </CardContent>
        </Card>
      ) : (
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
                  ストック数
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  スケジュール数
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
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {client.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {client.contactName || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {client._count.videoStocks}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {client._count.deliverySchedules}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(client)}>
                      <Badge
                        className={client.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}
                      >
                        {client.isActive ? "有効" : "無効"}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(client)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(client.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
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
