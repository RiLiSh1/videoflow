import { z } from "zod";

export const creatorProfileSchema = z.object({
  entityType: z.enum(["INDIVIDUAL", "CORPORATION"]),
  businessName: z.string().max(100, "屋号は100文字以内で入力してください").optional().or(z.literal("")),
  postalCode: z
    .string()
    .regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません（例: 123-4567）")
    .optional()
    .or(z.literal("")),
  address: z.string().max(200, "住所は200文字以内で入力してください").optional().or(z.literal("")),
  invoiceNumber: z
    .string()
    .regex(/^T\d{13}$/, "インボイス番号の形式が正しくありません（例: T1234567890123）")
    .optional()
    .or(z.literal("")),
  bankName: z.string().max(50, "銀行名は50文字以内で入力してください").optional().or(z.literal("")),
  bankBranch: z.string().max(50, "支店名は50文字以内で入力してください").optional().or(z.literal("")),
  bankAccountType: z.enum(["普通", "当座"]).optional().or(z.literal("")),
  bankAccountNumber: z
    .string()
    .regex(/^\d{7}$/, "口座番号は7桁の数字で入力してください")
    .optional()
    .or(z.literal("")),
  bankAccountHolder: z.string().max(50, "口座名義は50文字以内で入力してください").optional().or(z.literal("")),
});

export type CreatorProfileInput = z.infer<typeof creatorProfileSchema>;
