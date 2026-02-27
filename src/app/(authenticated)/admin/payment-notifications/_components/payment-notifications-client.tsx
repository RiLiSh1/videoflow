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
  Plus,
  Banknote,
  Users,
  Megaphone,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { GenerateDialog } from "./generate-dialog";
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
  const [generateOpen, setGenerateOpen] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [generatingRow, setGeneratingRow] = useState<string | null>(null);

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
  const totalTax = calcTax(totalSubtotal);
  const totalWithholding = allData.reduce((s, d) => s + d.withholdingTax, 0);
  const totalPaymentExTax = totalSubtotal - totalWithholding;
  const totalPaymentInTax = totalSubtotal + totalTax - totalWithholding;
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

  // Per-row generation count (for period view)
  const generatedCount = useMemo(() => {
    if (isAllPeriod) return 0;
    return allData.filter((d) => d.notificationId !== null).length;
  }, [allData, isAllPeriod]);
  const generatableCount = useMemo(() => {
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

  // Per-row generate
  const handleRowGenerate = async (userId: string) => {
    if (isAllPeriod) return;
    setGeneratingRow(userId);
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
        alert(json.error || "生成に失敗しました");
        return;
      }
      router.refresh();
    } catch {
      alert("生成に失敗しました");
    } finally {
      setGeneratingRow(null);
    }
  };

  // Users for generate dialog
  const usersForGenerate = useMemo(
    () =>
      userPayments
        .filter((u) => u.hasCompensation)
        .map((u) => ({
          id: u.userId,
          name: u.userName,
          role: u.role,
          entityType: u.entityType,
          hasCompensation: true,
        })),
    [userPayments]
  );

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
                  合計支払額（税込）
                </p>
                <p className="text-xl font-bold text-gray-900">
                  {formatYen(totalPaymentInTax)}
                </p>
                <p className="text-xs text-gray-400">
                  税抜 {formatYen(totalPaymentExTax)}
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
                onChange={(e) => setSelectedYear(e.target.value)}
              />
            </div>
            <div className="w-24">
              <Select
                id="month"
                label="月"
                options={monthOptions}
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </>
        )}
        <Button
          variant={isAllPeriod ? "primary" : "secondary"}
          size="sm"
          onClick={() => setIsAllPeriod(!isAllPeriod)}
        >
          全期間
        </Button>

        {!isAllPeriod && generatableCount > 0 && (
          <span className="text-xs text-gray-500">
            生成済み: {generatedCount}/{generatableCount}件
            {generatedCount === generatableCount && (
              <CheckCircle2 className="ml-1 inline h-3.5 w-3.5 text-green-500" />
            )}
          </span>
        )}

        <div className="flex-1" />
        <Button onClick={() => setGenerateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          生成
        </Button>
      </div>

      {/* Tables */}
      <div className="space-y-6">
        <PaymentTable
          title="クリエイター支払一覧"
          data={creatorData}
          isAllPeriod={isAllPeriod}
          downloading={downloading}
          generatingRow={generatingRow}
          onDownload={handleDownloadPdf}
          onGenerate={handleRowGenerate}
          emptyMessage="クリエイターが登録されていません"
        />

        <PaymentTable
          title="ディレクター支払一覧"
          data={directorData}
          isAllPeriod={isAllPeriod}
          downloading={downloading}
          generatingRow={generatingRow}
          onDownload={handleDownloadPdf}
          onGenerate={handleRowGenerate}
          emptyMessage="ディレクターが登録されていません"
        />
      </div>

      <GenerateDialog
        open={generateOpen}
        onClose={() => setGenerateOpen(false)}
        onSuccess={() => {
          setGenerateOpen(false);
          router.refresh();
        }}
        users={usersForGenerate}
        defaultYear={selectedYear}
        defaultMonth={selectedMonth}
      />
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
};

function PaymentTable({
  title,
  data,
  isAllPeriod,
  downloading,
  generatingRow,
  onDownload,
  onGenerate,
  emptyMessage,
}: {
  title: string;
  data: FilteredRow[];
  isAllPeriod: boolean;
  downloading: string | null;
  generatingRow: string | null;
  onDownload: (id: string) => void;
  onGenerate: (userId: string) => void;
  emptyMessage: string;
}) {
  const totals = useMemo(() => {
    const base = data.reduce(
      (acc, d) => ({
        videoCount: acc.videoCount + d.videoCount,
        subtotal: acc.subtotal + d.subtotal,
        withholdingTax: acc.withholdingTax + d.withholdingTax,
      }),
      { videoCount: 0, subtotal: 0, withholdingTax: 0 }
    );
    const tax = calcTax(base.subtotal);
    return {
      ...base,
      tax,
      grossSubtotal: base.subtotal + tax,
      paymentExTax: base.subtotal - base.withholdingTax,
      paymentInTax: base.subtotal + tax - base.withholdingTax,
    };
  }, [data]);

  const colCount = isAllPeriod ? 11 : 12;

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
                  小計（税抜）
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  消費税
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  小計（税込）
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  源泉徴収
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  支払額（税抜）
                </th>
                <th className="px-2 py-3 text-right font-medium text-gray-500">
                  支払額（税込）
                </th>
                {!isAllPeriod && (
                  <th className="px-2 py-3 text-center font-medium text-gray-500">
                    操作
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
                    const canGenerate =
                      row.hasCompensation &&
                      (row.subtotal > 0 || row.videoCount > 0);

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
                    const grossSubtotal = row.subtotal + tax;
                    const paymentExTax = row.subtotal - row.withholdingTax;
                    const paymentInTax = grossSubtotal - row.withholdingTax;

                    return (
                      <tr
                        key={row.userId}
                        className={`hover:bg-gray-50 ${
                          !row.hasCompensation ? "bg-amber-50/50" : ""
                        }`}
                      >
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
                        {/* 小計（税抜） */}
                        <td className="px-2 py-3 text-right text-gray-700">
                          {formatYen(row.subtotal)}
                        </td>
                        {/* 消費税 */}
                        <td className="px-2 py-3 text-right text-gray-500">
                          {tax > 0 ? formatYen(tax) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        {/* 小計（税込） */}
                        <td className="px-2 py-3 text-right text-gray-700">
                          {formatYen(grossSubtotal)}
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
                        {/* 支払額（税抜） */}
                        <td className="px-2 py-3 text-right text-gray-700">
                          {formatYen(paymentExTax)}
                        </td>
                        {/* 支払額（税込） */}
                        <td className="px-2 py-3 text-right font-semibold text-gray-900">
                          {formatYen(paymentInTax)}
                        </td>
                        {/* 操作 */}
                        {!isAllPeriod && (
                          <td className="px-2 py-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              {canGenerate && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => onGenerate(row.userId)}
                                  loading={generatingRow === row.userId}
                                  title={
                                    row.notificationId ? "再生成" : "生成"
                                  }
                                >
                                  <RefreshCw className="mr-1 h-3.5 w-3.5" />
                                  {row.notificationId ? "再生成" : "生成"}
                                </Button>
                              )}
                              {row.notificationId && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() =>
                                    onDownload(row.notificationId!)
                                  }
                                  loading={
                                    downloading === row.notificationId
                                  }
                                >
                                  <Download className="mr-1 h-3.5 w-3.5" />
                                  PDF
                                </Button>
                              )}
                              {!canGenerate && !row.notificationId && (
                                <span className="text-xs text-gray-300">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
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
                      {formatYen(totals.grossSubtotal)}
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
                    <td className="px-2 py-3 text-right text-gray-700">
                      {formatYen(totals.paymentExTax)}
                    </td>
                    <td className="px-2 py-3 text-right text-gray-900">
                      {formatYen(totals.paymentInTax)}
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
