import { z } from "zod";

export const companySettingsSchema = z.object({
  companyName: z.string().min(1, "会社名を入力してください").max(100, "会社名は100文字以内で入力してください"),
  postalCode: z
    .string()
    .regex(/^\d{3}-?\d{4}$/, "郵便番号の形式が正しくありません（例: 123-4567）")
    .optional()
    .or(z.literal("")),
  address: z.string().max(200, "住所は200文字以内で入力してください").optional().or(z.literal("")),
  tel: z.string().max(20, "電話番号は20文字以内で入力してください").optional().or(z.literal("")),
  email: z.string().email("正しいメールアドレスを入力してください").optional().or(z.literal("")),
  invoiceNumber: z
    .string()
    .regex(/^T\d{13}$/, "インボイス番号の形式が正しくありません（例: T1234567890123）")
    .optional()
    .or(z.literal("")),
});

export type CompanySettingsInput = z.infer<typeof companySettingsSchema>;
