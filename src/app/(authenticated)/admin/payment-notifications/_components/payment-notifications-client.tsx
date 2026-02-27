"use client";

import { useState, useEffect, useCallback } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import type { EntityType } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ENTITY_TYPE_LABELS } from "@/lib/constants/entity-type";
import { Download, Plus } from "lucide-react";
import { GenerateDialog } from "./generate-dialog";

type CreatorOption = {
  id: string;
  name: string;
  entityType: EntityType | null;
  hasCompensation: boolean;
};

type NotificationRow = {
  id: string;
  year: number;
  month: number;
  subtotal: number;
  withholdingTax: number;
  netAmount: number;
  creator: { id: string; name: string };
  generator: { id: string; name: string };
  createdAt: string;
};

interface PaymentNotificationsClientProps {
  creators: CreatorOption[];
}

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 3 }, (_, i) => ({
  value: String(currentYear - i),
  label: `${currentYear - i}年`,
}));

const monthOptions = Array.from({ length: 12 }, (_, i) => ({
  value: String(i + 1),
  label: `${i + 1}月`,
}));

export function PaymentNotificationsClient({
  creators,
}: PaymentNotificationsClientProps) {
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/payment-notifications?year=${year}&month=${month}`
      );
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleDownloadPdf = async (id: string) => {
    setDownloading(id);
    try {
      const res = await fetch(`/api/payment-notifications/${id}/pdf`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const disposition = res.headers.get("Content-Disposition");
      const match = disposition?.match(/filename\*=UTF-8''(.+)/);
      a.download = match ? decodeURIComponent(match[1]) : "支払通知書.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("PDFのダウンロードに失敗しました");
    } finally {
      setDownloading(null);
    }
  };

  const columns: ColumnDef<NotificationRow, unknown>[] = [
    {
      accessorKey: "creator.name",
      header: "クリエイター",
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {row.original.creator.name}
        </span>
      ),
    },
    {
      id: "period",
      header: "対象期間",
      cell: ({ row }) => (
        <span className="text-gray-600">
          {row.original.year}年{row.original.month}月
        </span>
      ),
    },
    {
      accessorKey: "subtotal",
      header: "小計",
      cell: ({ row }) => (
        <span className="text-gray-700">{formatYen(row.original.subtotal)}</span>
      ),
    },
    {
      accessorKey: "withholdingTax",
      header: "源泉徴収税",
      cell: ({ row }) =>
        row.original.withholdingTax > 0 ? (
          <span className="text-red-600">
            ▲{formatYen(row.original.withholdingTax)}
          </span>
        ) : (
          <span className="text-gray-300">-</span>
        ),
    },
    {
      accessorKey: "netAmount",
      header: "支払金額",
      cell: ({ row }) => (
        <span className="font-semibold text-gray-900">
          {formatYen(row.original.netAmount)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => handleDownloadPdf(row.original.id)}
          loading={downloading === row.original.id}
        >
          <Download className="mr-1.5 h-3.5 w-3.5" />
          PDF
        </Button>
      ),
    },
  ];

  return (
    <>
      {/* Filters */}
      <div className="mb-4 flex items-end gap-4">
        <div className="w-32">
          <Select
            id="year"
            label="年"
            options={yearOptions}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
        <div className="w-24">
          <Select
            id="month"
            label="月"
            options={monthOptions}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div className="flex-1" />
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          生成
        </Button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-8 text-center text-gray-500">読み込み中...</div>
      ) : notifications.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            {year}年{month}月の支払通知書はまだ生成されていません。
          </p>
        </div>
      ) : (
        <DataTable
          data={notifications}
          columns={columns}
          searchPlaceholder="クリエイター名で検索..."
          searchColumn="creator.name"
        />
      )}

      <GenerateDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSuccess={() => {
          setGenerateOpen(false);
          fetchNotifications();
        }}
        creators={creators}
        defaultYear={year}
        defaultMonth={month}
      />
    </>
  );
}
