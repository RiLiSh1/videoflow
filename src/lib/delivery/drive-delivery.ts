import {
  findOrCreateFolder,
  getRootFolderId,
  downloadFileFromDrive,
  uploadFileToDrive,
  shareFilePublicly,
} from "@/lib/google-drive";

/**
 * 納品用Google Drive連携
 *
 * 1. クライアントフォルダ自動生成
 * 2. 動画ファイルのコピー
 * 3. 閲覧権限の設定
 */

/**
 * 納品用のルートフォルダを取得/作成
 * 構造: Root > 納品動画 > {クライアント名} > {週の日付}
 */
export async function getOrCreateDeliveryRootFolder(): Promise<string> {
  const rootId = await getRootFolderId();
  return findOrCreateFolder("納品動画", rootId);
}

/**
 * クライアント別の納品フォルダを取得/作成
 */
export async function getOrCreateClientFolder(clientName: string): Promise<string> {
  const deliveryRoot = await getOrCreateDeliveryRootFolder();
  return findOrCreateFolder(clientName, deliveryRoot);
}

/**
 * 週次の納品フォルダを取得/作成
 * フォルダ名: YYYY-MM-DD（weekStart）
 */
export async function getOrCreateWeekFolder(
  clientName: string,
  weekStart: Date
): Promise<string> {
  const clientFolder = await getOrCreateClientFolder(clientName);
  const weekLabel = weekStart.toISOString().split("T")[0];
  return findOrCreateFolder(weekLabel, clientFolder);
}

/**
 * 動画ファイルを納品フォルダにコピーし、閲覧権限を設定
 *
 * @returns コピー先のfileIdとURL
 */
export async function copyVideoToDeliveryFolder(options: {
  sourceFileId: string;
  fileName: string;
  clientName: string;
  weekStart: Date;
}): Promise<{ fileId: string; webViewLink: string }> {
  const { sourceFileId, fileName, clientName, weekStart } = options;

  // 1. 納品先フォルダを作成
  const weekFolderId = await getOrCreateWeekFolder(clientName, weekStart);

  // 2. 元ファイルをダウンロード
  const buffer = await downloadFileFromDrive(sourceFileId);

  // 3. 納品先にアップロード
  const result = await uploadFileToDrive({
    fileName,
    mimeType: "video/mp4",
    buffer,
    parentFolderId: weekFolderId,
  });

  // 4. 閲覧権限を設定
  await shareFilePublicly(result.fileId);

  return result;
}

/**
 * クライアントのDriveフォルダIDをDBに保存済みの場合は
 * そちらを使い、なければ自動作成する
 */
export async function resolveClientDriveFolder(
  clientGoogleDriveFolderId: string | null,
  clientName: string
): Promise<string> {
  if (clientGoogleDriveFolderId) {
    return clientGoogleDriveFolderId;
  }
  return getOrCreateClientFolder(clientName);
}
