"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

type ProfileFormData = {
  entityType: "INDIVIDUAL" | "CORPORATION";
  businessName: string;
  postalCode: string;
  address: string;
  invoiceNumber: string;
};

interface Props {
  profile: ProfileFormData | null;
}

const entityTypeOptions = [
  { value: "INDIVIDUAL", label: "個人" },
  { value: "CORPORATION", label: "法人" },
];

export function ProfileClient({ profile }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { register, handleSubmit, watch } = useForm<ProfileFormData>({
    defaultValues: profile || {
      entityType: "INDIVIDUAL",
      businessName: "",
      postalCode: "",
      address: "",
      invoiceNumber: "",
    },
  });

  const entityType = watch("entityType");

  const onSubmit = async (data: ProfileFormData) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/creator/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({ type: "error", text: json.error || "保存に失敗しました" });
        return;
      }
      setMessage({ type: "success", text: "保存しました" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "保存に失敗しました。ネットワークを確認してください。" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <p className="text-sm text-gray-500">
        請求書の「請求元」欄に表示される情報です。
      </p>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-md p-3 text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">事業者情報</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Select
              id="entityType"
              label="事業区分"
              options={entityTypeOptions}
              {...register("entityType")}
            />
            <Input
              id="businessName"
              label={entityType === "CORPORATION" ? "法人名" : "屋号（任意）"}
              placeholder={entityType === "CORPORATION" ? "株式会社〇〇" : "〇〇映像制作"}
              {...register("businessName")}
            />
            <Input
              id="postalCode"
              label="郵便番号"
              placeholder="100-0001"
              {...register("postalCode")}
            />
            <Input
              id="address"
              label="住所"
              placeholder="東京都千代田区..."
              {...register("address")}
            />
            <Input
              id="invoiceNumber"
              label="インボイス登録番号（任意）"
              placeholder="T1234567890123"
              {...register("invoiceNumber")}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="submit" loading={saving}>
          保存
        </Button>
      </div>
    </form>
  );
}
