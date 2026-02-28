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
import { Pencil, Power, Info } from "lucide-react";

const TYPE_LABELS: Record<string, string> = {
  VIDEO_SUBMITTED: "動画提出",
  VIDEO_REVISED: "修正再提出",
  VIDEO_REVISION_REQUESTED: "修正依頼",
  VIDEO_FINAL_REVIEW: "最終確認依頼",
  VIDEO_COMPLETED: "最終承認完了",
  NEW_FEEDBACK: "新しいフィードバック",
};

const templateSchema = z.object({
  title: z.string().min(1, "タイトルを入力してください"),
  messageTemplate: z.string().min(1, "メッセージテンプレートを入力してください"),
});

type TemplateInput = z.infer<typeof templateSchema>;

interface NotificationTemplate {
  id: string;
  type: string;
  title: string;
  messageTemplate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function AdminNotificationSettingsPage() {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTemplate, setEditTemplate] = useState<NotificationTemplate | null>(null);
  const [error, setError] = useState("");

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/notifications");
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
      }
    } catch {
      setError("テンプレートの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleToggleActive = async (template: NotificationTemplate) => {
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          isActive: !template.isActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTemplates();
      }
    } catch {
      setError("テンプレートの更新に失敗しました");
    }
  };

  return (
    <PageContainer title="通知設定">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-md bg-blue-50 border border-blue-200 p-4">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">テンプレート変数</p>
            <ul className="space-y-0.5">
              <li><code className="bg-blue-100 px-1 rounded">{"{videoTitle}"}</code> — 動画タイトル</li>
              <li><code className="bg-blue-100 px-1 rounded">{"{triggeredByName}"}</code> — 操作ユーザー名</li>
            </ul>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-500">
            通知テンプレートがありません。シードデータを実行してください。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {TYPE_LABELS[template.type] || template.type}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {template.title}
                      </h3>
                      {template.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          有効
                        </Badge>
                      ) : (
                        <Badge className="bg-gray-100 text-gray-800">
                          無効
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-gray-700">メッセージ:</span>{" "}
                      {template.messageTemplate}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditTemplate(template)}
                      title="編集"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleActive(template)}
                      title={template.isActive ? "無効にする" : "有効にする"}
                    >
                      <Power
                        className={`h-4 w-4 ${
                          template.isActive
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

      {editTemplate && (
        <TemplateEditDialog
          open={!!editTemplate}
          onClose={() => setEditTemplate(null)}
          onSuccess={fetchTemplates}
          template={editTemplate}
        />
      )}
    </PageContainer>
  );
}

interface TemplateEditDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  template: NotificationTemplate;
}

function TemplateEditDialog({
  open,
  onClose,
  onSuccess,
  template,
}: TemplateEditDialogProps) {
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: template.title,
      messageTemplate: template.messageTemplate,
    },
  });

  const onSubmit = async (data: TemplateInput) => {
    setError("");
    try {
      const res = await fetch("/api/settings/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: template.id,
          title: data.title,
          messageTemplate: data.messageTemplate,
        }),
      });

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
      title={`通知テンプレートの編集 — ${TYPE_LABELS[template.type] || template.type}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          id="template-title"
          label="タイトル"
          placeholder="通知タイトル"
          error={errors.title?.message}
          {...register("title")}
        />

        <div className="space-y-1">
          <label
            htmlFor="template-message"
            className="block text-sm font-medium text-gray-700"
          >
            メッセージテンプレート
          </label>
          <textarea
            id="template-message"
            rows={3}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="「{videoTitle}」が提出されました"
            {...register("messageTemplate")}
          />
          {errors.messageTemplate?.message && (
            <p className="text-sm text-red-600">
              {errors.messageTemplate.message}
            </p>
          )}
        </div>

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
