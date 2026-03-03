// ─── Terms of Service Page ────────────────────────────────────────────
import { Link } from 'react-router';

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Terms of Service</h1>
      <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
        Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">1. Acceptance of Terms</h2>
          <p>
            By accessing or using Peacefull.ai ("the Platform"), you agree to be bound by these Terms of
            Service. If you do not agree, do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">2. Description of Service</h2>
          <p>
            Peacefull.ai is an AI-augmented clinical mental health platform designed to support patients
            between therapy sessions and provide measurement-based care tools for clinicians.
            The Platform is not a substitute for professional medical advice, diagnosis, or treatment.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">3. Not Emergency Services</h2>
          <p>
            The Platform does not provide emergency services. If you are experiencing a mental health
            crisis or emergency, call <strong>988</strong> (Suicide & Crisis Lifeline) or <strong>911</strong> immediately.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">4. User Accounts</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for
            all activities that occur under your account. You agree to provide accurate and complete
            information during registration.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">5. AI-Generated Content</h2>
          <p>
            The Platform uses artificial intelligence to generate responses and insights. AI-generated
            content is for informational and supportive purposes only. It should not replace the clinical
            judgment of licensed healthcare professionals.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">6. Data & Privacy</h2>
          <p>
            Your use of the Platform is also governed by our{' '}
            <Link to="/privacy" className="text-brand-600 hover:underline dark:text-brand-400">Privacy Policy</Link>,
            which describes how we collect, use, and protect your personal and health information.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">7. HIPAA Compliance</h2>
          <p>
            Peacefull.ai is designed to comply with the Health Insurance Portability and Accountability
            Act (HIPAA). Protected Health Information (PHI) is encrypted at rest and in transit. Access
            is restricted to authorized users through role-based access controls.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, Peacefull.ai shall not be liable for any indirect,
            incidental, consequential, or punitive damages arising out of your use of the Platform.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-white">9. Contact</h2>
          <p>
            If you have questions about these Terms, please contact us at{' '}
            <a href="mailto:legal@peacefull.ai" className="text-brand-600 hover:underline dark:text-brand-400">
              legal@peacefull.ai
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
