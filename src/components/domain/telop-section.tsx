"use client";

import { useState, useCallback } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TelopSectionProps {
  videoId: string;
  versionId: string;
  initialTelopText: string | null;
  initialTelopExtractedAt: string | null;
}

export function TelopSection({
  videoId,
  versionId,
  initialTelopText,
  initialTelopExtractedAt,
}: TelopSectionProps) {
  const [telopText, setTelopText] = useState(initialTelopText);
  const [extractedAt, setExtractedAt] = useState(initialTelopExtractedAt);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExtract = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/videos/${videoId}/versions/${versionId}/telop`,
        { method: "POST" }
      );
      const data = await res.json();

      if (!data.success) {
        setError(data.error || "テロップ抽出に失敗しました");
        return;
      }

      setTelopText(data.data.telopText);
      setExtractedAt(data.data.telopExtractedAt);
    } catch {
      setError("テロップ抽出に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [videoId, versionId]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            テロップ書き起こし
          </h2>
          <div className="flex items-center gap-2">
            {extractedAt && (
              <span className="text-xs text-gray-500">
                {new Date(extractedAt).toLocaleString("ja-JP")}
              </span>
            )}
            <Button
              size="sm"
              variant={telopText ? "secondary" : "primary"}
              loading={loading}
              onClick={handleExtract}
            >
              {telopText ? "再抽出" : "テロップ抽出"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {loading && !telopText && (
          <p className="text-sm text-gray-500">
            テロップを抽出中です。動画の長さによって数分かかる場合があります...
          </p>
        )}
        {telopText ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
            {telopText}
          </pre>
        ) : (
          !loading && (
            <p className="text-sm text-gray-500">
              テロップはまだ抽出されていません。「テロップ抽出」ボタンをクリックして抽出を開始してください。
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}
