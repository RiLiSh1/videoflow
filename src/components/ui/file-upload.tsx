"use client";

import { useState, useRef, useCallback, type DragEvent, type ChangeEvent } from "react";
import { cn } from "@/lib/utils/cn";
import { Upload, Film, X, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./button";

const ACCEPTED_VIDEO_EXTENSIONS = ".mp4,.mov,.avi,.mkv,.webm,.mpeg,.mpg,.wmv,.flv,.3gp,.ogv";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onFileRemove: () => void;
  selectedFile: File | null;
  uploadProgress: number | null;
  uploadStatus: "idle" | "uploading" | "success" | "error";
  errorMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function FileUpload({
  onFileSelect,
  onFileRemove,
  selectedFile,
  uploadProgress,
  uploadStatus,
  errorMessage,
  disabled,
  className,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragOver(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileSelect(files[0]);
      }
    },
    [disabled, onFileSelect]
  );

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileSelect(files[0]);
      }
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [onFileSelect]
  );

  const handleClick = useCallback(() => {
    if (!disabled && uploadStatus !== "uploading") {
      inputRef.current?.click();
    }
  }, [disabled, uploadStatus]);

  return (
    <div className={cn("space-y-2", className)}>
      <label className="block text-sm font-medium text-gray-700">
        動画ファイル
      </label>

      {!selectedFile ? (
        // Drop zone
        <div
          onClick={handleClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 transition-colors cursor-pointer",
            isDragOver
              ? "border-primary-400 bg-primary-50"
              : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <Upload className={cn(
            "mb-3 h-10 w-10",
            isDragOver ? "text-primary-500" : "text-gray-400"
          )} />
          <p className="text-sm font-medium text-gray-700">
            ドラッグ&ドロップ、またはクリックしてファイルを選択
          </p>
          <p className="mt-1 text-xs text-gray-500">
            MP4, MOV, AVI, MKV, WebM など（最大500MB）
          </p>
        </div>
      ) : (
        // Selected file display
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-start gap-4">
            <div className={cn(
              "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg",
              uploadStatus === "error" ? "bg-red-50" : "bg-primary-50"
            )}>
              <Film className={cn(
                "h-6 w-6",
                uploadStatus === "error" ? "text-red-500" : "text-primary-500"
              )} />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(selectedFile.size)}
                    {selectedFile.type && ` / ${selectedFile.type}`}
                  </p>
                </div>

                {uploadStatus !== "uploading" && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileRemove();
                    }}
                    className="flex-shrink-0 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {uploadStatus === "uploading" && uploadProgress !== null && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>アップロード中...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Status indicators */}
              {uploadStatus === "success" && (
                <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  <span>アップロード完了</span>
                </div>
              )}

              {uploadStatus === "error" && (
                <div className="mt-2">
                  <div className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{errorMessage || "アップロードに失敗しました"}</span>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      onFileSelect(selectedFile);
                    }}
                  >
                    再試行
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_VIDEO_EXTENSIONS}
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}
