export function formatWhatsAppLink(number: string): string {
  const digits = number.replace(/[^0-9]/g, '');
  return `https://wa.me/92${digits}`;
}

export function formatWhatsAppDisplay(number: string): string {
  const digits = number.replace(/[^0-9]/g, '');
  if (digits.length === 10) {
    return `+92-${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return `+92-${digits}`;
}
