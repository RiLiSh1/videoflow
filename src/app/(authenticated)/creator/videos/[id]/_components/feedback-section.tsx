"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils/format-date";

type FeedbackItem = {
  id: string;
  comment: string;
  videoTimestamp: number | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: Role;
  };
  version: {
    id: string;
    versionNumber: number;
  };
};

type VersionOption = {
  id: string;
  versionNumber: number;
};

interface FeedbackSectionProps {
  videoId: string;
  feedbacks: FeedbackItem[];
  versions: VersionOption[];
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

const ROLE_LABELS: Record<Role, string> = {
  CREATOR: "クリエイター",
  DIRECTOR: "ディレクター",
  ADMIN: "管理者",
};

export function FeedbackSection({ videoId, feedbacks, versions }: FeedbackSectionProps) {
  const router = useRouter();
  const [comment, setComment] = useState("");
  const [videoTimestamp, setVideoTimestamp] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState(
    versions.length > 0 ? versions[0].id : ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Group feedbacks by version
  const feedbacksByVersion = new Map<number, FeedbackItem[]>();
  for (const fb of feedbacks) {
    const vn = fb.version.versionNumber;
    if (!feedbacksByVersion.has(vn)) {
      feedbacksByVersion.set(vn, []);
    }
    feedbacksByVersion.get(vn)!.push(fb);
  }

  // Sort version numbers descending
  const sortedVersionNumbers = Array.from(feedbacksByVersion.keys()).sort(
    (a, b) => b - a
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!comment.trim()) {
      setError("コメントを入力してください");
      return;
    }

    if (!selectedVersionId) {
      setError("バージョンを選択してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          versionId: selectedVersionId,
          comment: comment.trim(),
          videoTimestamp: videoTimestamp ? parseFloat(videoTimestamp) : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "フィードバックの送信に失敗しました");
        return;
      }

      setComment("");
      setVideoTimestamp("");
      router.refresh();
    } catch {
      setError("フィードバックの送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Feedback form */}
      {versions.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-semibold text-gray-900">コメントを追加</h3>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="versionSelect" className="block text-sm font-medium text-gray-700">
                  バージョン
                </label>
                <select
                  id="versionSelect"
                  value={selectedVersionId}
                  onChange={(e) => setSelectedVersionId(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
                  コメント
                </label>
                <textarea
                  id="comment"
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="コメントを入力..."
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <Input
                id="videoTimestamp"
                label="タイムスタンプ（秒・任意）"
                type="number"
                step="0.1"
                placeholder="例: 30.5"
                value={videoTimestamp}
                onChange={(e) => setVideoTimestamp(e.target.value)}
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" loading={isSubmitting}>
                コメントを送信
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Feedback list grouped by version */}
      {sortedVersionNumbers.length > 0 ? (
        sortedVersionNumbers.map((versionNumber) => (
          <Card key={versionNumber}>
            <CardHeader>
              <h3 className="text-base font-semibold text-gray-900">
                v{versionNumber} のフィードバック
              </h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {feedbacksByVersion.get(versionNumber)!.map((fb) => (
                  <div
                    key={fb.id}
                    className="rounded-lg border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {fb.user.name}
                        </span>
                        <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">
                          {ROLE_LABELS[fb.user.role]}
                        </span>
                        {fb.videoTimestamp !== null && (
                          <span className="rounded bg-blue-100 px-2 py-0.5 text-xs font-mono text-blue-700">
                            {formatTimestamp(fb.videoTimestamp)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatDateTime(fb.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {fb.comment}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-sm text-gray-500">フィードバックはまだありません</p>
      )}
    </div>
  );
}
