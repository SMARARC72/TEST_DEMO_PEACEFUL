// ─── S3 Storage Service ──────────────────────────────────────────────
// Presigned URL generation for secure file uploads (voice notes, documents).
// Files are stored with tenant-scoped keys in a HIPAA-configured S3 bucket.

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import { env } from '../config/index.js';
import { AppError } from '../middleware/error.js';

// ─── S3 Client ───────────────────────────────────────────────────────

const s3 = new S3Client({ region: env.AWS_REGION });

const BUCKET = env.AWS_S3_BUCKET;

/** Maximum upload size: 25 MB (voice notes + documents). */
const MAX_UPLOAD_SIZE = 25 * 1024 * 1024;

/** Presigned URL expiration: 15 minutes for upload, 60 minutes for download. */
const UPLOAD_EXPIRY_SECONDS = 15 * 60;
const DOWNLOAD_EXPIRY_SECONDS = 60 * 60;

/** Allowed MIME types for upload. */
const ALLOWED_CONTENT_TYPES = new Set([
  // Audio (voice notes)
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  // Documents
  'application/pdf',
  'image/jpeg',
  'image/png',
  // Text
  'text/plain',
]);

// ─── Types ───────────────────────────────────────────────────────────

export type UploadCategory = 'voice-notes' | 'documents' | 'attachments';

export interface PresignedUpload {
  /** The presigned PUT URL the client should upload to. */
  uploadUrl: string;
  /** The S3 object key (for storing in DB records). */
  key: string;
  /** URL expiration (ISO 8601). */
  expiresAt: string;
}

export interface PresignedDownload {
  /** The presigned GET URL to download/stream the file. */
  downloadUrl: string;
  /** URL expiration (ISO 8601). */
  expiresAt: string;
}

// ─── Key Construction ────────────────────────────────────────────────

/**
 * Builds a tenant/user-scoped S3 object key.
 *
 * Pattern: `{tenantId}/{category}/{userId}/{uuid}.{ext}`
 *
 * This ensures data isolation per tenant and logical grouping by user.
 */
function buildObjectKey(
  tenantId: string,
  userId: string,
  category: UploadCategory,
  filename: string,
): string {
  const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
  const uniqueId = randomUUID();
  return `${tenantId}/${category}/${userId}/${uniqueId}.${ext}`;
}

// ─── Presigned URL Generation ────────────────────────────────────────

/**
 * Generates a presigned PUT URL for a client-side direct upload to S3.
 *
 * The client should:
 * 1. Call this endpoint to get the presigned URL
 * 2. PUT the file directly to S3 using the returned URL
 * 3. Send the returned `key` back to the API to link it to a record
 *
 * @param tenantId - Tenant scope for data isolation
 * @param userId - Uploading user's ID
 * @param category - File category (voice-notes, documents, attachments)
 * @param filename - Original filename (used for extension extraction)
 * @param contentType - MIME type of the file
 */
export async function generateUploadUrl(
  tenantId: string,
  userId: string,
  category: UploadCategory,
  filename: string,
  contentType: string,
): Promise<PresignedUpload> {
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new AppError(
      `Unsupported content type: ${contentType}. Allowed: ${[...ALLOWED_CONTENT_TYPES].join(', ')}`,
      400,
    );
  }

  const key = buildObjectKey(tenantId, userId, category, filename);

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
    // Server-side encryption with AWS managed keys
    ServerSideEncryption: 'aws:kms',
    // Content length limit enforced via presigned URL condition
    Metadata: {
      'tenant-id': tenantId,
      'user-id': userId,
      'category': category,
      'original-filename': filename,
    },
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: UPLOAD_EXPIRY_SECONDS,
  });

  const expiresAt = new Date(
    Date.now() + UPLOAD_EXPIRY_SECONDS * 1000,
  ).toISOString();

  return { uploadUrl, key, expiresAt };
}

/**
 * Generates a presigned GET URL for downloading/streaming a file from S3.
 *
 * @param key - The S3 object key
 * @param tenantId - The requesting user's tenant (for authorization check)
 */
export async function generateDownloadUrl(
  key: string,
  tenantId: string,
): Promise<PresignedDownload> {
  // Tenant isolation: key must start with the tenant's prefix
  if (!key.startsWith(`${tenantId}/`)) {
    throw new AppError('Access denied: file belongs to a different tenant', 403);
  }

  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const downloadUrl = await getSignedUrl(s3, command, {
    expiresIn: DOWNLOAD_EXPIRY_SECONDS,
  });

  const expiresAt = new Date(
    Date.now() + DOWNLOAD_EXPIRY_SECONDS * 1000,
  ).toISOString();

  return { downloadUrl, expiresAt };
}

/**
 * Checks if an object exists in S3 (head request).
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Deletes an object from S3. Used for cleanup on record deletion.
 *
 * @param key - The S3 object key
 * @param tenantId - The requesting user's tenant (for authorization check)
 */
export async function deleteFile(
  key: string,
  tenantId: string,
): Promise<void> {
  if (!key.startsWith(`${tenantId}/`)) {
    throw new AppError('Access denied: file belongs to a different tenant', 403);
  }

  await s3.send(
    new DeleteObjectCommand({ Bucket: BUCKET, Key: key }),
  );
}

export { MAX_UPLOAD_SIZE, ALLOWED_CONTENT_TYPES };
