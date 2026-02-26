import { z } from "zod";

export const createProjectSchema = z.object({
  projectCode: z
    .string()
    .min(1, "案件コードを入力してください")
    .max(20, "案件コードは20文字以内で入力してください")
    .regex(/^[A-Z0-9_-]+$/, "案件コードは大文字英数字、ハイフン、アンダースコアのみ使用できます"),
  name: z
    .string()
    .min(1, "案件名を入力してください")
    .max(200, "案件名は200文字以内で入力してください"),
  description: z.string().max(1000, "説明は1000文字以内で入力してください").optional(),
  deadline: z.string().optional(),
  directorIds: z.array(z.string()).min(1, "ディレクターを1人以上選択してください"),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
