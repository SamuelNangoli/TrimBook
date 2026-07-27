/**
 * Lightweight, client-safe field validators for instant form feedback (green
 * ticks). The server still re-validates with Zod — these are UX hints only.
 */
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

export const isPhone = (v: string) => v.trim().replace(/\D/g, "").length >= 7;

export const minLen = (n: number) => (v: string) => v.trim().length >= n;

export const isStrongPassword = (v: string) =>
  v.length >= 8 && /[a-zA-Z]/.test(v) && /[0-9]/.test(v);
