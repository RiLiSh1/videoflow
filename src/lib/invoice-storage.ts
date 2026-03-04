import { put, del } from "@vercel/blob";
import { writeFile, mkdir, readFile } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

export interface StoredFile {
  /** Path or URL to the stored file */
  filePath: string;
  /** File size in bytes */
  fileSize: number;
}

/**
 * Save an invoice PDF. Uses Vercel Blob in production, local filesystem in dev.
 */
export async function saveInvoiceFile(
  paymentNotificationId: string,
  fileName: string,
  buffer: Buffer
): Promise<StoredFile> {
  if (useBlob) {
    const blob = await put(
      `invoices/${paymentNotificationId}/${Date.now()}_${fileName}`,
      buffer,
      {
        access: "public",
        contentType: "application/pdf",
        addRandomSuffix: false,
      }
    );
    return { filePath: blob.url, fileSize: buffer.byteLength };
  }

  // Local filesystem
  const uploadDir = path.join(UPLOAD_DIR, "invoices", paymentNotificationId);
  await mkdir(uploadDir, { recursive: true });

  const timestamp = Date.now();
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const diskFileName = `${timestamp}_${sanitized}`;
  const filePath = path.join(uploadDir, diskFileName);
  await writeFile(filePath, buffer);

  return {
    filePath: `invoices/${paymentNotificationId}/${diskFileName}`,
    fileSize: buffer.byteLength,
  };
}

/**
 * Read an invoice PDF. Handles both Blob URLs and local file paths.
 */
export async function readInvoiceFile(filePath: string): Promise<Buffer> {
  if (filePath.startsWith("http")) {
    // Vercel Blob URL
    const res = await fetch(filePath);
    if (!res.ok) throw new Error(`Failed to fetch blob: ${res.status}`);
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }

  // Local filesystem
  const fullPath = path.join(UPLOAD_DIR, filePath);
  return readFile(fullPath);
}

/**
 * Delete an invoice file (optional cleanup).
 */
export async function deleteInvoiceFile(filePath: string): Promise<void> {
  if (filePath.startsWith("http") && useBlob) {
    try {
      await del(filePath);
    } catch {
      // Ignore deletion errors
    }
  }
}
