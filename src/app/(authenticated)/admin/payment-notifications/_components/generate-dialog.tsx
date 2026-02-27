"use client";

import { useState } from "react";
import type { EntityType } from "@prisma/client";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ENTITY_TYPE_LABELS } from "@/lib/constants/entity-type";

type UserOption = {
  id: string;
  name: string;
  role: "CREATOR" | "DIRECTOR";
  entityType: EntityType | null;
  hasCompensation: boolean;
};

interface GenerateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  users: UserOption[];
  defaultYear: string;
  defaultMonth: string;
}

const ROLE_LABELS: Record<string, string> = {
  CREATOR: "クリエイター",
  DIRECTOR: "ディレクター",
};

const currentYear = new Date().getFullYear();
const yearOptions = [
  { value: "", label: "選択してください" },
  ...Array.from({ length: 3 }, (_, i) => ({
    value: String(currentYear - i),
    label: `${currentYear - i}年`,
  })),
];

const monthOptions = [
  { value: "", label: "選択してください" },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: `${i + 1}月`,
  })),
];

export function GenerateDialog({
  open,
  onClose,
  onSuccess,
  users,
  defaultYear,
  defaultMonth,
}: GenerateDialogProps) {
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<
    { name: string; role: string; success: boolean; error?: string }[]
  >([]);

  const usersWithCompensation = users.filter((u) => u.hasCompensation);

  const userOptions = [
    { value: "", label: "選択してください" },
    ...usersWithCompensation.map((u) => ({
      value: u.id,
      label: `${u.name} (${ROLE_LABELS[u.role]})${u.entityType ? ` [${ENTITY_TYPE_LABELS[u.entityType]}]` : ""}`,
    })),
  ];

  const handleGenerate = async () => {
    if (!selectedUserId || !year || !month) {
      setError("ユーザー、年、月を選択してください");
      return;
    }

    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/payment-notifications/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          year: Number(year),
          month: Number(month),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "生成に失敗しました");
        return;
      }
      onSuccess();
    } catch {
      setError("生成に失敗しました");
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateAll = async () => {
    if (!year || !month) {
      setError("年と月を選択してください");
      return;
    }

    setError("");
    setResults([]);
    setGeneratingAll(true);

    const newResults: {
      name: string;
      role: string;
      success: boolean;
      error?: string;
    }[] = [];

    for (const user of usersWithCompensation) {
      try {
        const res = await fetch("/api/payment-notifications/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            year: Number(year),
            month: Number(month),
          }),
        });
        const json = await res.json();
        newResults.push({
          name: user.name,
          role: ROLE_LABELS[user.role],
          success: json.success,
          error: json.error,
        });
      } catch {
        newResults.push({
          name: user.name,
          role: ROLE_LABELS[user.role],
          success: false,
          error: "通信エラー",
        });
      }
    }

    setResults(newResults);
    setGeneratingAll(false);
  };

  const handleClose = () => {
    setError("");
    setResults([]);
    setSelectedUserId("");
    onClose();
  };

  const hasResults = results.length > 0;
  const successCount = results.filter((r) => r.success).length;

  return (
    <Dialog open={open} onClose={handleClose} title="支払通知書の生成">
      <div className="space-y-5">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            対象月のCOMPLETED動画を集計し、報酬設定に基づいて支払通知書を生成します。
            既に生成済みの場合は上書きされます。
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Select
            id="gen-year"
            label="年"
            options={yearOptions}
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
          <Select
            id="gen-month"
            label="月"
            options={monthOptions}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>

        <Select
          id="gen-user"
          label="対象ユーザー"
          options={userOptions}
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
        />

        {usersWithCompensation.length === 0 && (
          <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
            報酬設定がされているユーザーがいません。先にユーザー管理で報酬設定を行ってください。
          </div>
        )}

        {/* Batch results */}
        {hasResults && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              一括生成結果: {successCount}/{results.length} 件成功
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {results.map((r, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {r.name}{" "}
                    <span className="text-xs text-gray-400">({r.role})</span>
                  </span>
                  {r.success ? (
                    <Badge className="bg-green-100 text-green-800">成功</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">
                      {r.error || "失敗"}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button
            variant="secondary"
            onClick={handleGenerateAll}
            loading={generatingAll}
            disabled={
              generating ||
              !year ||
              !month ||
              usersWithCompensation.length === 0
            }
          >
            全員一括生成
          </Button>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={handleClose}>
              {hasResults ? "閉じる" : "キャンセル"}
            </Button>
            <Button
              onClick={handleGenerate}
              loading={generating}
              disabled={
                generatingAll ||
                !selectedUserId ||
                !year ||
                !month
              }
            >
              生成
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
