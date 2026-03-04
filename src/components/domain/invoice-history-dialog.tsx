"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FilePlus2,
  CheckCircle2,
  Download,
  History,
} from "lucide-react";

type HistoryEntry = {
  id: string;
  actionType: "UPLOAD" | "GENERATE" | "APPROVE";
  actorName: string;
  filePath: boolean;
  fileName: string | null;
  fileSize: number | null;
  extractedSubtotal: number | null;
  extractedWithholding: number | null;
  extractedNetAmount: number | null;
  verificationStatus: string | null;
  createdAt: string;
};

const ACTION_CONFIG = {
  UPLOAD: {
    label: "アップロード",
    icon: Upload,
    color: "text-orange-600",
    bg: "bg-orange-100",
  },
  GENERATE: {
    label: "自動作成",
    icon: FilePlus2,
    color: "text-blue-600",
    bg: "bg-blue-100",
  },
  APPROVE: {
    label: "承認",
    icon: CheckCircle2,
    color: "text-green-600",
    bg: "bg-green-100",
  },
} as const;

const STATUS_LABELS: Record<string, string> = {
  PENDING: "検証中",
  MATCHED: "一致",
  MISMATCHED: "不一致",
  APPROVED: "承認済",
};

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

interface InvoiceHistoryDialogProps {
  paymentNotificationId: string;
  open: boolean;
  onClose: () => void;
}

export function InvoiceHistoryDialog({
  paymentNotificationId,
  open,
  onClose,
}: InvoiceHistoryDialogProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/invoices/${paymentNotificationId}/history`
      );
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "履歴の取得に失敗しました");
        return;
      }
      setEntries(json.data);
    } catch {
      setError("履歴の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [paymentNotificationId]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory]);

  const handleDownload = async (historyId: string) => {
    try {
      const res = await fetch(
        `/api/invoices/${paymentNotificationId}/history/${historyId}/download`
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename\*=UTF-8''(.+)/);
      a.download = match ? decodeURIComponent(match[1]) : "請求書.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="請求書履歴" className="max-w-xl">
      {loading && (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <History className="mr-2 h-4 w-4 animate-spin" />
          読み込み中...
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="py-8 text-center text-sm text-gray-400">
          履歴はありません
        </div>
      )}

      {!loading && !error && entries.length > 0 && (
        <div className="space-y-0">
          {entries.map((entry, index) => {
            const config = ACTION_CONFIG[entry.actionType];
            const Icon = config.icon;
            const isLast = index === entries.length - 1;

            return (
              <div key={entry.id} className="relative flex gap-3">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-[15px] top-[32px] bottom-0 w-px bg-gray-200" />
                )}

                {/* Icon */}
                <div
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${config.bg}`}
                >
                  <Icon className={`h-4 w-4 ${config.color}`} />
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {config.label}
                    </span>
                    {entry.verificationStatus && (
                      <Badge
                        className={
                          entry.verificationStatus === "MATCHED"
                            ? "bg-green-100 text-green-800"
                            : entry.verificationStatus === "MISMATCHED"
                              ? "bg-red-100 text-red-800"
                              : entry.verificationStatus === "APPROVED"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-yellow-100 text-yellow-800"
                        }
                      >
                        {STATUS_LABELS[entry.verificationStatus] ||
                          entry.verificationStatus}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-0.5 text-xs text-gray-500">
                    {entry.actorName} — {formatDateTime(entry.createdAt)}
                  </div>

                  {/* Amount snapshot */}
                  {(entry.extractedSubtotal !== null ||
                    entry.extractedWithholding !== null ||
                    entry.extractedNetAmount !== null) && (
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                      {entry.extractedSubtotal !== null && (
                        <span>
                          報酬: {formatYen(entry.extractedSubtotal)}
                        </span>
                      )}
                      {entry.extractedWithholding !== null && (
                        <span>
                          源泉: {formatYen(entry.extractedWithholding)}
                        </span>
                      )}
                      {entry.extractedNetAmount !== null && (
                        <span>
                          振込: {formatYen(entry.extractedNetAmount)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Download button */}
                  {entry.filePath && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-1 h-7 text-xs"
                      onClick={() => handleDownload(entry.id)}
                    >
                      <Download className="mr-1 h-3.5 w-3.5" />
                      {entry.fileName || "ダウンロード"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Dialog>
  );
}
