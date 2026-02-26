"use client";

import type { Role } from "@prisma/client";
import { RoleBadge } from "@/components/domain/role-badge";
import { formatDateTime } from "@/lib/utils/format-date";

interface FeedbackItem {
  id: string;
  comment: string;
  videoTimestamp: number | null;
  actionType: string | null;
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
}

interface FeedbackHistoryProps {
  feedbacks: FeedbackItem[];
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 10);
  return `${mins}:${String(secs).padStart(2, "0")}.${ms}`;
}

export function FeedbackHistory({ feedbacks }: FeedbackHistoryProps) {
  if (feedbacks.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-gray-500">
        フィードバックはまだありません
      </p>
    );
  }

  // Group feedbacks by version
  const groupedByVersion = feedbacks.reduce<Record<number, FeedbackItem[]>>(
    (acc, feedback) => {
      const vn = feedback.version.versionNumber;
      if (!acc[vn]) {
        acc[vn] = [];
      }
      acc[vn].push(feedback);
      return acc;
    },
    {}
  );

  // Sort version numbers descending (newest first)
  const sortedVersionNumbers = Object.keys(groupedByVersion)
    .map(Number)
    .sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {sortedVersionNumbers.map((versionNumber) => (
        <div key={versionNumber}>
          <h4 className="mb-3 text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">
            バージョン {versionNumber}
          </h4>
          <div className="space-y-3">
            {groupedByVersion[versionNumber].map((feedback) => (
              <div
                key={feedback.id}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {feedback.user.name}
                    </span>
                    <RoleBadge role={feedback.user.role} />
                    {feedback.videoTimestamp !== null && (
                      <span className="inline-flex items-center rounded bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">
                        {formatTimestamp(feedback.videoTimestamp)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {formatDateTime(feedback.createdAt)}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-gray-700">
                  {feedback.comment}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
