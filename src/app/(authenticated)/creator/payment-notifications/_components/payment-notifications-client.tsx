"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InvoiceVerificationStatus } from "@prisma/client";
import {
  CheckCircle2,
  XCircle,
  Upload,
  FileText,
  FilePlus2,
  Download,
  AlertCircle,
} from "lucide-react";

type InvoiceData = {
  id: string;
  verificationStatus: InvoiceVerificationStatus;
  extractedSubtotal: number | null;
  extractedWithholding: number | null;
  extractedNetAmount: number | null;
  fileName: string;
};

type NotificationData = {
  id: string;
  year: number;
  month: number;
  subtotal: number;
  consumptionTax: number;
  withholdingTax: number;
  netAmount: number;
  invoice: InvoiceData | null;
};

interface Props {
  notifications: NotificationData[];
}

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function StatusBadge({ status }: { status: InvoiceVerificationStatus }) {
  const styles: Record<InvoiceVerificationStatus, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    MATCHED: "bg-green-100 text-green-800",
    MISMATCHED: "bg-red-100 text-red-800",
    APPROVED: "bg-blue-100 text-blue-800",
  };
  const labels: Record<InvoiceVerificationStatus, string> = {
    PENDING: "検証中",
    MATCHED: "一致",
    MISMATCHED: "不一致",
    APPROVED: "承認済み",
  };
  return <Badge className={styles[status]}>{labels[status]}</Badge>;
}

function ComparisonRow({
  label,
  expected,
  extracted,
}: {
  label: string;
  expected: number;
  extracted: number | null;
}) {
  const match = extracted !== null && extracted === expected;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 shrink-0 text-gray-500">{label}</span>
      <span className="font-medium text-gray-700">{formatYen(expected)}</span>
      <span className="text-gray-400">→</span>
      <span className="font-medium text-gray-700">
        抽出: {extracted !== null ? formatYen(extracted) : "—"}
      </span>
      {extracted !== null &&
        (match ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <XCircle className="h-4 w-4 text-red-500" />
        ))}
    </div>
  );
}

function NotificationCard({ notification }: { notification: NotificationData }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("paymentNotificationId", notification.id);

      const res = await fetch("/api/invoices", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "アップロードに失敗しました");
        return;
      }
      router.refresh();
    } catch {
      setError("アップロードに失敗しました。ネットワークを確認してください。");
    } finally {
      setUploading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/invoices/${notification.id}/generate`, {
        method: "POST",
      });

      if (res.status === 401) {
        setError("セッションが切れました。ページを再読み込みしてください。");
        return;
      }

      if (!res.ok) {
        // Try to parse error JSON
        const text = await res.text();
        let errorMsg = "請求書の生成に失敗しました";
        try {
          const json = JSON.parse(text);
          if (json?.error) errorMsg = json.error;
        } catch {
          // Non-JSON response
        }
        setError(errorMsg);
        return;
      }

      // Verify we got a PDF response
      const contentType = res.headers.get("Content-Type");
      if (!contentType?.includes("application/pdf")) {
        setError("サーバーから不正なレスポンスが返されました");
        return;
      }

      // Download the PDF
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
      router.refresh();
    } catch (err) {
      console.error("Invoice generate error:", err);
      setError("請求書の生成に失敗しました。ネットワークを確認してください。");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = async () => {
    try {
      const res = await fetch(`/api/invoices/${notification.id}/download`);
      if (!res.ok) {
        setError("ダウンロードに失敗しました");
        return;
      }
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
      setError("ダウンロードに失敗しました");
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    e.target.value = "";
  };

  const inv = notification.invoice;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            {notification.year}年{notification.month}月
          </h3>
          {inv && <StatusBadge status={inv.verificationStatus} />}
        </div>
      </CardHeader>
      <CardContent>
        {/* Payment details */}
        <div className="mb-4 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">報酬額（税抜）</span>
            <span className="font-medium">{formatYen(notification.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">消費税（10%）</span>
            <span className="font-medium">{formatYen(notification.consumptionTax)}</span>
          </div>
          {notification.withholdingTax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">源泉徴収税額</span>
              <span className="font-medium text-red-600">
                ▲{formatYen(notification.withholdingTax)}
              </span>
            </div>
          )}
          <div className="flex justify-between border-t pt-1 text-sm">
            <span className="font-medium text-gray-700">振込額</span>
            <span className="font-bold text-gray-900">
              {formatYen(notification.netAmount)}
            </span>
          </div>
        </div>

        {/* Error display */}
        {error && (
          <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Invoice section */}
        <div className="border-t pt-3">
          <p className="mb-2 text-xs font-medium text-gray-500">請求書</p>

          {!inv ? (
            <div className="space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={onFileChange}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                loading={uploading}
                className="w-full"
              >
                <Upload className="mr-1.5 h-4 w-4" />
                請求書をアップロード
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerate}
                loading={generating}
                className="w-full"
              >
                <FilePlus2 className="mr-1.5 h-4 w-4" />
                請求書を自動作成
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span className="truncate max-w-[180px]">{inv.fileName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="shrink-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>

              {inv.verificationStatus !== "APPROVED" && (
                <>
                  <ComparisonRow
                    label="報酬額"
                    expected={notification.subtotal}
                    extracted={inv.extractedSubtotal}
                  />
                  <ComparisonRow
                    label="源泉徴収税額"
                    expected={notification.withholdingTax}
                    extracted={inv.extractedWithholding}
                  />
                  <ComparisonRow
                    label="振込額"
                    expected={notification.netAmount}
                    extracted={inv.extractedNetAmount}
                  />

                  {/* Re-upload option */}
                  <div className="flex gap-2 pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={onFileChange}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      loading={uploading}
                    >
                      <Upload className="mr-1.5 h-4 w-4" />
                      再アップロード
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleGenerate}
                      loading={generating}
                    >
                      <FilePlus2 className="mr-1.5 h-4 w-4" />
                      自動作成で上書き
                    </Button>
                  </div>
                </>
              )}

              {inv.verificationStatus === "APPROVED" && (
                <div className="flex items-center gap-1.5 text-sm text-blue-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>管理者により承認済み</span>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function PaymentNotificationsClient({ notifications }: Props) {
  if (notifications.length === 0) {
    return (
      <div className="py-12 text-center text-gray-400">
        支払通知書はまだありません
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {notifications.map((n) => (
        <NotificationCard key={n.id} notification={n} />
      ))}
    </div>
  );
}
