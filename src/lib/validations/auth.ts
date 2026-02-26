import { z } from "zod";

export const loginSchema = z.object({
  loginId: z
    .string()
    .min(1, "ログインIDを入力してください")
    .max(50, "ログインIDは50文字以内で入力してください"),
  password: z
    .string()
    .min(1, "パスワードを入力してください")
    .max(100, "パスワードは100文字以内で入力してください"),
});

export type LoginInput = z.infer<typeof loginSchema>;
