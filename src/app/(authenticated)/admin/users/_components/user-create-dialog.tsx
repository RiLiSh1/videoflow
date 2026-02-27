"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createUserSchema, type CreateUserInput } from "@/lib/validations/user";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface UserCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const roleOptions = [
  { value: "CREATOR", label: "クリエイター" },
  { value: "DIRECTOR", label: "ディレクター" },
  { value: "ADMIN", label: "管理者" },
];

export function UserCreateDialog({
  open,
  onClose,
  onSuccess,
}: UserCreateDialogProps) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      loginId: "",
      password: "",
      name: "",
      email: "",
      role: "CREATOR",
      chatworkId: "",
      chatworkRoomId: "",
    },
  });

  const onSubmit = async (data: CreateUserInput) => {
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "ユーザーの作成に失敗しました");
        return;
      }
      reset();
      onClose();
      onSuccess();
    } catch {
      setError("ユーザーの作成に失敗しました");
    }
  };

  const handleClose = () => {
    reset();
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="新規ユーザー作成">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          id="loginId"
          label="ログインID"
          placeholder="例: yamada_taro"
          error={errors.loginId?.message}
          {...register("loginId")}
        />

        <Input
          id="password"
          label="パスワード"
          type="password"
          placeholder="6文字以上"
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          id="name"
          label="名前"
          placeholder="例: 山田太郎"
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          id="email"
          label="メールアドレス"
          type="email"
          placeholder="例: yamada@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <Select
          id="role"
          label="ロール"
          options={roleOptions}
          error={errors.role?.message}
          {...register("role")}
        />

        <Input
          id="chatworkId"
          label="Chatwork ID"
          placeholder="任意"
          error={errors.chatworkId?.message}
          {...register("chatworkId")}
        />

        <Input
          id="chatworkRoomId"
          label="Chatwork ルームID"
          placeholder="任意"
          error={errors.chatworkRoomId?.message}
          {...register("chatworkRoomId")}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
          <Button type="submit" loading={isSubmitting}>
            作成
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
