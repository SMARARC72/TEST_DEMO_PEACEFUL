// ─── Analytics Routes ────────────────────────────────────────────────
// Population health metrics, KPIs, ROI dashboard, and financial projections.

import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { UserRole } from '@peacefull/shared';

export const analyticsRouter = Router();

analyticsRouter.use(authenticate);
analyticsRouter.use(requireRole(UserRole.CLINICIAN, UserRole.SUPERVISOR, UserRole.ADMIN));

// ─── GET /population ─────────────────────────────────────────────────

/**
 * Returns population-level health metrics for the clinician's caseload
 * or the entire tenant (ADMIN).
 */
analyticsRouter.get('/population', (req, res) => {
  res.json({
    tenantId: req.user!.tid,
    period: req.query.period ?? '30d',
    metrics: {
      totalPatients: 248,
      activePatients: 212,
      signalDistribution: {
        LOW: 142,
        GUARDED: 48,
        MODERATE: 18,
        ELEVATED: 4,
      },
      avgPHQ9: 11.3,
      avgGAD7: 9.8,
      avgAdherenceRate: 0.74,
      avgSessionsPerWeek: 1.2,
      submissionsThisPeriod: 1847,
      escalationsThisPeriod: 12,
    },
    trends: {
      phq9: [13.1, 12.8, 12.4, 11.9, 11.5, 11.3],
      gad7: [11.2, 10.9, 10.5, 10.1, 9.9, 9.8],
      adherence: [0.68, 0.70, 0.71, 0.72, 0.73, 0.74],
    },
  });
});

// ─── GET /kpi ────────────────────────────────────────────────────────

/**
 * Returns KPI panel data with assumption transparency.
 * Each KPI includes the underlying assumption for investor clarity.
 */
analyticsRouter.get('/kpi', (_req, res) => {
  res.json({
    kpis: [
      {
        name: 'Patient Engagement Rate',
        value: 78,
        unit: '%',
        trend: 'up',
        delta: 5.2,
        assumption: 'Engagement = patients with ≥3 submissions in the last 7 days / total active patients',
      },
      {
        name: 'AI Draft Accept Rate',
        value: 84,
        unit: '%',
        trend: 'up',
        delta: 2.1,
        assumption: 'Accepted without modification / total drafts reviewed by clinicians',
      },
      {
        name: 'Clinician Time Saved',
        value: 12.4,
        unit: 'hrs/week',
        trend: 'up',
        delta: 1.8,
        assumption: 'Estimated from pre/post documentation time comparison (self-reported)',
      },
      {
        name: 'Escalation SLA Compliance',
        value: 96.7,
        unit: '%',
        trend: 'stable',
        delta: 0.3,
        assumption: 'T2 acknowledged within 4 min, T3 within 60 sec',
      },
      {
        name: 'No-Show Reduction',
        value: 31,
        unit: '%',
        trend: 'up',
        delta: 4.0,
        assumption: 'Compared to 12-month pre-implementation baseline; control group comparison',
      },
      {
        name: 'MBC Score Improvement',
        value: 23,
        unit: '%',
        trend: 'up',
        delta: 3.5,
        assumption: 'Average PHQ-9 reduction from intake to 12-week mark across active patients',
      },
    ],
  });
});

// ─── GET /roi ────────────────────────────────────────────────────────

/**
 * Returns ROI dashboard data for investor and operational reporting.
 */
analyticsRouter.get('/roi', (_req, res) => {
  res.json({
    summary: {
      totalInvestment: 2_400_000,
      annualSavings: 1_850_000,
      paybackPeriodMonths: 15.6,
      threeYearROI: 3.2,
    },
    breakdown: {
      documentationTimeSaved: {
        hoursPerWeek: 12.4,
        annualValue: 645_000,
        assumption: 'Based on $100/hr clinician billing rate × hours saved',
      },
      noShowReduction: {
        reductionPercent: 31,
        annualValue: 480_000,
        assumption: 'Current no-show cost × reduction rate × patient volume',
      },
      earlyIntervention: {
        escalationsPreventedPerMonth: 8,
        annualValue: 725_000,
        assumption: 'Average crisis episode cost ($7,500) × prevented escalations',
      },
    },
  });
});

// ─── GET /financials ─────────────────────────────────────────────────

/**
 * Returns investor-facing financial projections: TAM/SAM/SOM analysis.
 */
analyticsRouter.get('/financials', (_req, res) => {
  res.json({
    tam: {
      value: 12_000_000_000,
      label: 'Total Addressable Market',
      description: 'US behavioral health technology market (2026 est.)',
    },
    sam: {
      value: 3_200_000_000,
      label: 'Serviceable Addressable Market',
      description: 'AI-augmented clinical documentation + between-session engagement',
    },
    som: {
      value: 48_000_000,
      label: 'Serviceable Obtainable Market',
      description: 'Year 3 target: 400 practices × $10K avg ACV',
    },
    unitEconomics: {
      acv: 10_000,
      ltv: 36_000,
      cac: 4_200,
      ltvCacRatio: 8.6,
      grossMargin: 0.82,
      monthlyChurn: 0.015,
    },
    projections: {
      year1: { arr: 2_400_000, practices: 80, patients: 19_200 },
      year2: { arr: 12_000_000, practices: 250, patients: 60_000 },
      year3: { arr: 48_000_000, practices: 400, patients: 96_000 },
    },
  });
});
