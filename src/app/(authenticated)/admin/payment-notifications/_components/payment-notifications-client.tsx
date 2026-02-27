"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { EntityType, CompensationType } from "@prisma/client";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Banknote,
  Users,
  Megaphone,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  FileCheck,
} from "lucide-react";
import { ENTITY_TYPE_LABELS } from "@/lib/constants/entity-type";

// ---------- Types ----------

type MonthData = {
  year: number;
  month: number;
  videoCount: number;
  subtotal: number;
  withholdingTax: number;
  netAmount: number;
  notificationId: string | null;
  invoiceStatus: string | null;
  invoiceId: string | null;
};

type UserPaymentRow = {
  userId: string;
  userName: string;
  role: "CREATOR" | "DIRECTOR";
  entityType: EntityType;
  hasCompensation: boolean;
  hasProfile: boolean;
  compensationType: CompensationType | null;
  perVideoRate: number | null;
  customAmount: number | null;
  isFixedMonthly: boolean;
  months: MonthData[];
};

interface PaymentNotificationsClientProps {
  userPayments: UserPaymentRow[];
  availableYears: number[];
}

// ---------- Helpers ----------

const TAX_RATE = 0.1;

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

/** 消費税 (10%) — 切り捨て */
function calcTax(subtotal: number): number {
  return Math.floor(subtotal * TAX_RATE);
}

const ROLE_LABELS: Record<string, string> = {
  CREATOR: "クリエイター",
  DIRECTOR: "ディレクター",
};

// ---------- Component ----------

export function PaymentNotificationsClient({
  userPayments,
  availableYears,
}: PaymentNotificationsClientProps) {
  const router = useRouter();
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(
    String(now.getMonth() + 1)
  );
  const [isAllPeriod, setIsAllPeriod] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [approvingRow, setApprovingRow] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproving, setBulkApproving] = useState(false);

  const yearOptions = availableYears.map((y) => ({
    value: String(y),
    label: `${y}年`,
  }));

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}月`,
  }));

  // Split by role
  const creators = useMemo(
    () => userPayments.filter((u) => u.role === "CREATOR"),
    [userPayments]
  );
  const directors = useMemo(
    () => userPayments.filter((u) => u.role === "DIRECTOR"),
    [userPayments]
  );

  // Filter + aggregate data based on period selection
  const getFilteredData = useCallback(
    (users: UserPaymentRow[]) => {
      if (isAllPeriod) {
        return users.map((u) => {
          const totalVideoCount = u.months.reduce(
            (sum, m) => sum + m.videoCount,
            0
          );
          const totalSubtotal = u.months.reduce(
            (sum, m) => sum + m.subtotal,
            0
          );
          const totalWithholding = u.months.reduce(
            (sum, m) => sum + m.withholdingTax,
            0
          );
          const totalNet = u.months.reduce((sum, m) => sum + m.netAmount, 0);
          return {
            ...u,
            videoCount: totalVideoCount,
            subtotal: totalSubtotal,
            withholdingTax: totalWithholding,
            netAmount: totalNet,
            notificationId: null as string | null,
            invoiceStatus: null as string | null,
            invoiceId: null as string | null,
          };
        });
      }
      const year = Number(selectedYear);
      const month = Number(selectedMonth);
      return users.map((u) => {
        const md = u.months.find((m) => m.year === year && m.month === month);
        return {
          ...u,
          videoCount: md?.videoCount || 0,
          subtotal: md?.subtotal || 0,
          withholdingTax: md?.withholdingTax || 0,
          netAmount: md?.netAmount || 0,
          notificationId: md?.notificationId || null,
          invoiceStatus: md?.invoiceStatus ?? null,
          invoiceId: md?.invoiceId ?? null,
        };
      });
    },
    [isAllPeriod, selectedYear, selectedMonth]
  );

  const creatorData = useMemo(
    () => getFilteredData(creators),
    [getFilteredData, creators]
  );
  const directorData = useMemo(
    () => getFilteredData(directors),
    [getFilteredData, directors]
  );

  // Summary calculations
  const allData = useMemo(
    () => [...creatorData, ...directorData],
    [creatorData, directorData]
  );
  const totalSubtotal = allData.reduce((s, d) => s + d.subtotal, 0);
  const totalTax = allData.reduce((s, d) => s + calcTax(d.subtotal), 0);
  const totalSubtotalWithTax = totalSubtotal + totalTax;
  const totalWithholding = allData.reduce((s, d) => s + d.withholdingTax, 0);
  const totalTransferAmount = totalSubtotalWithTax - totalWithholding;
  const creatorCount = creators.length;
  const directorCount = directors.length;

  // Double-check: users missing compensation or profile
  const missingCompensation = useMemo(
    () => userPayments.filter((u) => !u.hasCompensation),
    [userPayments]
  );
  const missingProfile = useMemo(
    () => userPayments.filter((u) => !u.hasProfile),
    [userPayments]
  );
  const hasWarnings =
    missingCompensation.length > 0 || missingProfile.length > 0;

  // Approved / approvable counts
  const approvedCount = useMemo(() => {
    if (isAllPeriod) return 0;
    return allData.filter((d) => d.notificationId !== null).length;
  }, [allData, isAllPeriod]);
  const approvableCount = useMemo(() => {
    if (isAllPeriod) return 0;
    return allData.filter(
      (d) => d.hasCompensation && (d.subtotal > 0 || d.videoCount > 0)
    ).length;
  }, [allData, isAllPeriod]);

  // PDF download
  const handleDownloadPdf = async (notificationId: string) => {
    setDownloading(notificationId);
    try {
      const res = await fetch(
        `/api/payment-notifications/${notificationId}/pdf`
      );
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

  // Single row approve (= generate)
  const handleRowApprove = async (userId: string) => {
    if (isAllPeriod) return;
    setApprovingRow(userId);
    try {
      const res = await fetch("/api/payment-notifications/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          year: Number(selectedYear),
          month: Number(selectedMonth),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        alert(json.error || "承認に失敗しました");
        return;
      }
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      router.refresh();
    } catch {
      alert("承認に失敗しました");
    } finally {
      setApprovingRow(null);
    }
  };

  // Bulk approve
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0 || isAllPeriod) return;
    setBulkApproving(true);
    try {
      for (const userId of Array.from(selectedIds)) {
        const res = await fetch("/api/payment-notifications/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            year: Number(selectedYear),
            month: Number(selectedMonth),
          }),
        });
        const json = await res.json();
        if (!json.success) {
          alert(json.error || `承認に失敗しました (${userId})`);
        }
      }
      setSelectedIds(new Set());
      router.refresh();
    } catch {
      alert("承認処理に失敗しました");
    } finally {
      setBulkApproving(false);
    }
  };

  // Selection handlers
  const handleToggle = useCallback((userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }, []);

  const handleToggleAll = useCallback((userIds: string[]) => {
    setSelectedIds((prev) => {
      const allSelected = userIds.every((id) => prev.has(id));
      const next = new Set(prev);
      if (allSelected) {
        userIds.forEach((id) => next.delete(id));
      } else {
        userIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, []);

  // Clear selection on period change
  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    setSelectedIds(new Set());
  };
  const handleMonthChange = (value: string) => {
    setSelectedMonth(value);
    setSelectedIds(new Set());
  };
  const handleTogglePeriod = () => {
    setIsAllPeriod((prev) => !prev);
    setSelectedIds(new Set());
  };

  return (
    <>
      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 py-2">
              <div className="rounded-lg bg-blue-50 p-2.5">
                <Banknote className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  合計振込額
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatYen(totalTransferAmount)}
                </p>
                <p className="text-xs text-gray-400">
                  小計 {formatYen(totalSubtotalWithTax)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 py-2">
              <div className="rounded-lg bg-green-50 p-2.5">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  クリエイター数
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {creatorCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 py-2">
              <div className="rounded-lg bg-purple-50 p-2.5">
                <Megaphone className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  ディレクター数
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {directorCount}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="flex items-center gap-3 py-2">
              <div className="rounded-lg bg-red-50 p-2.5">
                <Receipt className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">
                  源泉徴収合計
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatYen(totalWithholding)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Double-check Panel */}
      {hasWarnings && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <h2 className="text-sm font-semibold text-amber-800">
                ダブルチェック — 設定漏れ確認
              </h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {missingCompensation.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    報酬未設定（{missingCompensation.length}名）
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {missingCompensation.map((u) => (
                      <span
                        key={u.userId}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                      >
                        {u.userName}
                        <span className="text-amber-500">
                          ({ROLE_LABELS[u.role]})
                        </span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-amber-600">
                    → ユーザー管理ページで報酬設定を行ってください
                  </p>
                </div>
              )}
              {missingProfile.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    事業者情報未設定（{missingProfile.length}名）
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {missingProfile.map((u) => (
                      <span
                        key={u.userId}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800"
                      >
                        {u.userName}
                        <span className="text-amber-500">
                          ({ROLE_LABELS[u.role]})
                        </span>
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-amber-600">
                    → ユーザー管理ページで事業者情報を登録してください
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        {!isAllPeriod && (
          <>
            <div className="w-32">
              <Select
                id="year"
                label="年"
                options={yearOptions}
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
              />
            </div>
            <div className="w-24">
              <Select
                id="month"
                label="月"
                options={monthOptions}
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
              />
            </div>
          </>
        )}
        <Button
          variant={isAllPeriod ? "primary" : "secondary"}
          size="sm"
          onClick={handleTogglePeriod}
        >
          全期間
        </Button>

        {!isAllPeriod && approvableCount > 0 && (
          <span className="text-xs text-gray-500">
            承認済み: {approvedCount}/{approvableCount}件
            {approvedCount === approvableCount && (
              <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-green-500" />
            )}
          </span>
        )}

        <div className="flex-1" />

        {!isAllPeriod && (
          <Button
            onClick={handleBulkApprove}
            disabled={selectedIds.size === 0}
            loading={bulkApproving}
          >
            <CheckCircle2 className="mr-1.5 h-4 w-4" />
            {selectedIds.size > 0
              ? `選択中の${selectedIds.size}件を承認`
              : "選択して承認"}
          </Button>
        )}
      </div>

      {/* Tables */}
      <div className="space-y-6">
        <PaymentTable
          title="クリエイター支払一覧"
          data={creatorData}
          isAllPeriod={isAllPeriod}
          downloading={downloading}
          approvingRow={approvingRow}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          onDownload={handleDownloadPdf}
          onApprove={handleRowApprove}
          emptyMessage="クリエイターが登録されていません"
        />

        <PaymentTable
          title="ディレクター支払一覧"
          data={directorData}
          isAllPeriod={isAllPeriod}
          downloading={downloading}
          approvingRow={approvingRow}
          selectedIds={selectedIds}
          onToggle={handleToggle}
          onToggleAll={handleToggleAll}
          onDownload={handleDownloadPdf}
          onApprove={handleRowApprove}
          emptyMessage="ディレクターが登録されていません"
        />
      </div>
    </>
  );
}

// ---------- Payment Table Sub-component ----------

type FilteredRow = {
  userId: string;
  userName: string;
  role: "CREATOR" | "DIRECTOR";
  entityType: EntityType;
  hasCompensation: boolean;
  hasProfile: boolean;
  compensationType: CompensationType | null;
  perVideoRate: number | null;
  customAmount: number | null;
  isFixedMonthly: boolean;
  videoCount: number;
  subtotal: number;
  withholdingTax: number;
  netAmount: number;
  notificationId: string | null;
  invoiceStatus: string | null;
  invoiceId: string | null;
};

function isRowApprovable(row: FilteredRow): boolean {
  return row.hasCompensation && row.subtotal > 0 && row.notificationId === null;
}

function PaymentTable({
  title,
  data,
  isAllPeriod,
  downloading,
  approvingRow,
  selectedIds,
  onToggle,
  onToggleAll,
  onDownload,
  onApprove,
  emptyMessage,
}: {
  title: string;
  data: FilteredRow[];
  isAllPeriod: boolean;
  downloading: string | null;
  approvingRow: string | null;
  selectedIds: Set<string>;
  onToggle: (userId: string) => void;
  onToggleAll: (userIds: string[]) => void;
  onDownload: (id: string) => void;
  onApprove: (userId: string) => void;
  emptyMessage: string;
}) {
  const totals = useMemo(() => {
    return data.reduce(
      (acc, d) => {
        const tax = calcTax(d.subtotal);
        const subtotalWithTax = d.subtotal + tax;
        const transferAmount = subtotalWithTax - d.withholdingTax;
        return {
          videoCount: acc.videoCount + d.videoCount,
          subtotal: acc.subtotal + d.subtotal,
          tax: acc.tax + tax,
          subtotalWithTax: acc.subtotalWithTax + subtotalWithTax,
          withholdingTax: acc.withholdingTax + d.withholdingTax,
          transferAmount: acc.transferAmount + transferAmount,
        };
      },
      { videoCount: 0, subtotal: 0, tax: 0, subtotalWithTax: 0, withholdingTax: 0, transferAmount: 0 }
    );
  }, [data]);

  const approvableIds = useMemo(
    () => data.filter(isRowApprovable).map((d) => d.userId),
    [data]
  );

  const allApprovableSelected =
    approvableIds.length > 0 && approvableIds.every((id) => selectedIds.has(id));

  // allPeriod: 10 cols, month view: 13 cols (checkbox + status + invoice added)
  const colCount = isAllPeriod ? 10 : 13;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <span className="text-xs text-gray-400">{data.length}名</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {!isAllPeriod && (
                  <th className="w-10 px-2 py-3 text-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={allApprovableSelected}
                      disabled={approvableIds.length === 0}
                      onChange={() => onToggleAll(approvableIds)}
                    />
                  </th>
                )}
                <th className="px-3 py-3 text-left font-medium text-gray-500">
                  名前
                </th>
                <th className="px-2 py-3 text-center font-medium text-gray-500">
                  区分
                </th>
                <th className="px-2 py-3 text-center font-medium text-gray-500">
                  設定
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  単価
                </th>
                <th className="px-2 py-3 text-center font-medium text-gray-500">
                  本数
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  報酬（税抜）
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  消費税
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  小計
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  源泉徴収
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  振込額
                </th>
                {!isAllPeriod && (
                  <th className="px-2 py-3 text-center font-medium text-gray-500">
                    状態
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                <>
                  {data.map((row) => {
                    const canApprove = isRowApprovable(row);

                    // 単価表示
                    let unitPrice: string;
                    if (!row.hasCompensation) {
                      unitPrice = "—";
                    } else if (row.compensationType === "PER_VIDEO") {
                      unitPrice = formatYen(row.perVideoRate || 0);
                    } else if (row.isFixedMonthly) {
                      unitPrice = "月額固定";
                    } else {
                      unitPrice = "カスタム";
                    }

                    // 税計算
                    const tax = calcTax(row.subtotal);
                    const subtotalWithTax = row.subtotal + tax;
                    const transferAmount = subtotalWithTax - row.withholdingTax;

                    return (
                      <tr
                        key={row.userId}
                        className={`hover:bg-gray-50 ${
                          !row.hasCompensation ? "bg-amber-50/50" : ""
                        }`}
                      >
                        {/* チェックボックス */}
                        {!isAllPeriod && (
                          <td className="w-10 px-2 py-3 text-center">
                            {canApprove ? (
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={selectedIds.has(row.userId)}
                                onChange={() => onToggle(row.userId)}
                              />
                            ) : row.notificationId ? (
                              <span className="text-gray-300">—</span>
                            ) : (
                              <span className="text-gray-300">—</span>
                            )}
                          </td>
                        )}
                        {/* 名前 */}
                        <td className="px-3 py-3 font-medium text-gray-900">
                          {row.userName}
                        </td>
                        {/* 区分 */}
                        <td className="px-2 py-3 text-center">
                          <Badge
                            className={
                              row.entityType === "CORPORATION"
                                ? "bg-teal-100 text-teal-800"
                                : "bg-orange-100 text-orange-800"
                            }
                          >
                            {ENTITY_TYPE_LABELS[row.entityType]}
                          </Badge>
                        </td>
                        {/* 設定 */}
                        <td className="px-2 py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${
                                row.hasCompensation
                                  ? "bg-green-400"
                                  : "bg-amber-400"
                              }`}
                              title={
                                row.hasCompensation
                                  ? "報酬設定済み"
                                  : "報酬未設定"
                              }
                            />
                            <span
                              className={`inline-block h-2 w-2 rounded-full ${
                                row.hasProfile
                                  ? "bg-green-400"
                                  : "bg-amber-400"
                              }`}
                              title={
                                row.hasProfile
                                  ? "事業者情報設定済み"
                                  : "事業者情報未設定"
                              }
                            />
                          </div>
                        </td>
                        {/* 単価 */}
                        <td className="px-2 py-3 text-right text-xs text-gray-600">
                          {!row.hasCompensation ? (
                            <span className="text-amber-500 font-medium">
                              未設定
                            </span>
                          ) : (
                            unitPrice
                          )}
                        </td>
                        {/* 本数 */}
                        <td className="px-2 py-3 text-center text-gray-700">
                          {row.videoCount}
                        </td>
                        {/* 報酬（税抜） */}
                        <td className="px-2 py-3 text-right text-gray-700">
                          {formatYen(row.subtotal)}
                        </td>
                        {/* 消費税 */}
                        <td className="px-2 py-3 text-right text-gray-500">
                          {tax > 0 ? formatYen(tax) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        {/* 小計 */}
                        <td className="px-2 py-3 text-right text-gray-700">
                          {formatYen(subtotalWithTax)}
                        </td>
                        {/* 源泉徴収 */}
                        <td className="px-2 py-3 text-right">
                          {row.withholdingTax > 0 ? (
                            <span className="text-red-600">
                              ▲{formatYen(row.withholdingTax)}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        {/* 振込額 */}
                        <td className="px-2 py-3 text-right font-semibold text-gray-900">
                          {formatYen(transferAmount)}
                        </td>
                        {/* 状態 */}
                        {!isAllPeriod && (
                          <td className="px-2 py-3 text-center">
                            {row.notificationId ? (
                              <div className="flex items-center justify-center gap-1.5">
                                <Badge className="bg-green-100 text-green-800">
                                  承認済
                                </Badge>
                                <button
                                  type="button"
                                  className="inline-flex items-center rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 disabled:opacity-50"
                                  onClick={() =>
                                    onDownload(row.notificationId!)
                                  }
                                  disabled={
                                    downloading === row.notificationId
                                  }
                                  title="PDFダウンロード"
                                >
                                  <Download className="h-4 w-4" />
                                </button>
                              </div>
                            ) : canApprove ? (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => onApprove(row.userId)}
                                loading={approvingRow === row.userId}
                              >
                                承認
                              </Button>
                            ) : (
                              <span className="text-xs text-gray-300">
                                —
                              </span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                    {!isAllPeriod && <td className="px-2 py-3" />}
                    <td className="px-3 py-3 text-gray-700">合計</td>
                    <td className="px-2 py-3" />
                    <td className="px-2 py-3" />
                    <td className="px-2 py-3" />
                    <td className="px-2 py-3 text-center text-gray-700">
                      {totals.videoCount}
                    </td>
                    <td className="px-2 py-3 text-right text-gray-700">
                      {formatYen(totals.subtotal)}
                    </td>
                    <td className="px-2 py-3 text-right text-gray-500">
                      {totals.tax > 0 ? formatYen(totals.tax) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right text-gray-700">
                      {formatYen(totals.subtotalWithTax)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      {totals.withholdingTax > 0 ? (
                        <span className="text-red-600">
                          ▲{formatYen(totals.withholdingTax)}
                        </span>
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-2 py-3 text-right text-gray-900">
                      {formatYen(totals.transferAmount)}
                    </td>
                    {!isAllPeriod && <td className="px-2 py-3" />}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
