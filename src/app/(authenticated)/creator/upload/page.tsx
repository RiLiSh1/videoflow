"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { VideoStatus } from "@prisma/client";

type Tab = "new" | "revision";

type ProjectOption = {
  id: string;
  projectCode: string;
  name: string;
};

type VideoOption = {
  id: string;
  videoCode: string;
  title: string;
  status: VideoStatus;
  project: { id: string; projectCode: string; name: string };
  director: { id: string; name: string } | null;
  referenceUrls?: { url: string; platform: string | null }[];
  feedbacks?: {
    comment: string;
    videoTimestamp: number | null;
    createdAt: string;
    user: { name: string; role: string };
    version: { versionNumber: number } | null;
  }[];
  _count?: { versions: number };
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
  const [activeTab, setActiveTab] = useState<Tab>("new");

  // === New upload state ===
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [newVideos, setNewVideos] = useState<VideoOption[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [isLoadingNewVideos, setIsLoadingNewVideos] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedNewVideoId, setSelectedNewVideoId] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<
    { url: string; platform: string }[]
  >([{ url: "", platform: "" }]);
  const [videoType, setVideoType] = useState<"ORIGINAL" | "REMAKE" | "OTHER" | "">("");
  const [videoTypeOther, setVideoTypeOther] = useState("");

  // === Revision upload state ===
  const [revisionVideos, setRevisionVideos] = useState<VideoOption[]>([]);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState(true);
  const [selectedRevisionVideoId, setSelectedRevisionVideoId] = useState("");

  // === Shared state ===
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Fetch projects
  useEffect(() => {
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setProjects(data.data);
      })
      .catch(() => {})
      .finally(() => setIsLoadingProjects(false));
  }, []);

  // Fetch revision videos (REVISION_REQUESTED status)
  useEffect(() => {
    fetch("/api/videos?status=REVISION_REQUESTED")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setRevisionVideos(data.data);
      })
      .catch(() => {})
      .finally(() => setIsLoadingRevisions(false));
  }, []);

  // Fetch new videos when project changes
  useEffect(() => {
    if (!selectedProjectId) {
      setNewVideos([]);
      setSelectedNewVideoId("");
      return;
    }
    setIsLoadingNewVideos(true);
    setSelectedNewVideoId("");

    fetch(`/api/videos?projectId=${selectedProjectId}&status=DRAFT`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setNewVideos(data.data);
      })
      .catch(() => {})
      .finally(() => setIsLoadingNewVideos(false));
  }, [selectedProjectId]);

  // Reset file when switching tabs
  useEffect(() => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadProgress(null);
    setUploadError("");
    setSubmitError("");
  }, [activeTab]);

  // Reference URL handlers
  const addReferenceUrl = () => {
    setReferenceUrls((prev) => [...prev, { url: "", platform: "" }]);
  };

  const removeReferenceUrl = (index: number) => {
    if (referenceUrls.length <= 1) return;
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

  // Submit new upload
  const handleNewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!selectedProjectId) return setSubmitError("案件を選択してください");
    if (!selectedNewVideoId) return setSubmitError("動画を選択してください");
    const validUrls = referenceUrls.filter((r) => r.url.trim());
    if (validUrls.length === 0)
      return setSubmitError("参考URLを1つ以上入力してください");
    for (const ref of validUrls) {
      try {
        new URL(ref.url.trim());
      } catch {
        return setSubmitError(`無効なURL: ${ref.url}`);
      }
    }
    if (!selectedFile) return setSubmitError("動画ファイルを選択してください");

    setIsSubmitting(true);
    try {
      const fileData = await uploadFile(selectedFile, selectedNewVideoId);
      if (!fileData) return setIsSubmitting(false);

      // Save reference URLs
      const urlRes = await fetch(
        `/api/videos/${selectedNewVideoId}/reference-urls`,
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
      if (!(await urlRes.json()).success)
        return (
          setSubmitError("参考URLの保存に失敗しました"),
          setIsSubmitting(false)
        );

      // Create version v1
      const vRes = await fetch(
        `/api/videos/${selectedNewVideoId}/versions`,
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
      if (!(await vRes.json()).success)
        return (
          setSubmitError("バージョンの登録に失敗しました"),
          setIsSubmitting(false)
        );

      // Update status → ディレクター確認待ち
      await fetch(`/api/videos/${selectedNewVideoId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SUBMITTED" }),
      });

      router.push("/creator/videos");
    } catch {
      setSubmitError("処理中にエラーが発生しました");
      setIsSubmitting(false);
    }
  };

  // Submit revision upload
  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");

    if (!selectedRevisionVideoId)
      return setSubmitError("動画を選択してください");
    if (!selectedFile)
      return setSubmitError("修正版のファイルを選択してください");

    setIsSubmitting(true);
    try {
      const fileData = await uploadFile(selectedFile, selectedRevisionVideoId);
      if (!fileData) return setIsSubmitting(false);

      // Create next version
      const vRes = await fetch(
        `/api/videos/${selectedRevisionVideoId}/versions`,
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
      if (!(await vRes.json()).success)
        return (
          setSubmitError("バージョンの登録に失敗しました"),
          setIsSubmitting(false)
        );

      // Update status → ディレクター確認待ちに戻す
      await fetch(`/api/videos/${selectedRevisionVideoId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVISED" }),
      });

      router.push("/creator/videos");
    } catch {
      setSubmitError("処理中にエラーが発生しました");
      setIsSubmitting(false);
    }
  };

  // Selected revision video detail
  const selectedRevisionVideo = revisionVideos.find(
    (v) => v.id === selectedRevisionVideoId
  );

  // Options
  const projectOptions = [
    {
      value: "",
      label: isLoadingProjects ? "読み込み中..." : "案件を選択",
    },
    ...projects.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.projectCode})`,
    })),
  ];

  const videoOptions = [
    {
      value: "",
      label: isLoadingNewVideos
        ? "読み込み中..."
        : !selectedProjectId
          ? "案件を先に選択してください"
          : newVideos.length === 0
            ? "未着手の動画がありません"
            : "動画を選択",
    },
    ...newVideos.map((v) => ({
      value: v.id,
      label: `${v.title} (${v.videoCode})`,
    })),
  ];

  const tabs = [
    {
      id: "new" as Tab,
      label: "新規アップロード",
      count: null,
    },
    {
      id: "revision" as Tab,
      label: "修正依頼",
      count: revisionVideos.length || null,
    },
  ];

  return (
    <PageContainer title="アップロード">
      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 max-w-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {tab.label}
            {tab.count && (
              <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-xs font-bold text-white">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ==================== 新規アップロード ==================== */}
      {activeTab === "new" && (
        <form onSubmit={handleNewSubmit} className="space-y-6 max-w-3xl">
          {/* 案件・動画選択 */}
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                対象の動画を選択
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                管理者が登録した未着手の動画から選択してください
              </p>
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
                  disabled={!selectedProjectId || isLoadingNewVideos}
                  value={selectedNewVideoId}
                  onChange={(e) => setSelectedNewVideoId(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* 参考URL */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    参考動画URL
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    参考にする動画のURLを入力（最低1つ必須）
                  </p>
                </div>
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

          {submitError && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!selectedNewVideoId || !selectedFile || isSubmitting}
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
      )}

      {/* ==================== 差し戻し修正 ==================== */}
      {activeTab === "revision" && (
        <form onSubmit={handleRevisionSubmit} className="space-y-6 max-w-3xl">
          {isLoadingRevisions ? (
            <Card>
              <CardContent>
                <p className="text-sm text-gray-500 py-4">読み込み中...</p>
              </CardContent>
            </Card>
          ) : revisionVideos.length === 0 ? (
            <Card>
              <CardContent>
                <div className="py-8 text-center">
                  <p className="text-gray-500">修正依頼はありません</p>
                  <p className="text-sm text-gray-400 mt-1">
                    ディレクターからの修正依頼があるとここに表示されます
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* 修正依頼一覧 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        修正依頼一覧
                      </h2>
                      <p className="text-sm text-gray-500 mt-1">
                        {revisionVideos.length}件の修正依頼があります
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {/* テーブルヘッダー */}
                  <div className="grid grid-cols-[1fr_120px_100px_60px] gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>動画</span>
                    <span>案件</span>
                    <span>担当DIR</span>
                    <span className="text-center">Ver</span>
                  </div>
                  {/* リスト（スクロール可能） */}
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
                    {revisionVideos.map((video) => (
                      <label
                        key={video.id}
                        className={cn(
                          "grid grid-cols-[1fr_120px_100px_60px] gap-2 items-center px-4 py-3 cursor-pointer transition-colors",
                          selectedRevisionVideoId === video.id
                            ? "bg-primary-50 border-l-[3px] border-l-primary-500"
                            : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="radio"
                            name="revisionVideo"
                            value={video.id}
                            checked={selectedRevisionVideoId === video.id}
                            onChange={(e) =>
                              setSelectedRevisionVideoId(e.target.value)
                            }
                            className="h-4 w-4 flex-shrink-0 text-primary-600"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {video.title}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                              {video.videoCode}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs text-gray-600 truncate">
                          {video.project.name}
                        </span>
                        <span className="text-xs text-gray-600 truncate">
                          {video.director?.name || "-"}
                        </span>
                        <span className="text-xs text-gray-500 text-center">
                          v{video._count?.versions || 0}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* フィードバック表示 */}
              {selectedRevisionVideo && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                      <h2 className="text-lg font-semibold text-gray-900">
                        修正依頼内容
                      </h2>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedRevisionVideo.feedbacks &&
                    selectedRevisionVideo.feedbacks.length > 0 ? (
                      <div className="space-y-3">
                        {selectedRevisionVideo.feedbacks
                          .slice(0, 5)
                          .map((fb, i) => (
                            <div
                              key={i}
                              className="rounded-md bg-amber-50 border border-amber-100 p-3"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-gray-900">
                                  {fb.user.name}
                                </span>
                                <Badge
                                  className={
                                    fb.user.role === "DIRECTOR"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-red-100 text-red-800"
                                  }
                                >
                                  {fb.user.role === "DIRECTOR"
                                    ? "ディレクター"
                                    : "管理者"}
                                </Badge>
                                {fb.videoTimestamp !== null && (
                                  <span className="text-xs text-gray-500">
                                    {Math.floor(fb.videoTimestamp / 60)}:
                                    {String(
                                      Math.floor(fb.videoTimestamp % 60)
                                    ).padStart(2, "0")}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                {fb.comment}
                              </p>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">
                        フィードバックの詳細は動画詳細ページで確認できます
                      </p>
                    )}

                    {/* 参考URL（引き継ぎ表示） */}
                    {selectedRevisionVideo.referenceUrls &&
                      selectedRevisionVideo.referenceUrls.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h3 className="text-sm font-medium text-gray-700 mb-2">
                            参考URL（前回入力済み）
                          </h3>
                          <ul className="space-y-1">
                            {selectedRevisionVideo.referenceUrls.map(
                              (ref, i) => (
                                <li key={i}>
                                  <a
                                    href={ref.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-primary-600 hover:underline break-all"
                                  >
                                    {ref.url}
                                  </a>
                                  {ref.platform && (
                                    <span className="ml-1 text-xs text-gray-500">
                                      ({ref.platform})
                                    </span>
                                  )}
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      )}
                  </CardContent>
                </Card>
              )}

              {/* ファイルアップロード */}
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold text-gray-900">
                    修正版の動画ファイル
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
                    !selectedRevisionVideoId || !selectedFile || isSubmitting
                  }
                >
                  {isSubmitting
                    ? "アップロード中..."
                    : "修正版をアップロードして再提出"}
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
            </>
          )}
        </form>
      )}
    </PageContainer>
  );
}
