// ─── Lighthouse CI Configuration ─────────────────────────────────────
// Runs against the deployed Netlify staging URL.
// Thresholds per PRD Gate 6: performance > 0.90, accessibility > 0.90.

module.exports = {
  ci: {
    collect: {
      url: [
        'https://peacefullai.netlify.app/login',
        'https://peacefullai.netlify.app/patient',
        'https://peacefullai.netlify.app/clinician',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        // Skip audits that require server-side rendering
        skipAudits: ['redirects-http', 'uses-http2'],
      },
    },
    assert: {
      assertions: {
        // PRD Gate 6: Lighthouse CI score > 90
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.85 }],
        // Core Web Vitals
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        // Accessibility specifics
        'color-contrast': ['error', { minScore: 1 }],
        'document-title': ['error', { minScore: 1 }],
        'html-has-lang': ['error', { minScore: 1 }],
        'meta-viewport': ['error', { minScore: 1 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
