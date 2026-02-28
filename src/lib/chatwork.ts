type ChatworkSendResult =
  | { success: true; messageId: string }
  | { success: false; error?: string };

export async function sendChatworkMessage(
  roomId: string,
  message: string
): Promise<ChatworkSendResult> {
  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) {
    return { success: false, error: "CHATWORK_API_TOKEN is not set" };
  }

  try {
    const res = await fetch(
      `https://api.chatwork.com/v2/rooms/${roomId}/messages`,
      {
        method: "POST",
        headers: {
          "X-ChatWorkToken": token,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ body: message }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`Chatwork API error: ${res.status} ${text}`);
      return { success: false, error: `${res.status} ${text}` };
    }

    const data = await res.json();
    return { success: true, messageId: String(data.message_id) };
  } catch (err) {
    console.error("Chatwork send failed:", err);
    return { success: false, error: String(err) };
  }
}
