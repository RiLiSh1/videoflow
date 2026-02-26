"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface FeedbackFormProps {
  videoId: string;
  versionId: string;
  versionNumber: number;
}

interface FeedbackFormData {
  comment: string;
  videoTimestamp: string;
}

export function FeedbackForm({ videoId, versionId, versionNumber }: FeedbackFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FeedbackFormData>({
    defaultValues: {
      comment: "",
      videoTimestamp: "",
    },
  });

  const onSubmit = async (data: FeedbackFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        versionId,
        comment: data.comment,
      };

      if (data.videoTimestamp) {
        const parsed = parseFloat(data.videoTimestamp);
        if (!isNaN(parsed) && parsed >= 0) {
          body.videoTimestamp = parsed;
        }
      }

      const res = await fetch(`/api/videos/${videoId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!result.success) {
        setError(result.error || "フィードバックの送信に失敗しました");
        return;
      }

      reset();
      router.refresh();
    } catch {
      setError("フィードバックの送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="comment" className="block text-sm font-medium text-gray-700">
          コメント（バージョン {versionNumber} に対して）
        </label>
        <textarea
          id="comment"
          rows={4}
          className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          placeholder="フィードバックを入力してください..."
          {...register("comment", {
            required: "コメントを入力してください",
          })}
        />
        {errors.comment && (
          <p className="text-sm text-red-600">{errors.comment.message}</p>
        )}
      </div>

      <Input
        id="videoTimestamp"
        label="動画タイムスタンプ（秒）"
        type="number"
        step="0.1"
        min="0"
        placeholder="例: 30.5"
        {...register("videoTimestamp")}
      />

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          フィードバックを送信
        </Button>
      </div>
    </form>
  );
}
