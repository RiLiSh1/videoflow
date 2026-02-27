"use client";

import { useState, useEffect, useCallback } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CompanyData {
  companyName: string;
  postalCode: string;
  address: string;
  tel: string;
  email: string;
  invoiceNumber: string;
}

const defaultData: CompanyData = {
  companyName: "",
  postalCode: "",
  address: "",
  tel: "",
  email: "",
  invoiceNumber: "",
};

export default function AdminCompanySettingsPage() {
  const [form, setForm] = useState<CompanyData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/company");
      const json = await res.json();
      if (json.success && json.data) {
        setForm({
          companyName: json.data.companyName || "",
          postalCode: json.data.postalCode || "",
          address: json.data.address || "",
          tel: json.data.tel || "",
          email: json.data.email || "",
          invoiceNumber: json.data.invoiceNumber || "",
        });
      }
    } catch {
      setError("設定の読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateField = <K extends keyof CompanyData>(
    key: K,
    value: CompanyData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!form.companyName.trim()) {
      setError("会社名を入力してください");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/settings/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "保存に失敗しました");
        return;
      }
      setSuccess("保存しました");
      setTimeout(() => setSuccess(""), 3000);
    } catch {
      setError("保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer title="会社設定">
      {loading ? (
        <div className="py-8 text-center text-gray-500">読み込み中...</div>
      ) : (
        <Card>
          <CardContent>
            <div className="space-y-5">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                  {success}
                </div>
              )}

              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500">
                  支払通知書の「支払元」に表示される情報です。
                </p>
              </div>

              <Input
                id="companyName"
                label="会社名"
                placeholder="例: 株式会社LM"
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="postalCode"
                  label="郵便番号"
                  placeholder="例: 123-4567"
                  value={form.postalCode}
                  onChange={(e) => updateField("postalCode", e.target.value)}
                />
                <Input
                  id="tel"
                  label="電話番号"
                  placeholder="例: 03-1234-5678"
                  value={form.tel}
                  onChange={(e) => updateField("tel", e.target.value)}
                />
              </div>

              <Input
                id="address"
                label="住所"
                placeholder="例: 東京都○○区○○ 1-2-3"
                value={form.address}
                onChange={(e) => updateField("address", e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  id="email"
                  label="メールアドレス"
                  placeholder="例: info@example.com"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                />
                <Input
                  id="invoiceNumber"
                  label="インボイス番号"
                  placeholder="例: T1234567890123"
                  value={form.invoiceNumber}
                  onChange={(e) => updateField("invoiceNumber", e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button onClick={handleSave} loading={saving}>
                  保存
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
