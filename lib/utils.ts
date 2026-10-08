// Numbers are stored like "03001234567", "3001234567" or "+92 300 1234567".
// Reduce them to the 10-digit local part so the country code isn't doubled.
function localDigits(number: string): string {
  let digits = number.replace(/[^0-9]/g, '');
  if (digits.startsWith('92') && digits.length > 10) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

export function formatWhatsAppLink(number: string): string {
  return `https://wa.me/92${localDigits(number)}`;
}

export function formatWhatsAppDisplay(number: string): string {
  const digits = localDigits(number);
  if (digits.length === 10) {
    return `+92 ${digits.slice(0, 3)} ${digits.slice(3)}`;
  }
  return `+92 ${digits}`;
}
