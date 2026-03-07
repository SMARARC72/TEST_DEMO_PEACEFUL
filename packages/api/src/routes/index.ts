// ─── Route Index ─────────────────────────────────────────────────────
// Mounts all sub-routers under the /api/v1 namespace.

import { Router } from "express";
import { authRouter } from "./auth.js";
import { patientRouter } from "./patients.js";
import { clinicianRouter } from "./clinician.js";
import { crisisRouter } from "./crisis.js";
import { aiRouter } from "./ai.js";
import { analyticsRouter } from "./analytics.js";
import { complianceRouter } from "./compliance.js";
import { uploadRouter } from "./uploads.js";
import { organizationRouter } from "./organizations.js";
import { apiLogger } from "../utils/logger.js";
import { authenticate } from "../middleware/auth.js";
import { createHash } from "node:crypto";
import { z } from "zod";
import { validate } from "../middleware/validate.js";
import { rateLimit } from "express-rate-limit";

const router = Router();

const MAX_ERROR_REPORT_BYTES = 8 * 1024;

const errorReportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => `client-error:${req.user?.sub ?? req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "RATE_LIMIT_EXCEEDED",
      message: "Too many requests — please try again later",
    },
  },
});

const clientErrorSchema = z
  .object({
    message: z.string().trim().min(1).max(500),
    componentStack: z.string().trim().max(2_000).optional(),
    timestamp: z.string().datetime().optional(),
    release: z.string().trim().max(100).optional(),
    environment: z.string().trim().max(50).optional(),
  })
  .strict();

router.use("/auth", authRouter);
router.use("/patients", patientRouter);
router.use("/clinician", clinicianRouter);
router.use("/crisis", crisisRouter);
router.use("/ai", aiRouter);
router.use("/analytics", analyticsRouter);
router.use("/compliance", complianceRouter);
router.use("/uploads", uploadRouter);
router.use("/organizations", organizationRouter);

// ─── Client Error Reporting ──────────────────────────────────────────
// Receives frontend error reports from ErrorBoundary.
router.post(
  "/errors/report",
  authenticate,
  errorReportLimiter,
  (req, res, next) => {
    const serializedBody = JSON.stringify(req.body ?? {});
    if (Buffer.byteLength(serializedBody, "utf8") > MAX_ERROR_REPORT_BYTES) {
      res.status(413).json({
        error: "PAYLOAD_TOO_LARGE",
        message: "Error report payload exceeds maximum size",
        requestId: req.requestId ?? "unknown",
      });
      return;
    }

    next();
  },
  validate({ body: clientErrorSchema }),
  (req, res) => {
    const { message, componentStack, timestamp, release, environment } =
      req.body ?? {};

    apiLogger.error(
      {
        source: "client",
        userId: req.user?.sub ?? "anonymous",
        message: typeof message === "string" ? message : "Unknown error",
        componentStack,
        errorTimestamp: timestamp,
        release,
        environment,
        sensitiveFields: {
          stack: "[REDACTED]",
          url: "[REDACTED]",
          arbitraryObjects: "[REDACTED]",
        },
        messageFingerprint:
          typeof message === "string"
            ? createHash("sha256").update(message).digest("hex")
            : undefined,
      },
      "Client-side error report",
    );
    res.status(204).end();
  },
);

export default router;
