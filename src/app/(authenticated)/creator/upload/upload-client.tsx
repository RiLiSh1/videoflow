"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FileUpload } from "@/components/ui/file-upload";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, AlertTriangle, Play, Clock } from "lucide-react";
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
  _count?: { versions: number };
};

type RevisionDetail = {
  latestVersion: {
    versionNumber: number;
    fileName: string;
    googleDriveUrl: string | null;
  } | null;
  feedbacks: {
    comment: string;
    videoTimestamp: number | null;
    user: { name: string; role: string };
    version: { versionNumber: number } | null;
  }[];
  referenceUrls: { url: string; platform: string | null }[];
};

type RevisionVideoOption = VideoOption & {
  detail: RevisionDetail;
};

type UploadResult = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  url: string;
};

type Props = {
  initialProjects: ProjectOption[];
  initialRevisionVideos: RevisionVideoOption[];
};

export default function UploadClient({
  initialProjects,
  initialRevisionVideos,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("new");

  // === New upload state ===
  const [projects] = useState<ProjectOption[]>(initialProjects);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [referenceUrls, setReferenceUrls] = useState<
    { url: string; platform: string }[]
  >([{ url: "", platform: "" }]);
  const [videoType, setVideoType] = useState<
    "ORIGINAL" | "REMAKE" | "OTHER" | ""
  >("");
  const [videoTypeOther, setVideoTypeOther] = useState("");

  // === Revision upload state (all data pre-loaded from server) ===
  const [revisionVideos] = useState<RevisionVideoOption[]>(initialRevisionVideos);
  const [selectedRevisionVideoId, setSelectedRevisionVideoId] = useState("");

  // Detail is instant: just look up from pre-fetched data, no API call
  const revisionDetail = useMemo(
    () => revisionVideos.find((v) => v.id === selectedRevisionVideoId)?.detail ?? null,
    [revisionVideos, selectedRevisionVideoId]
  );

  // === Shared state ===
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

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
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
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
    if (!videoTitle.trim()) return setSubmitError("動画タイトルを入力してください");
    const validUrls = referenceUrls.filter((r) => r.url.trim());
    for (const ref of validUrls) {
      try {
        new URL(ref.url.trim());
      } catch {
        return setSubmitError(`無効なURL: ${ref.url}`);
      }
    }
    if (!videoType) return setSubmitError("動画種別を選択してください");
    if (videoType === "OTHER" && !videoTypeOther.trim())
      return setSubmitError("動画種別の詳細を入力してください");
    if (!selectedFile) return setSubmitError("動画ファイルを選択してください");

    setIsSubmitting(true);
    try {
      // Create video
      const createRes = await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          title: videoTitle.trim(),
          videoType,
          videoTypeOther: videoType === "OTHER" ? videoTypeOther.trim() : null,
          referenceUrls: validUrls.length > 0
            ? validUrls.map((r, i) => ({
                url: r.url.trim(),
                platform: r.platform.trim() || null,
                sortOrder: i,
              }))
            : undefined,
        }),
      });
      const createData = await createRes.json();
      if (!createData.success)
        return (
          setSubmitError(createData.error || "動画の作成に失敗しました"),
          setIsSubmitting(false)
        );

      const videoId = createData.data.id;

      // Upload file
      const fileData = await uploadFile(selectedFile, videoId);
      if (!fileData) return setIsSubmitting(false);

      // Create version v1
      const vRes = await fetch(`/api/videos/${videoId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          googleDriveUrl: fileData.url,
        }),
      });
      if (!(await vRes.json()).success)
        return (
          setSubmitError("バージョンの登録に失敗しました"),
          setIsSubmitting(false)
        );

      // Update status → 提出済み
      await fetch(`/api/videos/${videoId}/status`, {
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

  // Options
  const projectOptions = [
    { value: "", label: "案件を選択" },
    ...projects.map((p) => ({
      value: p.id,
      label: `${p.name} (${p.projectCode})`,
    })),
  ];

  const tabs = [
    { id: "new" as Tab, label: "新規アップロード", count: null },
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
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                案件を選択
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                アップロード先の案件を選択してください
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Select
                  id="projectId"
                  label="案件"
                  options={projectOptions}
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    参考動画URL
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    参考にする動画のURLを入力（任意）
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addReferenceUrl}
                  className="flex-shrink-0"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  <span className="hidden sm:inline">URL</span>追加
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {referenceUrls.map((ref, index) => (
                  <div
                    key={index}
                    className="space-y-2 sm:space-y-0 sm:flex sm:items-start sm:gap-3"
                  >
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
                    <div className="flex items-start gap-2">
                      <div className="flex-1 sm:flex-none sm:w-32">
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
                            updateReferenceUrl(
                              index,
                              "platform",
                              e.target.value
                            )
                          }
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeReferenceUrl(index)}
                        disabled={referenceUrls.length <= 1}
                        className="mt-0.5 flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:text-gray-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-gray-900">
                動画種別
              </h2>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "ORIGINAL" as const, label: "オリジナル動画" },
                  { value: "REMAKE" as const, label: "リメイク動画" },
                  { value: "OTHER" as const, label: "その他" },
                ].map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex items-center gap-2 rounded-full border px-4 py-2 cursor-pointer transition-colors text-sm",
                      videoType === option.value
                        ? "border-primary-500 bg-primary-50 text-primary-700 font-medium"
                        : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                    )}
                  >
                    <input
                      type="radio"
                      name="videoType"
                      value={option.value}
                      checked={videoType === option.value}
                      onChange={() => {
                        setVideoType(option.value);
                        if (option.value !== "OTHER") setVideoTypeOther("");
                      }}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
              {videoType === "OTHER" && (
                <div className="mt-3">
                  <Input
                    id="videoTypeOther"
                    placeholder="詳細を入力してください"
                    value={videoTypeOther}
                    onChange={(e) => setVideoTypeOther(e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

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

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/creator/videos")}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              disabled={!selectedProjectId || !selectedFile || isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? "アップロード中..." : "アップロードして提出"}
            </Button>
          </div>
        </form>
      )}

      {/* ==================== 修正依頼 ==================== */}
      {activeTab === "revision" && (
        <form onSubmit={handleRevisionSubmit} className="space-y-6 max-w-5xl">
          {revisionVideos.length === 0 ? (
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
                  <div className="hidden sm:grid grid-cols-[1fr_120px_100px_60px] gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <span>動画</span>
                    <span>案件</span>
                    <span>担当DIR</span>
                    <span className="text-center">Ver</span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-100">
                    {revisionVideos.map((video) => (
                      <label
                        key={video.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors sm:grid sm:grid-cols-[1fr_120px_100px_60px] sm:gap-2",
                          selectedRevisionVideoId === video.id
                            ? "bg-primary-50 border-l-[3px] border-l-primary-500"
                            : "hover:bg-gray-50 border-l-[3px] border-l-transparent"
                        )}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
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
                              <span className="sm:hidden">
                                {" "}
                                / {video.project.name}
                              </span>
                            </p>
                          </div>
                        </div>
                        <span className="hidden sm:block text-xs text-gray-600 truncate">
                          {video.project.name}
                        </span>
                        <span className="hidden sm:block text-xs text-gray-600 truncate">
                          {video.director?.name || "-"}
                        </span>
                        <span className="flex-shrink-0 text-xs text-gray-400 sm:text-gray-500 sm:text-center">
                          v{video._count?.versions || 0}
                        </span>
                      </label>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 提出動画 & 修正依頼（データはSSRで取得済み、即座に表示） */}
              {revisionDetail &&
                (() => {
                  const latestVersion = revisionDetail.latestVersion;
                  const videoUrl = latestVersion?.googleDriveUrl;
                  const feedbacks = revisionDetail.feedbacks || [];
                  const refUrls = revisionDetail.referenceUrls || [];

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Play className="h-4 w-4 text-primary-500" />
                              <h3 className="text-sm font-semibold text-gray-900">
                                提出済み動画
                              </h3>
                            </div>
                            {latestVersion && (
                              <span className="text-xs text-gray-500">
                                v{latestVersion.versionNumber} /{" "}
                                {latestVersion.fileName}
                              </span>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {videoUrl ? (
                            <div className="rounded-lg overflow-hidden bg-black aspect-video">
                              <video
                                src={videoUrl}
                                controls
                                className="w-full h-full"
                                preload="metadata"
                              >
                                お使いのブラウザは動画の再生に対応していません。
                              </video>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center rounded-lg bg-gray-100 aspect-video">
                              <p className="text-sm text-gray-400">
                                動画ファイルが見つかりません
                              </p>
                            </div>
                          )}
                          {refUrls.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-100">
                              <h4 className="text-xs font-medium text-gray-500 mb-1.5">
                                参考URL
                              </h4>
                              <ul className="space-y-1">
                                {refUrls.map((ref, i) => (
                                  <li
                                    key={i}
                                    className="flex items-center gap-1.5"
                                  >
                                    {ref.platform && (
                                      <span className="text-[10px] font-medium text-gray-400 bg-gray-100 rounded px-1.5 py-0.5">
                                        {ref.platform}
                                      </span>
                                    )}
                                    <a
                                      href={ref.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary-600 hover:underline truncate"
                                    >
                                      {ref.url}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <h3 className="text-sm font-semibold text-gray-900">
                              修正依頼コメント
                            </h3>
                            <span className="text-xs text-gray-400">
                              {feedbacks.length}件
                            </span>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {feedbacks.length > 0 ? (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                              {feedbacks.map((fb, i) => (
                                <div
                                  key={i}
                                  className="rounded-md bg-amber-50 border border-amber-100 p-3"
                                >
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="text-xs font-medium text-gray-900">
                                      {fb.user.name}
                                    </span>
                                    <Badge
                                      className={cn(
                                        "text-[10px] px-1.5 py-0",
                                        fb.user.role === "DIRECTOR"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-red-100 text-red-700"
                                      )}
                                    >
                                      {fb.user.role === "DIRECTOR"
                                        ? "DIR"
                                        : "管理者"}
                                    </Badge>
                                    {fb.version && (
                                      <span className="text-[10px] text-gray-400">
                                        v{fb.version.versionNumber}
                                      </span>
                                    )}
                                    {fb.videoTimestamp !== null && (
                                      <span className="inline-flex items-center gap-0.5 text-[10px] text-primary-600 bg-primary-50 rounded px-1.5 py-0.5">
                                        <Clock className="h-2.5 w-2.5" />
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
                            <p className="text-sm text-gray-500 py-4">
                              コメントはありません
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}

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

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push("/creator/videos")}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  loading={isSubmitting}
                  disabled={
                    !selectedRevisionVideoId || !selectedFile || isSubmitting
                  }
                  className="w-full sm:w-auto"
                >
                  {isSubmitting
                    ? "アップロード中..."
                    : "修正版をアップロードして再提出"}
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </PageContainer>
  );
}
