"use client";

import { useState, useCallback, Fragment } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Tab = "telop" | "audio";

interface TranscriptionSectionProps {
  videoId: string;
  versionId: string;
  initialTelopText: string | null;
  initialTelopExtractedAt: string | null;
  initialAudioText: string | null;
  initialAudioExtractedAt: string | null;
  onSeek?: (seconds: number) => void;
}

export function TranscriptionSection({
  videoId,
  versionId,
  initialTelopText,
  initialTelopExtractedAt,
  initialAudioText,
  initialAudioExtractedAt,
  onSeek,
}: TranscriptionSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>("telop");

  // Telop state
  const [telopText, setTelopText] = useState(initialTelopText);
  const [telopExtractedAt, setTelopExtractedAt] = useState(initialTelopExtractedAt);
  const [telopLoading, setTelopLoading] = useState(false);
  const [telopError, setTelopError] = useState<string | null>(null);

  // Audio state
  const [audioText, setAudioText] = useState(initialAudioText);
  const [audioExtractedAt, setAudioExtractedAt] = useState(initialAudioExtractedAt);
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const handleExtractTelop = useCallback(async () => {
    setTelopLoading(true);
    setTelopError(null);
    try {
      const res = await fetch(
        `/api/videos/${videoId}/versions/${versionId}/telop`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!data.success) {
        setTelopError(data.error || "テロップ抽出に失敗しました");
        return;
      }
      setTelopText(data.data.telopText);
      setTelopExtractedAt(data.data.telopExtractedAt);
    } catch {
      setTelopError("テロップ抽出に失敗しました");
    } finally {
      setTelopLoading(false);
    }
  }, [videoId, versionId]);

  const handleExtractAudio = useCallback(async () => {
    setAudioLoading(true);
    setAudioError(null);
    try {
      const res = await fetch(
        `/api/videos/${videoId}/versions/${versionId}/audio`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!data.success) {
        setAudioError(data.error || "音声抽出に失敗しました");
        return;
      }
      setAudioText(data.data.audioText);
      setAudioExtractedAt(data.data.audioExtractedAt);
    } catch {
      setAudioError("音声抽出に失敗しました");
    } finally {
      setAudioLoading(false);
    }
  }, [videoId, versionId]);

  const isTelopTab = activeTab === "telop";
  const currentText = isTelopTab ? telopText : audioText;
  const currentExtractedAt = isTelopTab ? telopExtractedAt : audioExtractedAt;
  const currentLoading = isTelopTab ? telopLoading : audioLoading;
  const currentError = isTelopTab ? telopError : audioError;
  const handleExtract = isTelopTab ? handleExtractTelop : handleExtractAudio;
  const extractLabel = isTelopTab ? "テロップ抽出" : "音声抽出";
  const reExtractLabel = isTelopTab ? "再抽出" : "再抽出";
  const loadingMessage = isTelopTab
    ? "テロップを抽出中です。動画の長さによって数分かかる場合があります..."
    : "音声を書き起こし中です。動画の長さによって数分かかる場合があります...";
  const emptyMessage = isTelopTab
    ? "テロップはまだ抽出されていません。「テロップ抽出」ボタンをクリックして抽出を開始してください。"
    : "音声はまだ書き起こされていません。「音声抽出」ボタンをクリックして抽出を開始してください。";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab("telop")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                activeTab === "telop"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              テロップ
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("audio")}
              className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                activeTab === "audio"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              音声
            </button>
          </div>
          <div className="flex items-center gap-2">
            {currentExtractedAt && (
              <span className="text-xs text-gray-500">
                {new Date(currentExtractedAt).toLocaleString("ja-JP")}
              </span>
            )}
            <Button
              size="sm"
              variant={currentText ? "secondary" : "primary"}
              loading={currentLoading}
              onClick={handleExtract}
            >
              {currentText ? reExtractLabel : extractLabel}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentError && (
          <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {currentError}
          </div>
        )}
        {currentLoading && !currentText && (
          <p className="text-sm text-gray-500">{loadingMessage}</p>
        )}
        {currentText ? (
          <div className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
            <TimestampText text={currentText} onSeek={onSeek} />
          </div>
        ) : (
          !currentLoading && (
            <p className="text-sm text-gray-500">{emptyMessage}</p>
          )
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Renders text with clickable [MM:SS] timestamps.
 * If onSeek is undefined, timestamps render as plain text.
 */
function TimestampText({
  text,
  onSeek,
}: {
  text: string;
  onSeek?: (seconds: number) => void;
}) {
  if (!onSeek) {
    return <>{text}</>;
  }

  // Match [MM:SS] patterns
  const parts = text.split(/(\[\d{1,2}:\d{2}\])/g);

  return (
    <>
      {parts.map((part, i) => {
        const match = part.match(/^\[(\d{1,2}):(\d{2})\]$/);
        if (match) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const totalSeconds = minutes * 60 + seconds;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSeek(totalSeconds)}
              className="text-primary-600 hover:text-primary-800 hover:underline cursor-pointer font-mono"
            >
              {part}
            </button>
          );
        }
        return <Fragment key={i}>{part}</Fragment>;
      })}
    </>
  );
}
