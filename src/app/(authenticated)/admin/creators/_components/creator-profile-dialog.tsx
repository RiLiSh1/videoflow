"use client";

import { useState, useEffect, useCallback } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { CreatorRow } from "./creators-client";

type EntityType = "INDIVIDUAL" | "CORPORATION";

interface ProfileData {
  entityType: EntityType;
  businessName: string;
  postalCode: string;
  address: string;
  invoiceNumber: string;
  bankName: string;
  bankBranch: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
}

const defaultProfile: ProfileData = {
  entityType: "INDIVIDUAL",
  businessName: "",
  postalCode: "",
  address: "",
  invoiceNumber: "",
  bankName: "",
  bankBranch: "",
  bankAccountType: "普通",
  bankAccountNumber: "",
  bankAccountHolder: "",
};

interface CreatorProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  creator: CreatorRow;
}

export function CreatorProfileDialog({
  open,
  onClose,
  onSuccess,
  creator,
}: CreatorProfileDialogProps) {
  const [form, setForm] = useState<ProfileData>(defaultProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/creators/${creator.id}/profile`);
      const json = await res.json();
      if (json.success && json.data) {
        setForm({
          entityType: json.data.entityType || "INDIVIDUAL",
          businessName: json.data.businessName || "",
          postalCode: json.data.postalCode || "",
          address: json.data.address || "",
          invoiceNumber: json.data.invoiceNumber || "",
          bankName: json.data.bankName || "",
          bankBranch: json.data.bankBranch || "",
          bankAccountType: json.data.bankAccountType || "普通",
          bankAccountNumber: json.data.bankAccountNumber || "",
          bankAccountHolder: json.data.bankAccountHolder || "",
        });
      } else {
        setForm(defaultProfile);
      }
    } catch {
      setError("プロフィールの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, [creator.id]);

  useEffect(() => {
    if (open) {
      fetchProfile();
      setError("");
    }
  }, [open, fetchProfile]);

  const updateField = <K extends keyof ProfileData>(
    key: K,
    value: ProfileData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/creators/${creator.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
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
    <Dialog
      open={open}
      onClose={onClose}
      title={`事業者情報 — ${creator.name}`}
      className="max-w-2xl"
    >
      {loading ? (
        <div className="py-8 text-center text-gray-500">読み込み中...</div>
      ) : (
        <div className="space-y-5">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* 区分選択 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              事業者区分
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => updateField("entityType", "INDIVIDUAL")}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  form.entityType === "INDIVIDUAL"
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">個人</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  個人事業主（源泉徴収あり）
                </p>
              </button>
              <button
                type="button"
                onClick={() => updateField("entityType", "CORPORATION")}
                className={`rounded-lg border-2 p-3 text-left transition-all ${
                  form.entityType === "CORPORATION"
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <p className="text-sm font-semibold text-gray-900">法人</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  法人（源泉徴収なし）
                </p>
              </button>
            </div>
          </div>

          {/* 事業者情報 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">
              基本情報
            </h3>
            <Input
              id="businessName"
              label="屋号・法人名"
              placeholder="例: ○○クリエイティブ"
              value={form.businessName}
              onChange={(e) => updateField("businessName", e.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="postalCode"
                label="郵便番号"
                placeholder="例: 123-4567"
                value={form.postalCode}
                onChange={(e) => updateField("postalCode", e.target.value)}
              />
              <Input
                id="invoiceNumber"
                label="インボイス番号"
                placeholder="例: T1234567890123"
                value={form.invoiceNumber}
                onChange={(e) => updateField("invoiceNumber", e.target.value)}
              />
            </div>
            <Input
              id="address"
              label="住所"
              placeholder="例: 東京都○○区○○ 1-2-3"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
          </div>

          {/* 銀行情報 */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">
              振込先情報
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="bankName"
                label="銀行名"
                placeholder="例: ○○銀行"
                value={form.bankName}
                onChange={(e) => updateField("bankName", e.target.value)}
              />
              <Input
                id="bankBranch"
                label="支店名"
                placeholder="例: ○○支店"
                value={form.bankBranch}
                onChange={(e) => updateField("bankBranch", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Select
                id="bankAccountType"
                label="口座種別"
                options={[
                  { value: "普通", label: "普通" },
                  { value: "当座", label: "当座" },
                ]}
                value={form.bankAccountType}
                onChange={(e) => updateField("bankAccountType", e.target.value)}
              />
              <Input
                id="bankAccountNumber"
                label="口座番号"
                placeholder="例: 1234567"
                value={form.bankAccountNumber}
                onChange={(e) =>
                  updateField("bankAccountNumber", e.target.value)
                }
              />
              <Input
                id="bankAccountHolder"
                label="口座名義"
                placeholder="例: ヤマダ タロウ"
                value={form.bankAccountHolder}
                onChange={(e) =>
                  updateField("bankAccountHolder", e.target.value)
                }
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={onClose}>
              キャンセル
            </Button>
            <Button onClick={handleSave} loading={saving}>
              保存
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
