"use client";

import { useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { TranscriptionSection } from "@/components/domain/transcription-section";
import { ExternalLink } from "lucide-react";

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
}

/** Convert a Google Drive URL to its embeddable /preview form. Returns null for non-Drive URLs. */
function toGoogleDriveEmbedUrl(url: string): string | null {
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (fileMatch) {
    return `https://drive.google.com/file/d/${fileMatch[1]}/preview`;
  }
  const openMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/);
  if (openMatch) {
    return `https://drive.google.com/file/d/${openMatch[1]}/preview`;
  }
  return null;
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
}: VideoWithTranscriptionProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const isLocalVideo =
    version.googleDriveUrl &&
    !toGoogleDriveEmbedUrl(version.googleDriveUrl);

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
          {version.googleDriveUrl ? (
            <div className="aspect-video">
              {toGoogleDriveEmbedUrl(version.googleDriveUrl) ? (
                <iframe
                  src={toGoogleDriveEmbedUrl(version.googleDriveUrl)!}
                  className="w-full h-full"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={version.googleDriveUrl}
                  controls
                  className="w-full h-full"
                  preload="metadata"
                >
                  お使いのブラウザは動画の再生に対応していません。
                </video>
              )}
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
      </Card>

      {/* Transcription Section */}
      <TranscriptionSection
        videoId={videoId}
        versionId={version.id}
        initialTelopText={version.telopText}
        initialTelopExtractedAt={version.telopExtractedAt}
        initialAudioText={version.audioText}
        initialAudioExtractedAt={version.audioExtractedAt}
        onSeek={isLocalVideo ? handleSeek : undefined}
      />
    </div>
  );
}
