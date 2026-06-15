export interface CountryEntry {
  name: string;
  phoneCode: string;
}

export const COUNTRIES: CountryEntry[] = [
  { name: 'India', phoneCode: '+91' },
  { name: 'United States', phoneCode: '+1' },
  { name: 'United Kingdom', phoneCode: '+44' },
  { name: 'Canada', phoneCode: '+1' },
  { name: 'Australia', phoneCode: '+61' },
  { name: 'Germany', phoneCode: '+49' },
  { name: 'France', phoneCode: '+33' },
  { name: 'Singapore', phoneCode: '+65' },
  { name: 'United Arab Emirates', phoneCode: '+971' },
  { name: 'Saudi Arabia', phoneCode: '+966' },
  { name: 'Qatar', phoneCode: '+974' },
  { name: 'Kuwait', phoneCode: '+965' },
  { name: 'Bahrain', phoneCode: '+973' },
  { name: 'Nepal', phoneCode: '+977' },
  { name: 'Sri Lanka', phoneCode: '+94' },
  { name: 'Bangladesh', phoneCode: '+880' },
  { name: 'Malaysia', phoneCode: '+60' },
  { name: 'South Africa', phoneCode: '+27' },
  { name: 'New Zealand', phoneCode: '+64' },
  { name: 'Other', phoneCode: '' },
];

export const COUNTRY_OPTIONS = COUNTRIES.map((c) => ({ label: c.name, value: c.name }));

/** country name → dial code */
export const COUNTRY_PHONE_CODE_MAP: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.name, c.phoneCode]),
);

/** Unique dial-code options for the phone prefix Select. */
export const PHONE_CODE_OPTIONS = [
  { value: '+91', label: '+91' },
  { value: '+1', label: '+1' },
  { value: '+44', label: '+44' },
  { value: '+61', label: '+61' },
  { value: '+49', label: '+49' },
  { value: '+33', label: '+33' },
  { value: '+65', label: '+65' },
  { value: '+971', label: '+971' },
  { value: '+966', label: '+966' },
  { value: '+974', label: '+974' },
  { value: '+965', label: '+965' },
  { value: '+973', label: '+973' },
  { value: '+977', label: '+977' },
  { value: '+94', label: '+94' },
  { value: '+880', label: '+880' },
  { value: '+60', label: '+60' },
  { value: '+27', label: '+27' },
  { value: '+64', label: '+64' },
];

/**
 * Combine a dial-code prefix and phone number into a single string.
 * If the number already starts with '+', it is returned as-is (already has a code).
 */
export function buildPhone(phoneCode: string | undefined, phone: string | undefined): string | undefined {
  const num = (phone ?? '').trim();
  if (!num) return undefined;
  if (num.startsWith('+')) return num;
  return `${phoneCode ?? ''}${num}`.trim() || undefined;
}
