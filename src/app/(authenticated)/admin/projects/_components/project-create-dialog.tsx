"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createProjectSchema,
  type CreateProjectInput,
} from "@/lib/validations/project";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Director {
  id: string;
  name: string;
}

interface ProjectCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  directors: Director[];
}

export function ProjectCreateDialog({
  open,
  onClose,
  onSuccess,
  directors,
}: ProjectCreateDialogProps) {
  const [error, setError] = useState("");
  const [selectedDirectorIds, setSelectedDirectorIds] = useState<string[]>([]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      projectCode: "",
      name: "",
      description: "",
      directorIds: [],
    },
  });

  const toggleDirector = (id: string) => {
    setSelectedDirectorIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );
  };

  const onSubmit = async (data: CreateProjectInput) => {
    if (selectedDirectorIds.length === 0) {
      setError("ディレクターを1人以上選択してください");
      return;
    }
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          directorIds: selectedDirectorIds,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error || "案件の作成に失敗しました");
        return;
      }
      reset();
      setSelectedDirectorIds([]);
      onClose();
      onSuccess();
    } catch {
      setError("案件の作成に失敗しました");
    }
  };

  const handleClose = () => {
    reset();
    setSelectedDirectorIds([]);
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} title="新規案件作成">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          id="projectCode"
          label="案件コード"
          placeholder="例: PRJ-001"
          error={errors.projectCode?.message}
          {...register("projectCode")}
        />

        <Input
          id="project-name"
          label="案件名"
          placeholder="例: 株式会社ABC プロモーション動画"
          error={errors.name?.message}
          {...register("name")}
        />

        <div className="space-y-1">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            説明
          </label>
          <textarea
            id="description"
            rows={3}
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="案件の説明（任意）"
            {...register("description")}
          />
          {errors.description?.message && (
            <p className="text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">
            ディレクター
          </label>
          {directors.length === 0 ? (
            <p className="text-sm text-gray-500">
              ディレクターが登録されていません
            </p>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-md border border-gray-300 p-2 space-y-1">
              {directors.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 rounded px-2 py-1 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedDirectorIds.includes(d.id)}
                    onChange={() => toggleDirector(d.id)}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-gray-700">{d.name}</span>
                </label>
              ))}
            </div>
          )}
          {selectedDirectorIds.length === 0 && (
            <p className="text-sm text-red-600">
              ディレクターを1人以上選択してください
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="secondary" onClick={handleClose}>
            キャンセル
          </Button>
          <Button type="submit" loading={isSubmitting}>
            作成
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
