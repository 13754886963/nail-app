export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validatePassword(password: string): string | null {
  if (password.length < 8) return '密码至少 8 位';
  if (!/[A-Za-z]/.test(password)) return '密码须包含字母';
  if (!/[0-9]/.test(password)) return '密码须包含数字';
  return null;
}
