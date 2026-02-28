import { google } from "googleapis";
import { prisma } from "@/lib/db";

const SCOPES = ["https://www.googleapis.com/auth/drive"];

/**
 * Get the active GoogleDriveSetting from DB (cached per request).
 */
async function getActiveDriveSetting() {
  const setting = await prisma.googleDriveSetting.findFirst({
    where: { isActive: true },
  });
  return setting;
}

/**
 * Build GoogleAuth — DB serviceAccountKey preferred, env fallback.
 */
async function getAuth() {
  const setting = await getActiveDriveSetting();
  const key = setting?.serviceAccountKey || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
  }

  const credentials = JSON.parse(key);

  return new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
}

async function getDrive() {
  return google.drive({ version: "v3", auth: await getAuth() });
}

/**
 * Get the root folder ID — DB preferred, env fallback.
 */
export async function getRootFolderId(): Promise<string> {
  const setting = await getActiveDriveSetting();
  const id = setting?.rootFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!id) {
    throw new Error("GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured");
  }
  return id;
}

/**
 * Find or create a subfolder inside a parent folder.
 */
export async function findOrCreateFolder(
  name: string,
  parentFolderId: string
): Promise<string> {
  const drive = await getDrive();

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
  const drive = await getDrive();
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
 * Create a resumable upload session on Google Drive.
 * Returns the upload URL that clients can PUT directly to (bypassing our server).
 */
export async function createResumableUploadSession(options: {
  fileName: string;
  mimeType: string;
  parentFolderId: string;
  origin?: string;
}): Promise<{ uploadUrl: string }> {
  const auth = await getAuth();
  const accessToken = await auth.getAccessToken();

  const metadata = {
    name: options.fileName,
    parents: [options.parentFolderId],
  };

  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": options.mimeType,
  };

  // Pass the browser's Origin so Google Drive allows CORS on the upload URL
  if (options.origin) {
    headers["Origin"] = options.origin;
  }

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,webViewLink",
    {
      method: "POST",
      headers,
      body: JSON.stringify(metadata),
    }
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Failed to create resumable upload session: ${res.status} ${errBody}`);
  }

  const uploadUrl = res.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("No Location header in resumable upload response");
  }

  return { uploadUrl };
}

/**
 * Download a file from Google Drive by fileId.
 * Returns the file content as a Buffer.
 */
export async function downloadFileFromDrive(fileId: string): Promise<Buffer> {
  const drive = await getDrive();

  const res = await drive.files.get(
    { fileId, alt: "media", supportsAllDrives: true },
    { responseType: "arraybuffer" }
  );

  return Buffer.from(res.data as ArrayBuffer);
}
