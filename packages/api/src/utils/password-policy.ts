export const PASSWORD_COMPLEXITY_MESSAGE =
  "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character";

const PASSWORD_COMPLEXITY_PATTERN =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/;

export function isStrongPassword(password: string) {
  return PASSWORD_COMPLEXITY_PATTERN.test(password);
}
