import Anthropic from "@anthropic-ai/sdk";

export type ExtractedInvoice = {
  subtotal: number | null;
  withholding: number | null;
  netAmount: number | null;
};

const client = new Anthropic();

export async function extractInvoiceAmounts(
  pdfBuffer: Buffer
): Promise<ExtractedInvoice> {
  const base64 = pdfBuffer.toString("base64");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: `この請求書PDFから以下の金額を読み取り、JSON形式で返してください。
金額は整数（円単位、小数点以下切り捨て）で返してください。
該当する項目が見つからない場合はnullを返してください。

返却形式（JSONのみ、他のテキストは不要）:
{"subtotal": 数値またはnull, "withholding": 数値またはnull, "netAmount": 数値またはnull}

- subtotal: 請求金額（税抜の報酬額、小計）
- withholding: 源泉徴収税額
- netAmount: 差引振込金額（実際の振込額）`,
          },
        ],
      },
    ],
  });

  const text =
    response.content.find((b) => b.type === "text")?.text ?? "";

  try {
    const match = text.match(/\{[^}]+\}/);
    if (!match) return { subtotal: null, withholding: null, netAmount: null };

    const parsed = JSON.parse(match[0]);
    return {
      subtotal: typeof parsed.subtotal === "number" ? parsed.subtotal : null,
      withholding:
        typeof parsed.withholding === "number" ? parsed.withholding : null,
      netAmount:
        typeof parsed.netAmount === "number" ? parsed.netAmount : null,
    };
  } catch {
    return { subtotal: null, withholding: null, netAmount: null };
  }
}
