"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

interface VersionFormProps {
  videoId: string;
}

export function VersionForm({ videoId }: VersionFormProps) {
  const router = useRouter();
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [googleDriveUrl, setGoogleDriveUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fileName.trim()) {
      setError("ファイル名を入力してください");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/videos/${videoId}/versions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: fileName.trim(),
          fileSize: fileSize ? parseInt(fileSize, 10) : 0,
          googleDriveUrl: googleDriveUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "バージョンの登録に失敗しました");
        return;
      }

      setFileName("");
      setFileSize("");
      setGoogleDriveUrl("");
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
        <h3 className="text-lg font-semibold text-gray-900">新しいバージョンを登録</h3>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="fileName"
            label="ファイル名"
            placeholder="video_v1.mp4"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            required
          />
          <Input
            id="fileSize"
            label="ファイルサイズ（バイト）"
            type="number"
            placeholder="0"
            value={fileSize}
            onChange={(e) => setFileSize(e.target.value)}
          />
          <Input
            id="googleDriveUrl"
            label="Google Drive URL（任意）"
            type="url"
            placeholder="https://drive.google.com/..."
            value={googleDriveUrl}
            onChange={(e) => setGoogleDriveUrl(e.target.value)}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" loading={isSubmitting}>
            バージョンを登録
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
