"use client";

import { useState } from "react";
import type { EntityType } from "@prisma/client";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ENTITY_TYPE_LABELS } from "@/lib/constants/entity-type";

type CreatorOption = {
  id: string;
  name: string;
  entityType: EntityType | null;
  hasCompensation: boolean;
};

interface GenerateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  creators: CreatorOption[];
  defaultYear: string;
  defaultMonth: string;
}

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
  creators,
  defaultYear,
  defaultMonth,
}: GenerateDialogProps) {
  const [year, setYear] = useState(defaultYear);
  const [month, setMonth] = useState(defaultMonth);
  const [selectedCreatorId, setSelectedCreatorId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatingAll, setGeneratingAll] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<
    { name: string; success: boolean; error?: string }[]
  >([]);

  const creatorsWithCompensation = creators.filter((c) => c.hasCompensation);

  const creatorOptions = [
    { value: "", label: "選択してください" },
    ...creatorsWithCompensation.map((c) => ({
      value: c.id,
      label: `${c.name}${c.entityType ? ` (${ENTITY_TYPE_LABELS[c.entityType]})` : ""}`,
    })),
  ];

  const handleGenerate = async () => {
    if (!selectedCreatorId || !year || !month) {
      setError("クリエイター、年、月を選択してください");
      return;
    }

    setError("");
    setGenerating(true);
    try {
      const res = await fetch("/api/payment-notifications/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorId: selectedCreatorId,
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

    const newResults: { name: string; success: boolean; error?: string }[] = [];

    for (const creator of creatorsWithCompensation) {
      try {
        const res = await fetch("/api/payment-notifications/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorId: creator.id,
            year: Number(year),
            month: Number(month),
          }),
        });
        const json = await res.json();
        newResults.push({
          name: creator.name,
          success: json.success,
          error: json.error,
        });
      } catch {
        newResults.push({
          name: creator.name,
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
    setSelectedCreatorId("");
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
          id="gen-creator"
          label="クリエイター"
          options={creatorOptions}
          value={selectedCreatorId}
          onChange={(e) => setSelectedCreatorId(e.target.value)}
        />

        {creatorsWithCompensation.length === 0 && (
          <div className="rounded-md bg-yellow-50 p-3 text-sm text-yellow-700">
            報酬設定がされているクリエイターがいません。先にクリエイター管理で報酬設定を行ってください。
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
                  <span className="text-gray-700">{r.name}</span>
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
              creatorsWithCompensation.length === 0
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
                !selectedCreatorId ||
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
