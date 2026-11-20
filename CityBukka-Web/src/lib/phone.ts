/**
 * Nigerian mobile numbers: 0803 123 4567, +234 803 123 4567 or 2348031234567.
 * Returns the 11-digit local form (08031234567) or null when it isn't a valid mobile number.
 */
export function normalizeNigerianPhone(input: string): string | null {
  const digits = input.replace(/[\s()-]/g, '');
  let local: string;
  if (/^\+234\d{10}$/.test(digits)) local = `0${digits.slice(4)}`;
  else if (/^234\d{10}$/.test(digits)) local = `0${digits.slice(3)}`;
  else if (/^0\d{10}$/.test(digits)) local = digits;
  else if (/^[789]\d{9}$/.test(digits)) local = `0${digits}`;
  else return null;
  return /^0[789][01]\d{8}$/.test(local) ? local : null;
}

export const isValidNigerianPhone = (input: string) => normalizeNigerianPhone(input) !== null;

/** 08031234567 → "0803 123 4567" (other input is returned unchanged). */
export function formatPhone(phone: string): string {
  const local = normalizeNigerianPhone(phone);
  return local ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : phone;
}

/** tel: link that dials digits and a leading + only. */
export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;

export const PHONE_HINT = 'e.g. 0803 123 4567';
