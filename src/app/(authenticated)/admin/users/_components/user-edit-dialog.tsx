"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { UserRow } from "./users-client";

const updateUserSchema = z.object({
  name: z
    .string()
    .min(1, "名前を入力してください")
    .max(100, "名前は100文字以内で入力してください"),
  email: z
    .string()
    .email("正しいメールアドレスを入力してください")
    .optional()
    .or(z.literal("")),
  role: z.enum(["CREATOR", "DIRECTOR", "ADMIN"]),
  chatworkId: z.string().optional(),
  chatworkRoomId: z.string().optional(),
  password: z
    .string()
    .min(6, "パスワードは6文字以上で入力してください")
    .optional()
    .or(z.literal("")),
});

type UpdateUserInput = z.infer<typeof updateUserSchema>;

interface UserEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserRow;
}

const roleOptions = [
  { value: "CREATOR", label: "クリエイター" },
  { value: "DIRECTOR", label: "ディレクター" },
  { value: "ADMIN", label: "管理者" },
];

export function UserEditDialog({
  open,
  onClose,
  onSuccess,
  user,
}: UserEditDialogProps) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name,
      email: user.email || "",
      role: user.role,
      chatworkId: user.chatworkId || "",
      password: "",
    },
  });

  const onSubmit = async (data: UpdateUserInput) => {
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        email: data.email,
        role: data.role,
        chatworkId: data.chatworkId,
      };
      if (data.password) {
        payload.password = data.password;
      }

      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "ユーザーの更新に失敗しました");
        return;
      }
      reset();
      onClose();
      onSuccess();
    } catch {
      setError("ユーザーの更新に失敗しました");
    }
  };

  const handleClose = () => {
    reset();
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="ユーザー編集">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            ログインID
          </label>
          <p className="text-sm text-gray-500">{user.loginId}</p>
        </div>

        <Input
          id="edit-name"
          label="名前"
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          id="edit-email"
          label="メールアドレス"
          type="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <Select
          id="edit-role"
          label="ロール"
          options={roleOptions}
          error={errors.role?.message}
          {...register("role")}
        />

        <Input
          id="edit-chatworkId"
          label="Chatwork ID"
          error={errors.chatworkId?.message}
          {...register("chatworkId")}
        />

        <Input
          id="edit-password"
          label="新しいパスワード（変更する場合のみ）"
          type="password"
          placeholder="空欄の場合は変更しません"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
          <Button type="submit" loading={isSubmitting}>
            更新
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
