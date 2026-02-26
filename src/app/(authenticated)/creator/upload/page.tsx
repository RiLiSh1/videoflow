"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

const uploadSchema = z.object({
  projectId: z.string().min(1, "案件を選択してください"),
  title: z
    .string()
    .min(1, "タイトルを入力してください")
    .max(200, "タイトルは200文字以内で入力してください"),
  directorId: z.string().optional(),
  deadline: z.string().optional(),
  referenceUrls: z
    .array(
      z.object({
        url: z.string().url("正しいURLを入力してください"),
        platform: z.string().optional(),
      })
    )
    .optional(),
});

type UploadFormData = z.infer<typeof uploadSchema>;

type ProjectOption = {
  id: string;
  projectCode: string;
  name: string;
  directors: {
    user: { id: string; name: string };
  }[];
};

export default function CreatorUploadPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [submitError, setSubmitError] = useState("");

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      projectId: "",
      title: "",
      directorId: "",
      deadline: "",
      referenceUrls: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "referenceUrls",
  });

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects?status=ACTIVE");
      const data = await res.json();
      if (data.success) {
        setProjects(data.data);
      }
    } catch {
      // Silently fail - projects will be empty
    } finally {
      setIsLoadingProjects(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const selectedProjectId = watch("projectId");
  const selectedProject = projects.find((p) => p.id === selectedProjectId);

  const directorOptions = selectedProject
    ? [
        { value: "", label: "選択なし" },
        ...selectedProject.directors.map((d) => ({
          value: d.user.id,
          label: d.user.name,
        })),
      ]
    : [{ value: "", label: "案件を先に選択してください" }];

  const projectOptions = [
    { value: "", label: isLoadingProjects ? "読み込み中..." : "案件を選択" },
    ...projects.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.projectCode})`,
    })),
  ];

  const onSubmit = async (data: UploadFormData) => {
    setSubmitError("");

    try {
      const body: Record<string, unknown> = {
        projectId: data.projectId,
        title: data.title,
      };

      if (data.directorId) {
        body.directorId = data.directorId;
      }

      if (data.deadline) {
        body.deadline = data.deadline;
      }

      if (data.referenceUrls && data.referenceUrls.length > 0) {
        body.referenceUrls = data.referenceUrls.map((ref) => ({
          url: ref.url,
          platform: ref.platform || undefined,
        }));
      }

      const res = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!result.success) {
        setSubmitError(result.error || "動画の作成に失敗しました");
        return;
      }

      router.push(`/creator/videos/${result.data.id}`);
    } catch {
      setSubmitError("動画の作成に失敗しました");
    }
  };

  return (
    <PageContainer title="新規動画登録">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">動画情報を入力</h2>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Select
              id="projectId"
              label="案件"
              options={projectOptions}
              error={errors.projectId?.message}
              disabled={isLoadingProjects}
              {...register("projectId")}
            />

            <Input
              id="title"
              label="タイトル"
              placeholder="動画タイトルを入力"
              error={errors.title?.message}
              {...register("title")}
            />

            <Select
              id="directorId"
              label="ディレクター（任意）"
              options={directorOptions}
              error={errors.directorId?.message}
              disabled={!selectedProjectId}
              {...register("directorId")}
            />

            <Input
              id="deadline"
              label="締切日（任意）"
              type="date"
              error={errors.deadline?.message}
              {...register("deadline")}
            />

            {/* Reference URLs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  参考URL（任意）
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => append({ url: "", platform: "" })}
                >
                  <Plus className="mr-1 h-4 w-4" />
                  追加
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex items-start gap-3">
                  <div className="flex-1">
                    <Input
                      id={`referenceUrls.${index}.url`}
                      placeholder="https://..."
                      error={errors.referenceUrls?.[index]?.url?.message}
                      {...register(`referenceUrls.${index}.url`)}
                    />
                  </div>
                  <div className="w-32">
                    <Input
                      id={`referenceUrls.${index}.platform`}
                      placeholder="YouTube等"
                      {...register(`referenceUrls.${index}.platform`)}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(index)}
                    className="mt-0.5 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {submitError && (
              <p className="text-sm text-red-600">{submitError}</p>
            )}

            <div className="flex items-center gap-3">
              <Button type="submit" loading={isSubmitting}>
                動画を登録
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push("/creator/videos")}
              >
                キャンセル
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}
