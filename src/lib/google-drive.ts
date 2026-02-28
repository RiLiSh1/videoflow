import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

function getAuth() {
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
  }

  const credentials = JSON.parse(key);

  return new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
}

function getDrive() {
  return google.drive({ version: "v3", auth: getAuth() });
}

/**
 * Find or create a subfolder inside a parent folder.
 */
export async function findOrCreateFolder(
  name: string,
  parentFolderId: string
): Promise<string> {
  const drive = getDrive();

  // Search for existing folder
  const res = await drive.files.list({
    q: `name='${name}' and '${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Create new folder
  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return folder.data.id!;
}

/**
 * Upload a file buffer to Google Drive.
 * Returns { fileId, webViewLink }
 */
export async function uploadFileToDrive(options: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  parentFolderId: string;
}): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDrive();
  const { Readable } = await import("stream");

  const res = await drive.files.create({
    requestBody: {
      name: options.fileName,
      parents: [options.parentFolderId],
    },
    media: {
      mimeType: options.mimeType,
      body: Readable.from(options.buffer),
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  const fileId = res.data.id!;
  const webViewLink = res.data.webViewLink || `https://drive.google.com/file/d/${fileId}/view`;

  return { fileId, webViewLink };
}

/**
 * Get the root folder ID from environment or DB setting.
 */
export function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!id) {
    throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured");
  }
  return id;
}
