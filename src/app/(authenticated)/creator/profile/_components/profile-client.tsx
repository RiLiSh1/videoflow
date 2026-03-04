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
  bankName: string;
  bankBranch: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
};

interface Props {
  profile: ProfileFormData | null;
}

const entityTypeOptions = [
  { value: "INDIVIDUAL", label: "個人" },
  { value: "CORPORATION", label: "法人" },
];

const accountTypeOptions = [
  { value: "", label: "選択してください" },
  { value: "普通", label: "普通" },
  { value: "当座", label: "当座" },
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
      bankName: "",
      bankBranch: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankAccountHolder: "",
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
      setMessage({ type: "success", text: "プロフィールを保存しました" });
      router.refresh();
    } catch {
      setMessage({ type: "error", text: "保存に失敗しました。ネットワークを確認してください。" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
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

      {/* Business Info */}
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

      {/* Bank Info */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">振込先口座</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input
              id="bankName"
              label="銀行名"
              placeholder="三菱UFJ銀行"
              {...register("bankName")}
            />
            <Input
              id="bankBranch"
              label="支店名"
              placeholder="渋谷支店"
              {...register("bankBranch")}
            />
            <Select
              id="bankAccountType"
              label="口座種別"
              options={accountTypeOptions}
              {...register("bankAccountType")}
            />
            <Input
              id="bankAccountNumber"
              label="口座番号"
              placeholder="1234567"
              {...register("bankAccountNumber")}
            />
            <Input
              id="bankAccountHolder"
              label="口座名義（カナ）"
              placeholder="タナカ タロウ"
              {...register("bankAccountHolder")}
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
