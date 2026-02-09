export interface PasswordRule {
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { label: "12 caractères minimum", test: (p) => p.length >= 12 },
  { label: "Une minuscule", test: (p) => /[a-z]/.test(p) },
  { label: "Une majuscule", test: (p) => /[A-Z]/.test(p) },
  { label: "Un chiffre", test: (p) => /\d/.test(p) },
  { label: "Un symbole", test: (p) => /[^a-zA-Z0-9]/.test(p) },
];

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
