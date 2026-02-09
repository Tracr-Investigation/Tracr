import { PASSWORD_RULES } from '../utils/passwordValidation';

interface PasswordStrengthProps {
  password: string;
}

export const PasswordStrength = ({ password }: PasswordStrengthProps) => {
  if (!password) return null;

  return (
    <ul className="mt-2 space-y-1">
      {PASSWORD_RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li key={rule.label} className={`text-xs flex items-center gap-1.5 ${passed ? 'text-green-400' : 'text-secondary/70'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${passed ? 'bg-green-400' : 'bg-secondary/40'}`} />
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
};
