"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Video } from "lucide-react";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ROLE_DEFAULT_PATHS: Record<string, string> = {
  ADMIN: "/admin/dashboard",
  DIRECTOR: "/director/reviews",
  CREATOR: "/creator/videos",
};

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || "ログインに失敗しました");
        return;
      }

      const defaultPath = ROLE_DEFAULT_PATHS[result.data.role] || "/";
      router.push(defaultPath);
      router.refresh();
    } catch {
      setError("ネットワークエラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
            <Video className="h-7 w-7 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">LM-動画システム</h1>
          <p className="mt-1 text-sm text-gray-500">動画納品管理システム</p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <Input
              id="loginId"
              label="ログインID"
              placeholder="admin"
              error={errors.loginId?.message}
              {...register("loginId")}
            />

            <Input
              id="password"
              type="password"
              label="パスワード"
              placeholder="パスワードを入力"
              error={errors.password?.message}
              {...register("password")}
            />

            <Button type="submit" className="w-full" loading={loading}>
              ログイン
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
