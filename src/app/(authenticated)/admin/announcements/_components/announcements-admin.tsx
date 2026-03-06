"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Pin, Eye, EyeOff } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  target: "ALL" | "CREATOR" | "DIRECTOR" | "ADMIN";
  isPinned: boolean;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
  author: { id: string; name: string };
};

const TARGET_LABELS: Record<string, { label: string; className: string }> = {
  ALL: { label: "全員", className: "bg-blue-100 text-blue-800" },
  CREATOR: { label: "クリエイター", className: "bg-purple-100 text-purple-800" },
  DIRECTOR: { label: "ディレクター", className: "bg-teal-100 text-teal-800" },
  ADMIN: { label: "管理者", className: "bg-amber-100 text-amber-800" },
};

type FormData = {
  title: string;
  content: string;
  target: string;
  isPinned: boolean;
  isPublished: boolean;
};

const emptyForm: FormData = {
  title: "",
  content: "",
  target: "ALL",
  isPinned: false,
  isPublished: true,
};

export function AnnouncementsAdmin() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [filterTarget, setFilterTarget] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ all: "true" });
    if (filterTarget) params.set("target", filterTarget);
    const res = await fetch(`/api/announcements?${params}`);
    const json = await res.json();
    if (json.success) setAnnouncements(json.data);
    setLoading(false);
  }, [filterTarget]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }

  function openEdit(a: Announcement) {
    setEditingId(a.id);
    setForm({
      title: a.title,
      content: a.content,
      target: a.target,
      isPinned: a.isPinned,
      isPublished: a.isPublished,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      await fetch(`/api/announcements/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setShowForm(false);
    fetchAll();
  }

  async function handleDelete(id: string) {
    if (!confirm("このお知らせを削除しますか？")) return;
    await fetch(`/api/announcements/${id}`, { method: "DELETE" });
    fetchAll();
  }

  async function togglePin(a: Announcement) {
    await fetch(`/api/announcements/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPinned: !a.isPinned }),
    });
    fetchAll();
  }

  async function togglePublish(a: Announcement) {
    await fetch(`/api/announcements/${a.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !a.isPublished }),
    });
    fetchAll();
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("ja-JP", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <select
          className="rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={filterTarget}
          onChange={(e) => setFilterTarget(e.target.value)}
        >
          <option value="">すべての対象</option>
          <option value="ALL">全員向け</option>
          <option value="CREATOR">クリエイター向け</option>
          <option value="DIRECTOR">ディレクター向け</option>
          <option value="ADMIN">管理者向け</option>
        </select>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          新規お知らせ
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <h3 className="text-lg font-semibold">
                {editingId ? "お知らせ編集" : "新規お知らせ"}
              </h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  タイトル *
                </label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="例: 薬機法の改定に伴う表現の注意点"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  本文 *
                </label>
                <textarea
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="お知らせの内容を入力してください..."
                  required
                />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    対象
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    value={form.target}
                    onChange={(e) => setForm({ ...form, target: e.target.value })}
                  >
                    <option value="ALL">全員</option>
                    <option value="CREATOR">クリエイター</option>
                    <option value="DIRECTOR">ディレクター</option>
                    <option value="ADMIN">管理者</option>
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isPinned}
                      onChange={(e) =>
                        setForm({ ...form, isPinned: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    ピン留め（上部固定）
                  </label>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(e) =>
                        setForm({ ...form, isPublished: e.target.checked })
                      }
                      className="rounded border-gray-300"
                    />
                    公開する
                  </label>
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
                <Button type="submit">{editingId ? "更新" : "作成"}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <p className="text-gray-500">読み込み中...</p>
      ) : announcements.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-center text-gray-500 py-8">
              お知らせはまだありません
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => {
            const targetInfo = TARGET_LABELS[a.target] || TARGET_LABELS.ALL;
            return (
              <Card
                key={a.id}
                className={!a.isPublished ? "opacity-60" : undefined}
              >
                <CardContent>
                  <div className="flex items-start justify-between gap-4 pt-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {a.isPinned && (
                          <Pin className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
                        )}
                        <h3 className="text-base font-semibold text-gray-900">
                          {a.title}
                        </h3>
                        <Badge className={targetInfo.className}>
                          {targetInfo.label}
                        </Badge>
                        {!a.isPublished && (
                          <Badge className="bg-gray-100 text-gray-500">
                            非公開
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap line-clamp-3">
                        {a.content}
                      </p>
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        <span>{formatDate(a.createdAt)}</span>
                        <span>{a.author.name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePin(a)}
                        title={a.isPinned ? "ピン解除" : "ピン留め"}
                      >
                        <Pin
                          className={`h-4 w-4 ${a.isPinned ? "text-amber-500" : "text-gray-300"}`}
                        />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => togglePublish(a)}
                        title={a.isPublished ? "非公開にする" : "公開する"}
                      >
                        {a.isPublished ? (
                          <Eye className="h-4 w-4 text-green-500" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-gray-300" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(a)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(a.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
