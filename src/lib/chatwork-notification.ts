import { prisma } from "@/lib/db";
import { sendChatworkMessage } from "@/lib/chatwork";

export interface NotificationContext {
  notificationId: string;
  type: string;
  videoId: string | null;
  targetUserId: string;
  message: string;
  videoTitle?: string;
  triggeredByName?: string;
}

const NOTIFICATION_TITLES: Record<string, string> = {
  VIDEO_SUBMITTED: "動画が提出されました",
  VIDEO_REVISION_REQUESTED: "修正依頼",
  VIDEO_COMPLETED: "最終承認完了",
  VIDEO_FINAL_REVIEW: "最終確認依頼",
  NEW_FEEDBACK: "新しいフィードバック",
};

function buildRoleLink(role: string, videoId: string | null): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  if (!videoId) return base;

  switch (role) {
    case "CREATOR":
      return `${base}/creator/videos/${videoId}`;
    case "DIRECTOR":
      return `${base}/director/reviews/${videoId}`;
    case "ADMIN":
      return `${base}/admin/approvals`;
    default:
      return base;
  }
}

function buildChatworkMessage(
  chatworkId: string,
  userName: string,
  title: string,
  message: string,
  triggeredByName: string | undefined,
  link: string
): string {
  let body = `[To:${chatworkId}]${userName}さん\n[info][title]${title}[/title]${message}`;
  if (triggeredByName) {
    body += `\n担当: ${triggeredByName}`;
  }
  body += `\n${link}[/info]`;
  return body;
}

export async function sendChatworkNotification(
  ctx: NotificationContext
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: ctx.targetUserId },
      select: {
        name: true,
        role: true,
        chatworkId: true,
        chatworkRoomId: true,
      },
    });

    if (!user?.chatworkId || !user?.chatworkRoomId) return;

    const title = NOTIFICATION_TITLES[ctx.type] || ctx.type;
    const link = buildRoleLink(user.role, ctx.videoId);
    const message = buildChatworkMessage(
      user.chatworkId,
      user.name,
      title,
      ctx.message,
      ctx.triggeredByName,
      link
    );

    const result = await sendChatworkMessage(user.chatworkRoomId, message);

    if (result.success) {
      await prisma.notification.update({
        where: { id: ctx.notificationId },
        data: { chatworkSent: true },
      });
    }
  } catch (err) {
    console.error("Chatwork notification failed:", err);
  }
}

export async function sendChatworkNotifications(
  contexts: NotificationContext[]
): Promise<void> {
  try {
    await Promise.allSettled(contexts.map(sendChatworkNotification));
  } catch (err) {
    console.error("Chatwork notifications failed:", err);
  }
}
