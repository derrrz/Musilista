const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateInviteCode(): string {
  let code = 'GRP-';
  for (let i = 0; i < 6; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}
