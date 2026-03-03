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
import {
  Pencil,
  Power,
  Info,
  Send,
  RefreshCw,
  AlertCircle,
  Shield,
  CheckCircle2,
  MessageCircle,
  Bell,
  Banknote,
} from "lucide-react";

const TYPE_META: Record<
  string,
  { label: string; description: string; icon: React.ReactNode; color: string }
> = {
  VIDEO_SUBMITTED: {
    label: "動画提出",
    description: "クリエイターが動画を提出した時にディレクターへ通知",
    icon: <Send className="h-5 w-5" />,
    color: "text-blue-600 bg-blue-50",
  },
  VIDEO_REVISED: {
    label: "修正再提出",
    description: "クリエイターが修正版を再提出した時にディレクターへ通知",
    icon: <RefreshCw className="h-5 w-5" />,
    color: "text-purple-600 bg-purple-50",
  },
  VIDEO_REVISION_REQUESTED: {
    label: "修正依頼",
    description: "ディレクター/管理者が修正を依頼した時にクリエイターへ通知",
    icon: <AlertCircle className="h-5 w-5" />,
    color: "text-orange-600 bg-orange-50",
  },
  VIDEO_FINAL_REVIEW: {
    label: "最終確認依頼",
    description: "ディレクター承認後、管理者に最終確認を依頼",
    icon: <Shield className="h-5 w-5" />,
    color: "text-indigo-600 bg-indigo-50",
  },
  VIDEO_COMPLETED: {
    label: "最終承認完了",
    description: "管理者が最終承認した時にディレクター・クリエイターへ通知",
    icon: <CheckCircle2 className="h-5 w-5" />,
    color: "text-green-600 bg-green-50",
  },
  NEW_FEEDBACK: {
    label: "新しいフィードバック",
    description: "動画にフィードバックが追加された時に関係者へ通知",
    icon: <MessageCircle className="h-5 w-5" />,
    color: "text-teal-600 bg-teal-50",
  },
  PAYMENT_APPROVED: {
    label: "支払通知書発行",
    description: "支払通知書を承認した時にクリエイター/ディレクターへ通知",
    icon: <Banknote className="h-5 w-5" />,
    color: "text-emerald-600 bg-emerald-50",
  },
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
  const [editTemplate, setEditTemplate] = useState<NotificationTemplate | null>(
    null
  );
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/settings/notifications");
      const json = await res.json();
      if (json.success) {
        setTemplates(json.data);
        setError("");
      } else {
        setError(json.error || "テンプレートの読み込みに失敗しました");
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

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleToggleActive = async (template: NotificationTemplate) => {
    setTogglingId(template.id);
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
        setSuccess(
          `「${template.title}」を${template.isActive ? "無効" : "有効"}にしました`
        );
        fetchTemplates();
      }
    } catch {
      setError("テンプレートの更新に失敗しました");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <PageContainer title="通知設定">
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <div className="mb-6 rounded-lg bg-slate-50 border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-blue-100 p-2">
            <Bell className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800 mb-2">
              Chatwork通知テンプレートの管理
            </p>
            <p className="text-xs text-slate-500 mb-3">
              各通知のメッセージ内容を編集したり、通知の有効/無効を切り替えられます。無効にした通知はChatworkに送信されません。
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">利用可能な変数:</span>
              </div>
              <code className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                {"{videoTitle}"}
              </code>
              <span className="text-xs text-slate-400">動画タイトル</span>
              <code className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                {"{triggeredByName}"}
              </code>
              <span className="text-xs text-slate-400">操作ユーザー名</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              <div className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-slate-400" />
                <span className="text-xs text-slate-500">支払通知書用:</span>
              </div>
              <code className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                {"{year}"}
              </code>
              <span className="text-xs text-slate-400">年</span>
              <code className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                {"{month}"}
              </code>
              <span className="text-xs text-slate-400">月</span>
              <code className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                {"{subtotal}"}
              </code>
              <span className="text-xs text-slate-400">報酬(税抜)</span>
              <code className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                {"{netAmount}"}
              </code>
              <span className="text-xs text-slate-400">振込額</span>
              <code className="text-xs bg-white border border-slate-200 px-2 py-0.5 rounded font-mono text-slate-700">
                {"{videoDetails}"}
              </code>
              <span className="text-xs text-slate-400">対象動画一覧</span>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-lg border border-gray-200 bg-white animate-pulse"
            />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <Bell className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-1">通知テンプレートがありません</p>
          <p className="text-sm text-gray-400">
            ページを再読み込みすると自動的にテンプレートが作成されます
          </p>
          <Button
            variant="secondary"
            className="mt-4"
            onClick={() => {
              setLoading(true);
              fetchTemplates();
            }}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            再読み込み
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const meta = TYPE_META[template.type] || {
              label: template.type,
              description: "",
              icon: <Bell className="h-5 w-5" />,
              color: "text-gray-600 bg-gray-50",
            };
            const isToggling = togglingId === template.id;

            return (
              <Card
                key={template.id}
                className={!template.isActive ? "opacity-60" : ""}
              >
                <CardContent>
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-lg p-2.5 flex-shrink-0 ${meta.color}`}
                    >
                      {meta.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">
                          {template.title}
                        </h3>
                        <Badge
                          className={
                            template.isActive
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-100 text-gray-500"
                          }
                        >
                          {template.isActive ? "有効" : "無効"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-400 mb-2">
                        {meta.description}
                      </p>
                      <div className="bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-700 font-mono">
                        {template.messageTemplate}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTemplate(template)}
                        title="編集"
                      >
                        <Pencil className="h-4 w-4 text-gray-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActive(template)}
                        disabled={isToggling}
                        title={template.isActive ? "無効にする" : "有効にする"}
                      >
                        <Power
                          className={`h-4 w-4 ${
                            isToggling
                              ? "text-gray-300 animate-pulse"
                              : template.isActive
                                ? "text-green-600"
                                : "text-gray-400"
                          }`}
                        />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {editTemplate && (
        <TemplateEditDialog
          key={editTemplate.id}
          open={!!editTemplate}
          onClose={() => setEditTemplate(null)}
          onSuccess={() => {
            setSuccess("テンプレートを更新しました");
            fetchTemplates();
          }}
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
  const meta = TYPE_META[template.type];
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TemplateInput>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      title: template.title,
      messageTemplate: template.messageTemplate,
    },
  });

  const watchMessage = watch("messageTemplate");
  const preview = watchMessage
    ?.replace("{videoTitle}", "春キャンペーン動画")
    ?.replace("{triggeredByName}", "田中太郎")
    ?.replace("{year}", "2026")
    ?.replace("{month}", "2")
    ?.replace("{subtotal}", "¥3,000")
    ?.replace("{netAmount}", "¥2,994")
    ?.replace("{videoDetails}", "・案件A / 動画タイトル1");

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
      title={`通知テンプレートの編集 — ${meta?.label || template.type}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          id="template-title"
          label="Chatwork通知タイトル"
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
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="「{videoTitle}」が提出されました"
            {...register("messageTemplate")}
          />
          {errors.messageTemplate?.message && (
            <p className="text-sm text-red-600">
              {errors.messageTemplate.message}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">
            <code className="bg-gray-100 px-1 rounded">{"{videoTitle}"}</code>{" "}
            と{" "}
            <code className="bg-gray-100 px-1 rounded">
              {"{triggeredByName}"}
            </code>{" "}
            が利用できます
          </p>
        </div>

        {preview && (
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-500">
              プレビュー
            </label>
            <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-700">
              {preview}
            </div>
          </div>
        )}

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
