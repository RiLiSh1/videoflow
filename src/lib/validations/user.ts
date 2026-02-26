import { z } from "zod";

export const createUserSchema = z.object({
  loginId: z
    .string()
    .min(3, "ログインIDは3文字以上で入力してください")
    .max(50, "ログインIDは50文字以内で入力してください")
    .regex(/^[a-zA-Z0-9_-]+$/, "ログインIDは英数字、ハイフン、アンダースコアのみ使用できます"),
  password: z
    .string()
    .min(6, "パスワードは6文字以上で入力してください")
    .max(100, "パスワードは100文字以内で入力してください"),
  name: z
    .string()
    .min(1, "名前を入力してください")
    .max(100, "名前は100文字以内で入力してください"),
  email: z.string().email("正しいメールアドレスを入力してください").optional().or(z.literal("")),
  role: z.enum(["CREATOR", "DIRECTOR", "ADMIN"]),
  chatworkId: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
