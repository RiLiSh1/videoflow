"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { UserRow } from "./users-client";

interface UserDeactivateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: UserRow;
}

export function UserDeactivateDialog({
  open,
  onClose,
  onSuccess,
  user,
}: UserDeactivateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDeactivate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "ユーザーの無効化に失敗しました");
        setLoading(false);
        return;
      }
      onClose();
      onSuccess();
    } catch {
      setError("ユーザーの無効化に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="ユーザーの無効化">
      <div className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <p className="text-sm text-gray-700">
          <span className="font-semibold">{user.name}</span>（{user.loginId}
          ）を無効化しますか？
        </p>
        <p className="text-sm text-gray-500">
          無効化されたユーザーはログインできなくなります。
        </p>
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={loading}
            onClick={handleDeactivate}
          >
            無効化する
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
