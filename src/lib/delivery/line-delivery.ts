/**
 * LINE Messaging API を使った納品通知送信
 *
 * 環境変数:
 *   LINE_CHANNEL_ACCESS_TOKEN - LINE Messaging APIのチャネルアクセストークン
 */

const LINE_API_URL = "https://api.line.me/v2/bot/message/push";

type DeliveryNotificationParams = {
  lineGroupId: string;
  clientName: string;
  videoTitle: string;
  driveUrl?: string;
};

/**
 * メッセージテンプレートを生成
 */
function buildDeliveryMessage(params: DeliveryNotificationParams): string {
  const { clientName, videoTitle, driveUrl } = params;

  const lines = [
    `【動画納品のお知らせ】`,
    ``,
    `${clientName} 様`,
    ``,
    `下記の動画を納品いたしました。`,
    ``,
    `■ 動画タイトル`,
    `${videoTitle}`,
  ];

  if (driveUrl) {
    lines.push(``);
    lines.push(`■ 動画リンク`);
    lines.push(driveUrl);
  }

  lines.push(``);
  lines.push(`ご確認のほど、よろしくお願いいたします。`);

  return lines.join("\n");
}

/**
 * LINEグループに納品通知を送信
 */
export async function sendLineDeliveryNotification(
  params: DeliveryNotificationParams
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません");
  }

  const message = buildDeliveryMessage(params);

  const res = await fetch(LINE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: params.lineGroupId,
      messages: [
        {
          type: "text",
          text: message,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`LINE API error (${res.status}): ${errorBody}`);
  }
}

/**
 * カスタムテンプレートで送信（変数埋め込み対応）
 *
 * テンプレート例: "{{clientName}}様に{{videoTitle}}を納品しました"
 */
export async function sendLineWithTemplate(
  lineGroupId: string,
  template: string,
  variables: Record<string, string>
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません");
  }

  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    message = message.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  const res = await fetch(LINE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineGroupId,
      messages: [{ type: "text", text: message }],
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`LINE API error (${res.status}): ${errorBody}`);
  }
}
