export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "12 characters minimum", test: (p) => p.length >= 12 },
  { label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "One digit", test: (p) => /\d/.test(p) },
  { label: "One symbol", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
