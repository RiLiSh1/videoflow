"use client";

import { useState, useEffect } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UserRow } from "./users-client";

type CompensationType = "PER_VIDEO" | "CUSTOM";

interface UserCompensationDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserRow;
}

export function UserCompensationDialog({
  open,
  onClose,
  onSuccess,
  user,
}: UserCompensationDialogProps) {
  const [type, setType] = useState<CompensationType>(
    user.compensation?.type || "PER_VIDEO"
  );
  const [perVideoRate, setPerVideoRate] = useState(
    user.compensation?.perVideoRate?.toString() || ""
  );
  const [customAmount, setCustomAmount] = useState(
    user.compensation?.customAmount?.toString() || ""
  );
  const [customNote, setCustomNote] = useState(
    user.compensation?.customNote || ""
  );
  const [isFixedMonthly, setIsFixedMonthly] = useState(
    user.compensation?.isFixedMonthly ?? false
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setType(user.compensation?.type || "PER_VIDEO");
    setPerVideoRate(user.compensation?.perVideoRate?.toString() || "");
    setCustomAmount(user.compensation?.customAmount?.toString() || "");
    setCustomNote(user.compensation?.customNote || "");
    setIsFixedMonthly(user.compensation?.isFixedMonthly ?? false);
    setError("");
  }, [user]);

  const handleSave = async () => {
    setError("");

    if (type === "PER_VIDEO" && !perVideoRate) {
      setError("動画単価を入力してください");
      return;
    }
    if (type === "CUSTOM" && !customAmount) {
      setError("金額を入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}/compensation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          perVideoRate: type === "PER_VIDEO" ? Number(perVideoRate) : null,
          customAmount: type === "CUSTOM" ? Number(customAmount) : null,
          customNote: type === "CUSTOM" ? customNote : null,
          isFixedMonthly: type === "CUSTOM" ? isFixedMonthly : false,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "保存に失敗しました");
        return;
      }
      onSuccess();
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={`報酬設計 — ${user.name}`}>
      <div className="space-y-5">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">
            報酬の計算月は、初回納品日（最初のバージョンがアップロードされた月）を基準とします。
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            報酬タイプ
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setType("PER_VIDEO")}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                type === "PER_VIDEO"
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">動画単価</p>
              <p className="mt-0.5 text-xs text-gray-500">
                1本あたりの金額を設定
              </p>
            </button>
            <button
              type="button"
              onClick={() => setType("CUSTOM")}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                type === "CUSTOM"
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <p className="text-sm font-semibold text-gray-900">自分設定</p>
              <p className="mt-0.5 text-xs text-gray-500">
                任意の金額・条件を設定
              </p>
            </button>
          </div>
        </div>

        {type === "PER_VIDEO" && (
          <div className="space-y-3">
            <Input
              id="perVideoRate"
              label="動画1本あたりの金額（円）"
              type="number"
              min={0}
              placeholder="例: 5000"
              value={perVideoRate}
              onChange={(e) => setPerVideoRate(e.target.value)}
            />
            {perVideoRate && (
              <p className="text-sm text-gray-500">
                → ¥{Number(perVideoRate).toLocaleString()}/本
              </p>
            )}
          </div>
        )}

        {type === "CUSTOM" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFixedMonthly}
                  onChange={(e) => setIsFixedMonthly(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">月額固定</span>
              </label>
            </div>

            <Input
              id="customAmount"
              label={isFixedMonthly ? "月額金額（円）" : "金額（円）"}
              type="number"
              min={0}
              placeholder="例: 50000"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
            />

            <Input
              id="customNote"
              label="備考"
              placeholder="例: 月10本まで固定、超過分は1本3000円"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
            />

            {customAmount && (
              <p className="text-sm text-gray-500">
                → ¥{Number(customAmount).toLocaleString()}
                {isFixedMonthly ? "/月（固定）" : ""}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave} loading={saving}>
            保存
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
