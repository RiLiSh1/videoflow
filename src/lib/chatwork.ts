type ChatworkSendResult =
  | { success: true; messageId: string }
  | { success: false; error?: string };

type ChatworkFileResult =
  | { success: true; fileId: string }
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

export async function uploadChatworkFile(
  roomId: string,
  fileBuffer: Uint8Array,
  fileName: string,
  message?: string
): Promise<ChatworkFileResult> {
  const token = process.env.CHATWORK_API_TOKEN;
  if (!token) {
    return { success: false, error: "CHATWORK_API_TOKEN is not set" };
  }

  try {
    const formData = new FormData();
    const blob = new Blob([fileBuffer.buffer], { type: "application/pdf" });
    formData.append("file", blob, fileName);
    if (message) {
      formData.append("message", message);
    }

    const res = await fetch(
      `https://api.chatwork.com/v2/rooms/${roomId}/files`,
      {
        method: "POST",
        headers: {
          "X-ChatWorkToken": token,
        },
        body: formData,
      }
    );

    if (!res.ok) {
      const text = await res.text();
      console.error(`Chatwork file upload error: ${res.status} ${text}`);
      return { success: false, error: `${res.status} ${text}` };
    }

    const data = await res.json();
    return { success: true, fileId: String(data.file_id) };
  } catch (err) {
    console.error("Chatwork file upload failed:", err);
    return { success: false, error: String(err) };
  }
}
