// Pakistani mobile numbers arrive in every shape: 03001234567, 3001234567,
// +923001234567, +92 0300 1234567, 0092-300-1234567 … They're all stored and
// shown as 03XXXXXXXXX, and sent to WhatsApp as 923XXXXXXXXX. The database's
// normalize_pk_phone() applies the same rules.

/** "03XXXXXXXXX", or null when the input isn't a Pakistani mobile number. */
export function normalizePkPhone(input: string | null | undefined): string | null {
  let d = String(input ?? '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2); // 0092…
  if (d.startsWith('92')) d = d.slice(2); // +92…
  if (d.startsWith('0')) d = d.slice(1); // 03… and +9203…
  return /^3\d{9}$/.test(d) ? `0${d}` : null;
}

export const isValidPkPhone = (input: string) => normalizePkPhone(input) !== null;

/** 03XXXXXXXXX for display; anything unrecognisable is shown as it was saved. */
export const displayPkPhone = (input: string | null | undefined) => normalizePkPhone(input) ?? String(input ?? '');

/** 923XXXXXXXXX, the format wa.me expects. */
export function whatsappPhone(input: string): string {
  const local = normalizePkPhone(input);
  return local ? `92${local.slice(1)}` : input.replace(/\D/g, '');
}

// Wallets (JazzCash, Easypaisa, SadaPay…) use a mobile number as the account
// number; bank accounts are left exactly as typed.
const BANK = /bank|hbl|ubl|mcb|meezan|alfalah|allied|faysal|askari|habib|iban/i;

export function normalizeAccountNumber(methodName: string, accountNumber: string): string {
  const trimmed = accountNumber.trim();
  if (BANK.test(methodName)) return trimmed;
  return normalizePkPhone(trimmed) ?? trimmed;
}
