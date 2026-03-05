// ─── Shared Password Validator ───────────────────────────────────────
// Single source of truth for password policy across all entry points:
// InviteAcceptPage, RegisterPage, ResetPasswordPage, SettingsPage.
// Policy: min 12 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special.

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'strong' | 'very-strong';
}

const MIN_LENGTH = 12;

const RULES: { test: RegExp; message: string }[] = [
  { test: /[A-Z]/, message: 'At least one uppercase letter' },
  { test: /[a-z]/, message: 'At least one lowercase letter' },
  { test: /[0-9]/, message: 'At least one digit' },
  { test: /[^A-Za-z0-9]/, message: 'At least one special character' },
];

/**
 * Validate a password against the unified Peacefull password policy.
 * Returns validation result with errors and a strength indicator.
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < MIN_LENGTH) {
    errors.push(`At least ${MIN_LENGTH} characters (currently ${password.length})`);
  }

  for (const rule of RULES) {
    if (!rule.test.test(password)) {
      errors.push(rule.message);
    }
  }

  const passed = RULES.filter((r) => r.test.test(password)).length;
  const lengthScore = password.length >= 16 ? 2 : password.length >= MIN_LENGTH ? 1 : 0;
  const totalScore = passed + lengthScore;

  let strength: PasswordValidationResult['strength'] = 'weak';
  if (totalScore >= 6) strength = 'very-strong';
  else if (totalScore >= 4) strength = 'strong';
  else if (totalScore >= 2) strength = 'fair';

  return { valid: errors.length === 0, errors, strength };
}

/**
 * Get a color class for the password strength indicator.
 */
export function strengthColor(strength: PasswordValidationResult['strength']): string {
  switch (strength) {
    case 'very-strong':
      return 'text-green-600 dark:text-green-400';
    case 'strong':
      return 'text-emerald-600 dark:text-emerald-400';
    case 'fair':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'weak':
      return 'text-red-600 dark:text-red-400';
  }
}

/**
 * Get the strength bar width percentage.
 */
export function strengthPercent(strength: PasswordValidationResult['strength']): number {
  switch (strength) {
    case 'very-strong':
      return 100;
    case 'strong':
      return 75;
    case 'fair':
      return 50;
    case 'weak':
      return 25;
  }
}
