/**
 * Phone Number Validation and Formatting Utility
 */

const COUNTRY_PREFIXES = [
  { code: '880', country: 'Bangladesh', flag: '🇧🇩' },
  { code: '91', country: 'India', flag: '🇮🇳' },
  { code: '92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '971', country: 'UAE', flag: '🇦🇪' },
  { code: '966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '44', country: 'United Kingdom', flag: '🇬🇧' },
  { code: '1', country: 'US / Canada', flag: '🇺🇸' },
  { code: '60', country: 'Malaysia', flag: '🇲🇾' },
  { code: '65', country: 'Singapore', flag: '🇸🇬' },
  { code: '61', country: 'Australia', flag: '🇦🇺' },
  { code: '49', country: 'Germany', flag: '🇩🇪' },
  { code: '33', country: 'France', flag: '🇫🇷' }
];

function cleanPhoneNumber(input) {
  if (!input) return '';
  // Remove spaces, hyphens, parens, plus, dots
  let cleaned = String(input).replace(/[^\d]/g, '');
  // If starts with 00 (international call prefix), remove leading 00
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  return cleaned;
}

function validatePhoneNumber(input) {
  const cleaned = cleanPhoneNumber(input);

  if (!cleaned) {
    return {
      isValid: false,
      error: 'Phone number cannot be empty.'
    };
  }

  // Check digit count (Standard E.164 phone numbers are between 7 and 15 digits)
  if (cleaned.length < 7 || cleaned.length > 15) {
    return {
      isValid: false,
      error: `Invalid phone number length (${cleaned.length} digits). Must be between 7 and 15 digits with country code.`
    };
  }

  // Detect country
  let detectedCountry = 'Unknown';
  let detectedFlag = '🌐';
  for (const prefix of COUNTRY_PREFIXES) {
    if (cleaned.startsWith(prefix.code)) {
      detectedCountry = prefix.country;
      detectedFlag = prefix.flag;
      break;
    }
  }

  const jid = `${cleaned}@s.whatsapp.net`;

  return {
    isValid: true,
    cleanedNumber: cleaned,
    jid,
    country: detectedCountry,
    flag: detectedFlag,
    displayNumber: `+${cleaned}`
  };
}

module.exports = {
  cleanPhoneNumber,
  validatePhoneNumber
};
