"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { FileUpload } from "@/components/ui/file-upload";

interface VersionFormProps {
  videoId: string;
}

type UploadResult = {
  fileName: string;
  fileSize: number;
  mimeType: string;
  filePath: string;
  url: string;
  googleDriveUrl: string | null;
  googleDriveFileId: string | null;
};

export function VersionForm({ videoId }: VersionFormProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadStatus("idle");
    setUploadProgress(null);
    setUploadError("");
    setError("");
  }, []);

  const handleFileRemove = useCallback(() => {
    setSelectedFile(null);
    setUploadStatus("idle");
    setUploadProgress(null);
    setUploadError("");
    setError("");
  }, []);

  const uploadFile = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      setUploadStatus("uploading");
      setUploadProgress(0);

      try {
        // Step 1: Get resumable upload URL from our server
        const sessionRes = await fetch("/api/upload/drive-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            mimeType: file.type || "video/mp4",
            videoId,
          }),
        });
        const sessionData = await sessionRes.json();
        if (!sessionData.success) {
          setUploadStatus("error");
          setUploadError(sessionData.error || "アップロードセッションの作成に失敗しました");
          return null;
        }

        const { uploadUrl } = sessionData.data;

        // Step 2: Upload file directly to Google Drive
        return new Promise<UploadResult | null>((resolve) => {
          const xhr = new XMLHttpRequest();

          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              setUploadProgress(Math.round((e.loaded / e.total) * 100));
            }
          });

          xhr.addEventListener("load", () => {
            try {
              if (xhr.status >= 200 && xhr.status < 300) {
                const driveFile = JSON.parse(xhr.responseText);
                setUploadStatus("success");
                resolve({
                  fileName: file.name,
                  fileSize: file.size,
                  mimeType: file.type,
                  filePath: "",
                  url: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
                  googleDriveUrl: driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`,
                  googleDriveFileId: driveFile.id,
                });
              } else {
                setUploadStatus("error");
                setUploadError("Google Driveへのアップロードに失敗しました");
                resolve(null);
              }
            } catch {
              setUploadStatus("error");
              setUploadError("アップロード結果の処理に失敗しました");
              resolve(null);
            }
          });

          xhr.addEventListener("error", () => {
            setUploadStatus("error");
            setUploadError("ネットワークエラーが発生しました");
            resolve(null);
          });

          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
          xhr.send(file);
        });
      } catch {
        setUploadStatus("error");
        setUploadError("アップロードに失敗しました");
        return null;
      }
    },
    [videoId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedFile) {
      setError("ファイルを選択してください");
      return;
    }

    setIsSubmitting(true);

    try {
      // Step 1: Upload file
      const fileData = await uploadFile(selectedFile);
      if (!fileData) {
        setIsSubmitting(false);
        return;
      }

      // Step 2: Register version
      const res = await fetch(`/api/videos/${videoId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
          mimeType: fileData.mimeType,
          googleDriveFileId: fileData.googleDriveFileId || undefined,
          googleDriveUrl: fileData.googleDriveUrl || fileData.url,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "バージョンの登録に失敗しました");
        return;
      }

      // Reset form
      setSelectedFile(null);
      setUploadStatus("idle");
      setUploadProgress(null);
      router.refresh();
    } catch {
      setError("バージョンの登録に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <h3 className="text-lg font-semibold text-gray-900">
          新しいバージョンをアップロード
        </h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <FileUpload
            onFileSelect={handleFileSelect}
            onFileRemove={handleFileRemove}
            selectedFile={selectedFile}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
            errorMessage={uploadError}
            disabled={isSubmitting}
          />

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            type="submit"
            loading={isSubmitting}
            disabled={!selectedFile || isSubmitting}
          >
            バージョンをアップロード
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
