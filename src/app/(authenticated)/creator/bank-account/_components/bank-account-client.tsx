"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle } from "lucide-react";

type BankAccountFormData = {
  bankName: string;
  bankBranch: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
};

interface Props {
  bankAccount: BankAccountFormData | null;
}

const accountTypeOptions = [
  { value: "", label: "選択してください" },
  { value: "普通", label: "普通" },
  { value: "当座", label: "当座" },
];

export function BankAccountClient({ bankAccount }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { register, handleSubmit } = useForm<BankAccountFormData>({
    defaultValues: bankAccount || {
      bankName: "",
      bankBranch: "",
      bankAccountType: "",
      bankAccountNumber: "",
      bankAccountHolder: "",
    },
  });

  const onSubmit = async (data: BankAccountFormData) => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/creator/bank-account", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        setMessage({
          type: "error",
          text: json.error || "保存に失敗しました",
        });
        return;
      }
      setMessage({ type: "success", text: "銀行口座情報を保存しました" });
      router.refresh();
    } catch {
      setMessage({
        type: "error",
        text: "保存に失敗しました。ネットワークを確認してください。",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
      <p className="text-sm text-gray-500">
        報酬の振込先口座です。請求書の「お振込先」欄に表示されます。
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
          <h2 className="text-base font-semibold text-gray-900">
            振込先口座
          </h2>
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
