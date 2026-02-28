"use client";

import { useRef, useCallback, useState } from "react";
import { Card } from "@/components/ui/card";
import { TranscriptionSection } from "@/components/domain/transcription-section";
import { ExternalLink, Clock } from "lucide-react";

interface VersionInfo {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  googleDriveUrl: string | null;
  telopText: string | null;
  telopExtractedAt: string | null;
  audioText: string | null;
  audioExtractedAt: string | null;
}

interface VideoWithTranscriptionProps {
  videoId: string;
  version: VersionInfo;
  /** SSR-generated direct Google Drive URL (bypasses proxy) */
  directStreamUrl?: string | null;
}

/** Extract Google Drive file ID from various URL formats. */
function extractDriveFileId(url: string): string | null {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) return fileMatch[1];
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) return openMatch[1];
  return null;
}

/** Convert a Google Drive URL to our streaming proxy URL. */
function toStreamUrl(url: string): string | null {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  return `/api/drive/stream/${fileId}`;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function VideoWithTranscription({
  videoId,
  version,
  directStreamUrl,
}: VideoWithTranscriptionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [useFallback, setUseFallback] = useState(false);

  const proxyUrl = version.googleDriveUrl
    ? toStreamUrl(version.googleDriveUrl) || version.googleDriveUrl
    : null;

  // Use direct URL if available, fall back to proxy on error
  const streamUrl = (!useFallback && directStreamUrl) || proxyUrl;

  const handleSeek = useCallback((seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <Card className="overflow-hidden">
        <div className="bg-black">
          {streamUrl ? (
            <div className="aspect-video">
              <video
                ref={videoRef}
                src={streamUrl}
                controls
                className="w-full h-full"
                preload="auto"
              >
                お使いのブラウザは動画の再生に対応していません。
              </video>
            </div>
          ) : (
            <div className="aspect-video flex items-center justify-center">
              <p className="text-gray-400 text-sm">
                動画がまだアップロードされていません
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-gray-700">
              v{version.versionNumber}
            </span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">{version.fileName}</span>
            <span className="text-gray-400">|</span>
            <span className="text-gray-500">
              {formatFileSize(version.fileSize)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {streamUrl && (
              <button
                type="button"
                onClick={() => {
                  if (!videoRef.current) return;
                  const t = videoRef.current.currentTime;
                  const mins = Math.floor(t / 60);
                  const secs = (t % 60).toFixed(1);
                  const formatted = `${mins}:${secs.padStart(4, "0")}`;
                  window.dispatchEvent(
                    new CustomEvent("video-timestamp", { detail: { seconds: t, formatted } })
                  );
                }}
                className="inline-flex items-center gap-1 rounded-md bg-primary-50 border border-primary-200 px-2.5 py-1 text-xs font-medium text-primary-700 hover:bg-primary-100 transition-colors"
              >
                <Clock className="h-3.5 w-3.5" />
                タイムスタンプ
              </button>
            )}
            {version.googleDriveUrl && (
              <a
                href={version.googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Google Drive
              </a>
            )}
          </div>
        </div>
      </Card>

      {/* Transcription Section */}
      <TranscriptionSection
        videoId={videoId}
        versionId={version.id}
        initialTelopText={version.telopText}
        initialTelopExtractedAt={version.telopExtractedAt}
        initialAudioText={version.audioText}
        initialAudioExtractedAt={version.audioExtractedAt}
        onSeek={streamUrl ? handleSeek : undefined}
      />
    </div>
  );
}
