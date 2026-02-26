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
import { FileUpload } from "@/components/ui/file-upload";
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

type UploadResult = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  url: string;
};

export default function CreatorUploadPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [submitError, setSubmitError] = useState("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

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
      // silently fail
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

  // Upload file to server
  const uploadFile = useCallback(
    async (file: File, videoId?: string): Promise<UploadResult | null> => {
      setUploadStatus("uploading");
      setUploadProgress(0);
      setUploadError("");

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (videoId) formData.append("videoId", videoId);

        // Use XMLHttpRequest for progress tracking
        return await new Promise<UploadResult | null>((resolve, reject) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(percent);
            }
          });

          xhr.addEventListener("load", () => {
            try {
              const result = JSON.parse(xhr.responseText);
              if (xhr.status >= 200 && xhr.status < 300 && result.success) {
                setUploadStatus("success");
                setUploadResult(result.data);
                resolve(result.data);
              } else {
                setUploadStatus("error");
                setUploadError(result.error || "アップロードに失敗しました");
                resolve(null);
              }
            } catch {
              setUploadStatus("error");
              setUploadError("レスポンスの解析に失敗しました");
              resolve(null);
            }
          });

          xhr.addEventListener("error", () => {
            setUploadStatus("error");
            setUploadError("ネットワークエラーが発生しました");
            reject(new Error("Upload failed"));
          });

          xhr.open("POST", "/api/upload");
          xhr.send(formData);
        });
      } catch {
        setUploadStatus("error");
        setUploadError("アップロードに失敗しました");
        return null;
      }
    },
    []
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      setSelectedFile(file);
      setUploadStatus("idle");
      setUploadProgress(null);
      setUploadResult(null);
      setUploadError("");
    },
    []
  );

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadProgress(null);
    setUploadResult(null);
    setUploadError("");
  }, []);

  const onSubmit = async (data: UploadFormData) => {
    setSubmitError("");

    if (!selectedFile) {
      setSubmitError("動画ファイルを選択してください");
      return;
    }

    try {
      // Step 1: Create the video entry
      const videoBody: Record<string, unknown> = {
        projectId: data.projectId,
        title: data.title,
      };

      if (data.directorId) videoBody.directorId = data.directorId;
      if (data.deadline) videoBody.deadline = data.deadline;
      if (data.referenceUrls && data.referenceUrls.length > 0) {
        videoBody.referenceUrls = data.referenceUrls.map((ref) => ({
          url: ref.url,
          platform: ref.platform || undefined,
        }));
      }

      const videoRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(videoBody),
      });

      const videoResult = await videoRes.json();
      if (!videoResult.success) {
        setSubmitError(videoResult.error || "動画の作成に失敗しました");
        return;
      }

      const videoId = videoResult.data.id;

      // Step 2: Upload the file (if not already uploaded)
      let fileData = uploadResult;
      if (!fileData || uploadStatus !== "success") {
        fileData = await uploadFile(selectedFile, videoId);
        if (!fileData) {
          setSubmitError("ファイルのアップロードに失敗しました。動画登録は完了しています。");
          // Still redirect to video detail since the entry was created
          setTimeout(() => router.push(`/creator/videos/${videoId}`), 2000);
          return;
        }
      }

      // Step 3: Register the first version
      const versionRes = await fetch(`/api/videos/${videoId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          googleDriveUrl: fileData.url,
        }),
      });

      const versionResult = await versionRes.json();
      if (!versionResult.success) {
        setSubmitError("バージョンの登録に失敗しました。動画詳細ページで再登録してください。");
        setTimeout(() => router.push(`/creator/videos/${videoId}`), 2000);
        return;
      }

      // Success - redirect to video detail
      router.push(`/creator/videos/${videoId}`);
    } catch {
      setSubmitError("処理中にエラーが発生しました");
    }
  };

  return (
    <PageContainer title="動画アップロード">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
        {/* Step 1: File Upload */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              1. 動画ファイルを選択
            </h2>
          </CardHeader>
          <CardContent>
            <FileUpload
              onFileSelect={handleFileSelect}
              onFileRemove={handleFileRemove}
              selectedFile={selectedFile}
              uploadProgress={uploadProgress}
              uploadStatus={uploadStatus}
              errorMessage={uploadError}
              disabled={isSubmitting}
            />
          </CardContent>
        </Card>

        {/* Step 2: Video Metadata */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              2. 動画情報を入力
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Reference URLs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                3. 参考URL（任意）
              </h2>
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
          </CardHeader>
          {fields.length > 0 && (
            <CardContent>
              <div className="space-y-3">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-start gap-3">
                    <div className="flex-1">
                      <Input
                        id={`referenceUrls.${index}.url`}
                        placeholder="https://www.youtube.com/..."
                        error={errors.referenceUrls?.[index]?.url?.message}
                        {...register(`referenceUrls.${index}.url`)}
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        id={`referenceUrls.${index}.platform`}
                        placeholder="YouTube"
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
            </CardContent>
          )}
        </Card>

        {/* Submit */}
        {submitError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!selectedFile || isSubmitting}
          >
            {isSubmitting ? "アップロード中..." : "動画をアップロード"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push("/creator/videos")}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </PageContainer>
  );
}
