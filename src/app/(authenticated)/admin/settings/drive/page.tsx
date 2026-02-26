"use client";

import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils/format-date";
import { Plus, Pencil, Power } from "lucide-react";

const driveSettingSchema = z.object({
  name: z.string().min(1, "設定名を入力してください"),
  driveId: z.string().optional(),
  rootFolderId: z.string().optional(),
  serviceAccountKey: z.string().optional(),
});

type DriveSettingInput = z.infer<typeof driveSettingSchema>;

interface DriveSetting {
  id: string;
  name: string;
  driveId: string | null;
  rootFolderId: string | null;
  serviceAccountKey: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDriveSettingsPage() {
  const [settings, setSettings] = useState<DriveSetting[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editSetting, setEditSetting] = useState<DriveSetting | null>(null);
  const [error, setError] = useState("");

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/drive");
      const json = await res.json();
      if (json.success) {
        setSettings(json.data);
      }
    } catch {
      setError("設定の読み込みに失敗しました");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleToggleActive = async (setting: DriveSetting) => {
    try {
      const res = await fetch("/api/settings/drive", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: setting.id,
          name: setting.name,
          driveId: setting.driveId,
          rootFolderId: setting.rootFolderId,
          serviceAccountKey: setting.serviceAccountKey,
          isActive: !setting.isActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchSettings();
      }
    } catch {
      setError("設定の更新に失敗しました");
    }
  };

  return (
    <PageContainer title="Google Drive設定">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規設定
        </Button>
      </div>

      {loadingList ? (
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      ) : settings.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            Google Drive設定がありません。新規設定を追加してください。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {settings.map((setting) => (
            <Card key={setting.id}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {setting.name}
                      </h3>
                      {setting.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          有効
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          無効
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-1 text-sm text-gray-600 sm:grid-cols-2 sm:gap-x-8">
                      <div>
                        <span className="font-medium text-gray-700">
                          Drive ID:
                        </span>{" "}
                        {setting.driveId || "-"}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          ルートフォルダID:
                        </span>{" "}
                        {setting.rootFolderId || "-"}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          サービスアカウントキー:
                        </span>{" "}
                        {setting.serviceAccountKey ? "設定済み" : "未設定"}
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">
                          更新日時:
                        </span>{" "}
                        {formatDateTime(setting.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditSetting(setting)}
                      title="編集"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(setting)}
                      title={setting.isActive ? "無効にする" : "有効にする"}
                    >
                      <Power
                        className={`h-4 w-4 ${
                          setting.isActive
                            ? "text-green-600"
                            : "text-gray-400"
                        }`}
                      />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DriveSettingDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={fetchSettings}
        mode="create"
      />

      {editSetting && (
        <DriveSettingDialog
          open={!!editSetting}
          onClose={() => setEditSetting(null)}
          onSuccess={fetchSettings}
          mode="edit"
          setting={editSetting}
        />
      )}
    </PageContainer>
  );
}

interface DriveSettingDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: "create" | "edit";
  setting?: DriveSetting;
}

function DriveSettingDialog({
  open,
  onClose,
  onSuccess,
  mode,
  setting,
}: DriveSettingDialogProps) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DriveSettingInput>({
    resolver: zodResolver(driveSettingSchema),
    defaultValues: {
      name: setting?.name || "",
      driveId: setting?.driveId || "",
      rootFolderId: setting?.rootFolderId || "",
      serviceAccountKey: setting?.serviceAccountKey || "",
    },
  });

  const onSubmit = async (data: DriveSettingInput) => {
    setError("");
    try {
      const payload: Record<string, unknown> = {
        name: data.name,
        driveId: data.driveId,
        rootFolderId: data.rootFolderId,
        serviceAccountKey: data.serviceAccountKey,
      };

      let res: Response;
      if (mode === "edit" && setting) {
        payload.id = setting.id;
        payload.isActive = setting.isActive;
        res = await fetch("/api/settings/drive", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/settings/drive", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!json.success) {
        setError(json.error || "保存に失敗しました");
        return;
      }
      reset();
      onClose();
      onSuccess();
    } catch {
      setError("保存に失敗しました");
    }
  };

  const handleClose = () => {
    reset();
    setError("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title={mode === "create" ? "新規Google Drive設定" : "Google Drive設定の編集"}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          id="drive-name"
          label="設定名"
          placeholder="例: メインドライブ"
          error={errors.name?.message}
          {...register("name")}
        />

        <Input
          id="drive-driveId"
          label="Drive ID"
          placeholder="任意"
          error={errors.driveId?.message}
          {...register("driveId")}
        />

        <Input
          id="drive-rootFolderId"
          label="ルートフォルダID"
          placeholder="任意"
          error={errors.rootFolderId?.message}
          {...register("rootFolderId")}
        />

        <div className="space-y-1">
          <label
            htmlFor="drive-serviceAccountKey"
            className="block text-sm font-medium text-gray-700"
          >
            サービスアカウントキー（JSON）
          </label>
          <textarea
            id="drive-serviceAccountKey"
            rows={4}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder='{"type": "service_account", ...}'
            {...register("serviceAccountKey")}
          />
          {errors.serviceAccountKey?.message && (
            <p className="text-sm text-red-600">
              {errors.serviceAccountKey.message}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === "create" ? "作成" : "更新"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
