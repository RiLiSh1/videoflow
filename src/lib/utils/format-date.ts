import { format, formatDistanceToNow } from "date-fns";
import { ja } from "date-fns/locale";

export function formatDate(date: Date | string): string {
  return format(new Date(date), "yyyy/MM/dd", { locale: ja });
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "yyyy/MM/dd HH:mm", { locale: ja });
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ja });
}
