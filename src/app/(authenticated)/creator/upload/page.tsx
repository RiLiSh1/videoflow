"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Plus, Trash2 } from "lucide-react";

type ProjectOption = {
  id: string;
  projectCode: string;
  name: string;
};

type VideoOption = {
  id: string;
  videoCode: string;
  title: string;
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

  // Data loading
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [videos, setVideos] = useState<VideoOption[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);

  // Form state
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<
    { url: string; platform: string }[]
  >([{ url: "", platform: "" }]);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch projects where user is creator
  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
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

  // Fetch videos when project changes (only DRAFT/NOT_STARTED, assigned to me)
  useEffect(() => {
    if (!selectedProjectId) {
      setVideos([]);
      setSelectedVideoId("");
      return;
    }

    setIsLoadingVideos(true);
    setSelectedVideoId("");

    fetch(`/api/videos?projectId=${selectedProjectId}&status=DRAFT`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setVideos(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingVideos(false));
  }, [selectedProjectId]);

  // Reference URL handlers
  const addReferenceUrl = () => {
    setReferenceUrls((prev) => [...prev, { url: "", platform: "" }]);
  };

  const removeReferenceUrl = (index: number) => {
    if (referenceUrls.length <= 1) return; // 最低1つ残す
    setReferenceUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const updateReferenceUrl = (
    index: number,
    field: "url" | "platform",
    value: string
  ) => {
    setReferenceUrls((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // File handlers
  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadStatus("idle");
    setUploadProgress(null);
    setUploadError("");
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadProgress(null);
    setUploadError("");
  }, []);

  // Upload file
  const uploadFile = async (
    file: File,
    videoId: string
  ): Promise<UploadResult | null> => {
    setUploadStatus("uploading");
    setUploadProgress(0);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("videoId", videoId);

    return new Promise<UploadResult | null>((resolve) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          setUploadProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        try {
          const result = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && result.success) {
            setUploadStatus("success");
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
        resolve(null);
      });

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });
  };

  // Validate form
  const validate = (): string | null => {
    if (!selectedProjectId) return "案件を選択してください";
    if (!selectedVideoId) return "動画を選択してください";

    // 参考URL: 最低1つは有効なURLが必要
    const validUrls = referenceUrls.filter((r) => r.url.trim());
    if (validUrls.length === 0) return "参考URLを1つ以上入力してください";
    for (const ref of validUrls) {
      try {
        new URL(ref.url.trim());
      } catch {
        return `無効なURL: ${ref.url}`;
      }
    }

    if (!selectedFile) return "動画ファイルを選択してください";

    return null;
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    const error = validate();
    if (error) {
      setSubmitError(error);
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Upload file to server
      const fileData = await uploadFile(selectedFile!, selectedVideoId);
      if (!fileData) {
        setIsSubmitting(false);
        return;
      }

      // Step 2: Save reference URLs
      const validUrls = referenceUrls.filter((r) => r.url.trim());
      const urlRes = await fetch(
        `/api/videos/${selectedVideoId}/reference-urls`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            urls: validUrls.map((r, i) => ({
              url: r.url.trim(),
              platform: r.platform.trim() || null,
              sortOrder: i,
            })),
          }),
        }
      );
      const urlResult = await urlRes.json();
      if (!urlResult.success) {
        setSubmitError(
          urlResult.error || "参考URLの保存に失敗しました"
        );
        setIsSubmitting(false);
        return;
      }

      // Step 3: Create version (v1)
      const versionRes = await fetch(
        `/api/videos/${selectedVideoId}/versions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: fileData.fileName,
            fileSize: fileData.fileSize,
            mimeType: fileData.mimeType,
            googleDriveUrl: fileData.url,
          }),
        }
      );
      const versionResult = await versionRes.json();
      if (!versionResult.success) {
        setSubmitError("バージョンの登録に失敗しました");
        setIsSubmitting(false);
        return;
      }

      // Step 4: Update status to SUBMITTED (= ディレクター確認待ち)
      const statusRes = await fetch(
        `/api/videos/${selectedVideoId}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "SUBMITTED" }),
        }
      );
      const statusResult = await statusRes.json();
      if (!statusResult.success) {
        setSubmitError("ステータスの更新に失敗しました");
        setIsSubmitting(false);
        return;
      }

      // Success → マイ動画一覧にリダイレクト
      router.push("/creator/videos");
    } catch {
      setSubmitError("処理中にエラーが発生しました");
      setIsSubmitting(false);
    }
  };

  // Options
  const projectOptions = [
    {
      value: "",
      label: isLoadingProjects ? "読み込み中..." : "案件を選択してください",
    },
    ...projects.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.projectCode})`,
    })),
  ];

  const videoOptions = [
    {
      value: "",
      label: isLoadingVideos
        ? "読み込み中..."
        : !selectedProjectId
          ? "案件を先に選択してください"
          : videos.length === 0
            ? "アップロード可能な動画がありません"
            : "動画を選択してください",
    },
    ...videos.map((v) => ({
      value: v.id,
      label: `${v.title} (${v.videoCode})`,
    })),
  ];

  return (
    <PageContainer title="新規アップロード">
      <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
        {/* 案件・動画選択 */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              動画を選択
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Select
                id="projectId"
                label="案件"
                options={projectOptions}
                disabled={isLoadingProjects}
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              />

              <Select
                id="videoId"
                label="動画"
                options={videoOptions}
                disabled={!selectedProjectId || isLoadingVideos}
                value={selectedVideoId}
                onChange={(e) => setSelectedVideoId(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* 参考URL */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                参考動画URL
              </h2>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={addReferenceUrl}
              >
                <Plus className="mr-1 h-4 w-4" />
                URL追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referenceUrls.map((ref, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="flex-1">
                    <Input
                      id={`refUrl-${index}`}
                      placeholder="https://www.instagram.com/reel/..."
                      value={ref.url}
                      onChange={(e) =>
                        updateReferenceUrl(index, "url", e.target.value)
                      }
                    />
                  </div>
                  <div className="w-32">
                    <Select
                      id={`refPlatform-${index}`}
                      options={[
                        { value: "", label: "種別" },
                        { value: "instagram", label: "Instagram" },
                        { value: "tiktok", label: "TikTok" },
                        { value: "other", label: "その他" },
                      ]}
                      value={ref.platform}
                      onChange={(e) =>
                        updateReferenceUrl(index, "platform", e.target.value)
                      }
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeReferenceUrl(index)}
                    disabled={referenceUrls.length <= 1}
                    className="mt-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:text-gray-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <p className="text-xs text-gray-500">
                参考にする動画のURLを入力してください（最低1つ必須）
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ファイルアップロード */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              動画ファイル
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

        {/* エラー & 送信 */}
        {submitError && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {submitError}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            loading={isSubmitting}
            disabled={
              !selectedVideoId || !selectedFile || isSubmitting
            }
          >
            {isSubmitting ? "アップロード中..." : "アップロードして提出"}
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
