"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { VideoStatus, DeliveryScope, MenuCategory } from "@prisma/client";
import { formatRelative } from "@/lib/utils/format-date";
import { Button } from "@/components/ui/button";
import { CircleCheckBig, ExternalLink, Pencil, X, Check } from "lucide-react";

const MENU_CATEGORY_LABELS: Record<string, string> = {
  PORE_CLEANSING: "毛穴洗浄",
  SKIN_IMPROVEMENT: "肌質改善",
  WAX: "ワックス",
  PEELING: "ピーリング",
  OTHER: "その他",
};

interface CompletedVideoRow {
  id: string;
  videoCode: string;
  title: string;
  status: VideoStatus;
  deliveryScope: DeliveryScope | null;
  deliveryClientId: string | null;
  deliveryClientName: string | null;
  menuCategory: MenuCategory | null;
  menuCategoryNote: string | null;
  updatedAt: string;
  project: { projectCode: string; name: string };
  creator: { name: string };
  director: { name: string } | null;
}

interface DeliveryClientOption {
  id: string;
  name: string;
}

function DeliveryScopeCell({
  video,
  deliveryClients,
  onSaved,
}: {
  video: CompletedVideoRow;
  deliveryClients: DeliveryClientOption[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [scope, setScope] = useState<string>(video.deliveryScope || "");
  const [clientId, setClientId] = useState<string>(video.deliveryClientId || "");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        {video.deliveryScope === "ALL_STORES" ? (
          <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
            全店舗用
          </span>
        ) : video.deliveryScope === "SELECTED_STORES" ? (
          <span className="inline-flex items-center gap-1">
            <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
              {video.deliveryClientName || "店舗選択"}
            </span>
          </span>
        ) : (
          <span className="text-gray-300 text-xs">未設定</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    );
  }

  async function handleSave() {
    if (!scope) return;
    if (scope === "SELECTED_STORES" && !clientId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryScope: scope,
          deliveryClientId: scope === "SELECTED_STORES" ? clientId : null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setEditing(false);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => { setScope("ALL_STORES"); setClientId(""); }}
          className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
            scope === "ALL_STORES"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          全店舗
        </button>
        <button
          type="button"
          onClick={() => setScope("SELECTED_STORES")}
          className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
            scope === "SELECTED_STORES"
              ? "border-blue-500 bg-blue-50 text-blue-700"
              : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
          }`}
        >
          店舗選択
        </button>
      </div>
      {scope === "SELECTED_STORES" && (
        <select
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          <option value="">-- 選択 --</option>
          {deliveryClients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={saving || !scope || (scope === "SELECTED_STORES" && !clientId)}
          className="inline-flex items-center rounded bg-blue-600 px-2 py-0.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        >
          <Check className="h-3 w-3 mr-0.5" />
          {saving ? "..." : "保存"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setScope(video.deliveryScope || "");
            setClientId(video.deliveryClientId || "");
          }}
          className="inline-flex items-center rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function MenuCategoryCell({
  video,
  onSaved,
}: {
  video: CompletedVideoRow;
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [category, setCategory] = useState<string>(video.menuCategory || "");
  const [note, setNote] = useState<string>(video.menuCategoryNote || "");
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-1.5">
        {video.menuCategory ? (
          <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700">
            {MENU_CATEGORY_LABELS[video.menuCategory] || video.menuCategory}
            {video.menuCategory === "OTHER" && video.menuCategoryNote
              ? `（${video.menuCategoryNote}）`
              : ""}
          </span>
        ) : (
          <span className="text-gray-300 text-xs">未設定</span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </button>
      </div>
    );
  }

  async function handleSave() {
    if (!category) return;
    if (category === "OTHER" && !note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/videos/${video.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuCategory: category,
          menuCategoryNote: category === "OTHER" ? note : null,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setEditing(false);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {Object.entries(MENU_CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategory(key)}
            className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
              category === key
                ? "border-teal-500 bg-teal-50 text-teal-700"
                : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      {category === "OTHER" && (
        <input
          type="text"
          className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
          placeholder="コメントを入力..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      )}
      <div className="flex gap-1">
        <button
          onClick={handleSave}
          disabled={saving || !category || (category === "OTHER" && !note.trim())}
          className="inline-flex items-center rounded bg-teal-600 px-2 py-0.5 text-xs text-white hover:bg-teal-700 disabled:opacity-50"
        >
          <Check className="h-3 w-3 mr-0.5" />
          {saving ? "..." : "保存"}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setCategory(video.menuCategory || "");
            setNote(video.menuCategoryNote || "");
          }}
          className="inline-flex items-center rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-50"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

export function CompletedTable({
  videos,
  deliveryClients,
}: {
  videos: CompletedVideoRow[];
  deliveryClients: DeliveryClientOption[];
}) {
  const router = useRouter();
  const [filter, setFilter] = useState("");

  const filtered = filter
    ? videos.filter(
        (v) =>
          v.title.toLowerCase().includes(filter.toLowerCase()) ||
          v.videoCode.toLowerCase().includes(filter.toLowerCase())
      )
    : videos;

  if (videos.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
        <CircleCheckBig className="mx-auto h-10 w-10 text-gray-300 mb-2" />
        <p className="text-gray-500">完了した動画はありません</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="動画コード、タイトルで検索..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                動画コード
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                タイトル
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                案件
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                納品区分
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                メニュー
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                クリエイター
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                完了日時
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filtered.map((video) => (
              <tr key={video.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <span className="font-mono text-xs text-gray-600">
                    {video.videoCode}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/approvals/${video.id}`}
                    className="font-medium text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    {video.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {video.project.name}
                </td>
                <td className="px-4 py-3">
                  <DeliveryScopeCell
                    video={video}
                    deliveryClients={deliveryClients}
                    onSaved={() => router.refresh()}
                  />
                </td>
                <td className="px-4 py-3">
                  <MenuCategoryCell
                    video={video}
                    onSaved={() => router.refresh()}
                  />
                </td>
                <td className="px-4 py-3 text-gray-600">
                  {video.creator.name}
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-gray-500">
                    {formatRelative(video.updatedAt)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/approvals/${video.id}`}>
                    <Button variant="secondary" size="sm">
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      詳細
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
