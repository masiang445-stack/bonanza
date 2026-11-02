export type PasswordRuleId = "minLength" | "upper" | "lower" | "numberOrSymbol" | "noSpace";

export const PASSWORD_RULES: { id: PasswordRuleId; label: string }[] = [
  { id: "minLength", label: "Minimal 8 karakter" },
  { id: "upper", label: "Ada huruf besar (A–Z)" },
  { id: "lower", label: "Ada huruf kecil (a–z)" },
  { id: "numberOrSymbol", label: "Ada angka atau karakter khusus (!@#$…)" },
  { id: "noSpace", label: "Tanpa spasi" },
];

export function passwordChecks(password: string): Record<PasswordRuleId, boolean> {
  return {
    minLength: password.length >= 8 && password.length <= 72,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    numberOrSymbol: /[0-9]/.test(password) || /[^A-Za-z0-9\s]/.test(password),
    noSpace: password.length > 0 && !/\s/.test(password),
  };
}

export function validatePassword(password: string): string | null {
  if (!password) return "Kata sandi wajib diisi.";
  if (password.length > 72) return "Kata sandi maksimal 72 karakter.";
  const checks = passwordChecks(password);
  if (!checks.minLength) return "Kata sandi minimal 8 karakter.";
  if (!checks.upper) return "Kata sandi harus berisi huruf besar.";
  if (!checks.lower) return "Kata sandi harus berisi huruf kecil.";
  if (!checks.numberOrSymbol) return "Kata sandi harus berisi angka atau karakter khusus.";
  if (!checks.noSpace) return "Kata sandi tidak boleh berisi spasi.";
  return null;
}

export function isStrongPassword(password: string) {
  return validatePassword(password) === null;
}
