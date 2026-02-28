// ─── Route Index ─────────────────────────────────────────────────────
// Mounts all sub-routers under the /api/v1 namespace.

import { Router } from 'express';
import { authRouter } from './auth.js';
import { patientRouter } from './patients.js';
import { clinicianRouter } from './clinician.js';
import { aiRouter } from './ai.js';
import { analyticsRouter } from './analytics.js';
import { complianceRouter } from './compliance.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/patients', patientRouter);
router.use('/clinician', clinicianRouter);
router.use('/ai', aiRouter);
router.use('/analytics', analyticsRouter);
router.use('/compliance', complianceRouter);

export default router;
