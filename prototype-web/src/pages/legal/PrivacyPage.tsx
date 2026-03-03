// ─── Privacy Policy Page ──────────────────────────────────────────────
import { Link } from 'react-router';

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Privacy Policy</h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">1. Information We Collect</h2>
          <p>We collect information you provide directly when you:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>Create an account (name, email, role)</li>
            <li>Complete check-ins (mood, stress, sleep, focus scores)</li>
            <li>Write journal entries or record voice memos</li>
            <li>Use the AI companion chat</li>
            <li>Submit consent forms</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">2. How We Use Your Information</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>Provide personalized between-session support</li>
            <li>Generate AI-powered insights and reflections</li>
            <li>Enable clinicians to monitor patient progress</li>
            <li>Detect potential risk signals for clinical review</li>
            <li>Improve our services and AI models</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">3. Data Protection</h2>
          <p>We implement industry-standard security measures:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>AES-256 encryption at rest for all PHI</li>
            <li>TLS 1.3 encryption in transit</li>
            <li>Role-based access controls (RBAC)</li>
            <li>Automatic session timeout (15 minutes idle)</li>
            <li>Audit logging of all data access</li>
            <li>Regular security assessments and penetration testing</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">4. HIPAA Compliance</h2>
          <p>
            As a healthcare platform handling Protected Health Information (PHI), we comply with HIPAA
            regulations. We maintain Business Associate Agreements (BAAs) with all service providers
            who may access PHI.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">5. AI Processing Consent</h2>
          <p>
            Your data may be processed by AI systems (including third-party LLMs) to provide
            personalized support and clinical insights. You can review and manage your consent
            preferences at any time in your account settings.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">6. Data Retention</h2>
          <p>
            We retain your data for as long as your account is active or as needed to provide services.
            Clinical records are retained in accordance with applicable healthcare regulations (minimum
            7 years). You may request data deletion by contacting us.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">7. Your Rights</h2>
          <ul className="ml-4 list-disc space-y-1">
            <li>Access your personal data</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your data (subject to legal requirements)</li>
            <li>Withdraw consent for AI processing</li>
            <li>Receive a copy of your data in a portable format</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">8. Contact Us</h2>
          <p>
            For privacy-related questions, contact our Privacy Officer at{' '}
            <a href="mailto:privacy@peacefull.ai" className="text-brand-600 hover:underline dark:text-brand-400">
              privacy@peacefull.ai
            </a>.
          </p>
        </section>
      </div>

      <div className="mt-8">
        <Link to="/login" className="text-sm text-brand-600 hover:underline dark:text-brand-400">
          ← Back to login
        </Link>
      </div>
    </div>
  );
}
