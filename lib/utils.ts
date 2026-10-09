import { normalizePkPhone, whatsappPhone } from './phone';

/** wa.me link; `message` pre-fills the chat so nobody has to type it. */
export function formatWhatsAppLink(number: string, message?: string): string {
  const base = `https://wa.me/${whatsappPhone(number)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function formatWhatsAppDisplay(number: string): string {
  const local = normalizePkPhone(number);
  return local ? `+92 ${local.slice(1, 4)} ${local.slice(4)}` : number;
}
