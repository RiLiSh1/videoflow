import { prisma } from "@/lib/db";
import { sendChatworkMessage, uploadChatworkFile } from "@/lib/chatwork";
import { renderToBuffer } from "@react-pdf/renderer";
import {
  PaymentNotificationDocument,
  type PaymentNotificationPdfData,
  type LineItem,
} from "@/lib/pdf/payment-notification-template";

interface PaymentApprovalChatworkParams {
  userId: string;
  year: number;
  month: number;
  subtotal: number;
  netAmount: number;
  lineItems: LineItem[];
  triggeredByName: string;
  // PDF generation data
  notificationId: string;
  withholdingTax: number;
}

function formatYen(amount: number): string {
  return `¥${amount.toLocaleString()}`;
}

function buildVideoDetailsText(lineItems: LineItem[]): string {
  return lineItems
    .map(
      (item) =>
        `${item.no}. ${item.projectName} / ${item.videoTitle} (${item.videoCode})  ${formatYen(item.amount)}`
    )
    .join("\n");
}

function applyTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replaceAll(`{${key}}`, value);
  }
  return result;
}

export async function sendPaymentApprovalChatwork(
  params: PaymentApprovalChatworkParams
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        name: true,
        chatworkId: true,
        chatworkRoomId: true,
        profile: true,
      },
    });

    if (!user?.chatworkId || !user?.chatworkRoomId) return;

    const template = await prisma.notificationTemplate.findUnique({
      where: { type: "PAYMENT_APPROVED" },
    });

    if (template && !template.isActive) return;

    const tax = Math.floor(params.subtotal * 0.1);
    const subtotalWithTax = params.subtotal + tax;

    const variables: Record<string, string> = {
      year: String(params.year),
      month: String(params.month),
      subtotal: formatYen(params.subtotal),
      tax: formatYen(tax),
      subtotalWithTax: formatYen(subtotalWithTax),
      withholdingTax: formatYen(params.withholdingTax),
      netAmount: formatYen(params.netAmount),
      triggeredByName: params.triggeredByName,
      videoDetails: buildVideoDetailsText(params.lineItems),
    };

    const title = template?.title || "支払通知書発行";
    const fallbackMessage = [
      `対象期間: ${params.year}年${params.month}月`,
      "",
      variables.videoDetails,
      "",
      `報酬（税抜）: ${variables.subtotal}`,
      `消費税(10%): ${variables.tax}`,
      `小計: ${variables.subtotalWithTax}`,
      ...(params.withholdingTax > 0
        ? [`源泉徴収税(10.21%): ▲${variables.withholdingTax}`]
        : []),
      `━━━━━━━━━━━━━`,
      `振込額: ${variables.netAmount}`,
    ].join("\n");
    const messageBody = template
      ? applyTemplate(template.messageTemplate, variables)
      : fallbackMessage;

    const chatworkMessage = `[To:${user.chatworkId}]${user.name}さん\n[info][title]${title}[/title]${messageBody}[/info]`;

    await sendChatworkMessage(user.chatworkRoomId, chatworkMessage);

    // Generate and upload PDF
    try {
      const companySettings = await prisma.companySettings.findFirst();
      const profile = user.profile;
      const isIndividual = (profile?.entityType || "INDIVIDUAL") === "INDIVIDUAL";

      const notificationNumber = `PAY-${params.year}-${String(params.month).padStart(2, "0")}-${String(params.notificationId.slice(-3)).padStart(3, "0")}`;
      const now = new Date();
      const issueDate = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

      const pdfData: PaymentNotificationPdfData = {
        notificationNumber,
        issueDate,
        year: params.year,
        month: params.month,
        creatorName: user.name,
        businessName: profile?.businessName,
        creatorPostalCode: profile?.postalCode,
        creatorAddress: profile?.address,
        creatorInvoiceNumber: profile?.invoiceNumber,
        companyName: companySettings?.companyName || "（未設定）",
        companyPostalCode: companySettings?.postalCode,
        companyAddress: companySettings?.address,
        companyTel: companySettings?.tel,
        companyInvoiceNumber: companySettings?.invoiceNumber,
        lineItems: params.lineItems,
        subtotal: params.subtotal,
        withholdingTax: params.withholdingTax,
        netAmount: params.netAmount,
        isIndividual,
        bankName: profile?.bankName,
        bankBranch: profile?.bankBranch,
        bankAccountType: profile?.bankAccountType,
        bankAccountNumber: profile?.bankAccountNumber,
        bankAccountHolder: profile?.bankAccountHolder,
      };

      const buffer = await renderToBuffer(
        PaymentNotificationDocument({ data: pdfData })
      );

      const fileName = `支払通知書_${user.name}_${params.year}年${String(params.month).padStart(2, "0")}月.pdf`;

      await uploadChatworkFile(
        user.chatworkRoomId,
        new Uint8Array(buffer),
        fileName
      );
    } catch (pdfErr) {
      console.error("Payment notification PDF upload failed:", pdfErr);
    }
  } catch (err) {
    console.error("Payment approval Chatwork notification failed:", err);
  }
}
