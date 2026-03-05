import { google } from "googleapis";
import { prisma } from "@/lib/db";

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/calendar",
];

// --------------- In-memory caches ---------------

/** TTL cache for DB drive setting (5 minutes) */
let driveSettingCache: { data: Awaited<ReturnType<typeof prisma.googleDriveSetting.findFirst>>; expiresAt: number } | null = null;
const DRIVE_SETTING_TTL = 5 * 60 * 1000; // 5 min

/** TTL cache for access token (50 minutes, tokens expire at 60 min) */
let tokenCache: { token: string; expiresAt: number } | null = null;
const TOKEN_TTL = 50 * 60 * 1000; // 50 min

// ------------------------------------------------

/**
 * Get the active GoogleDriveSetting from DB with in-memory cache (TTL 5 min).
 */
async function getActiveDriveSetting() {
  const now = Date.now();
  if (driveSettingCache && now < driveSettingCache.expiresAt) {
    return driveSettingCache.data;
  }
  const setting = await prisma.googleDriveSetting.findFirst({
    where: { isActive: true },
  });
  driveSettingCache = { data: setting, expiresAt: now + DRIVE_SETTING_TTL };
  return setting;
}

/** Cached GoogleAuth instance (reused as long as the service account key is the same) */
let authCache: { auth: InstanceType<typeof google.auth.GoogleAuth>; keyHash: string } | null = null;

/**
 * Build GoogleAuth — DB serviceAccountKey preferred, env fallback.
 * Caches the GoogleAuth instance to avoid re-parsing JSON and re-creating on every call.
 */
export async function getAuth() {
  const setting = await getActiveDriveSetting();
  const key = setting?.serviceAccountKey || process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY is not configured");
  }

  // Reuse existing auth instance if the key hasn't changed
  if (authCache && authCache.keyHash === key) {
    return authCache.auth;
  }

  const credentials = JSON.parse(key);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: SCOPES,
  });
  authCache = { auth, keyHash: key };
  return auth;
}

async function getDrive() {
  return google.drive({ version: "v3", auth: await getAuth() });
}

/**
 * Get an access token string for direct API calls (cached for 50 min).
 */
export async function getAuthClient(): Promise<string> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt) {
    return tokenCache.token;
  }
  const auth = await getAuth();
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const token = typeof tokenRes === "string" ? tokenRes : tokenRes?.token;
  if (!token) throw new Error("Failed to get access token");
  tokenCache = { token, expiresAt: now + TOKEN_TTL };
  return token;
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
  const client = await auth.getClient();
  const tokenRes = await client.getAccessToken();
  const accessToken = typeof tokenRes === "string" ? tokenRes : tokenRes?.token;
  if (!accessToken) {
    throw new Error("Failed to get access token for Google Drive");
  }

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
      redirect: "manual",
    }
  );

  if (res.status !== 200 && res.status !== 308) {
    const errBody = await res.text();
    throw new Error(`Failed to create resumable upload session: ${res.status} ${errBody}`);
  }

  const uploadUrl = res.headers.get("location") || res.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("No Location header in resumable upload response");
  }

  return { uploadUrl };
}

/**
 * Share a file publicly so anyone with the link can view it.
 */
export async function shareFilePublicly(fileId: string): Promise<void> {
  const drive = await getDrive();
  await drive.permissions.create({
    fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
    supportsAllDrives: true,
  });
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
