"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pin, Megaphone, ChevronDown, ChevronRight } from "lucide-react";

type Announcement = {
  id: string;
  title: string;
  content: string;
  target: string;
  isPinned: boolean;
  createdAt: string;
  author: { id: string; name: string };
};

const TARGET_LABELS: Record<string, string> = {
  ALL: "全員向け",
  CREATOR: "クリエイター向け",
  DIRECTOR: "ディレクター向け",
  ADMIN: "管理者向け",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AnnouncementsList({ target }: { target: string }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetch_() {
      const res = await fetch(`/api/announcements?target=${target}`);
      const json = await res.json();
      if (json.success) setAnnouncements(json.data);
      setLoading(false);
    }
    fetch_();
  }, [target]);

  if (loading) return <p className="text-gray-500">読み込み中...</p>;

  if (announcements.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white py-12 text-center">
        <Megaphone className="mx-auto h-10 w-10 text-gray-300 mb-2" />
        <p className="text-gray-500">お知らせはありません</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {announcements.map((a) => {
        const isExpanded = expandedId === a.id;
        return (
          <Card key={a.id} className={a.isPinned ? "border-amber-200 bg-amber-50/30" : ""}>
            <div
              className="flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
            >
              {a.isPinned && (
                <Pin className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {a.title}
                  </h3>
                  {a.target !== "ALL" && (
                    <Badge className="bg-gray-100 text-gray-600 text-[10px]">
                      {TARGET_LABELS[a.target]}
                    </Badge>
                  )}
                </div>
                {!isExpanded && (
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
                    {a.content}
                  </p>
                )}
                <div className="mt-1 text-xs text-gray-400">
                  {formatDate(a.createdAt)}・{a.author.name}
                </div>
              </div>
              <div className="flex-shrink-0 mt-1">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
              </div>
            </div>
            {isExpanded && (
              <CardContent className="pt-0 pb-4 px-5">
                <div className="border-t border-gray-100 pt-3">
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {a.content}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
