// ─── Upload Routes ───────────────────────────────────────────────────
// Presigned URL endpoints for secure client-side S3 uploads.
// Pattern: Client requests URL → uploads directly to S3 → confirms with API.

import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { AppError } from '../middleware/error.js';
import {
  generateUploadUrl,
  generateDownloadUrl,
  deleteFile,
  ALLOWED_CONTENT_TYPES,
} from '../services/storage.js';
import type { UploadCategory } from '../services/storage.js';

export const uploadRouter = Router();

// All upload routes require authentication
uploadRouter.use(authenticate);

// ─── POST /presign — Request a presigned upload URL ──────────────────

const presignBodySchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  category: z.enum(['voice-notes', 'documents', 'attachments']),
});

uploadRouter.post('/presign', async (req, res, next) => {
  try {
    const body = presignBodySchema.parse(req.body);
    const user = req.user!;

    const result = await generateUploadUrl(
      user.tid,
      user.sub,
      body.category as UploadCategory,
      body.filename,
      body.contentType,
    );

    res.json({
      uploadUrl: result.uploadUrl,
      key: result.key,
      expiresAt: result.expiresAt,
      method: 'PUT',
      headers: {
        'Content-Type': body.contentType,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── POST /download-url — Request a presigned download URL ───────────

const downloadBodySchema = z.object({
  key: z.string().min(1),
});

uploadRouter.post('/download-url', async (req, res, next) => {
  try {
    const body = downloadBodySchema.parse(req.body);
    const user = req.user!;

    const result = await generateDownloadUrl(body.key, user.tid);

    res.json({
      downloadUrl: result.downloadUrl,
      expiresAt: result.expiresAt,
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:key — Delete a file from S3 ────────────────────────────

uploadRouter.delete('/*key', async (req, res, next) => {
  try {
    const rawKey = req.params['key'];
    const key = Array.isArray(rawKey) ? rawKey.join('/') : rawKey;
    if (!key) {
      throw new AppError('File key is required', 400);
    }

    const user = req.user!;
    await deleteFile(key, user.tid);

    res.json({ message: 'File deleted', key });
  } catch (err) {
    next(err);
  }
});

// ─── GET /allowed-types — List allowed upload MIME types ─────────────

uploadRouter.get('/allowed-types', (_req, res) => {
  res.json({
    allowedTypes: [...ALLOWED_CONTENT_TYPES],
    maxSizeMB: 25,
  });
});
