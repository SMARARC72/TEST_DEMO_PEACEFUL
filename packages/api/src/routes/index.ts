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
import { apiLogger } from "../utils/logger.js";

const router = Router();

router.use("/auth", authRouter);
router.use("/patients", patientRouter);
router.use("/clinician", clinicianRouter);
router.use("/crisis", crisisRouter);
router.use("/ai", aiRouter);
router.use("/analytics", analyticsRouter);
router.use("/compliance", complianceRouter);
router.use("/uploads", uploadRouter);

// ─── Client Error Reporting ──────────────────────────────────────────
// Receives frontend error reports from ErrorBoundary.
router.post("/errors/report", (req, res) => {
  const { message, stack, componentStack, url, timestamp } = req.body ?? {};
  apiLogger.error(
    {
      source: "client",
      userId: req.user?.sub ?? "anonymous",
      message,
      stack: typeof stack === "string" ? stack.substring(0, 2000) : undefined,
      componentStack:
        typeof componentStack === "string"
          ? componentStack.substring(0, 2000)
          : undefined,
      pageUrl: url,
      errorTimestamp: timestamp,
    },
    "Client-side error report",
  );
  res.status(204).end();
});

export default router;
