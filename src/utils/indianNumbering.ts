/**
 * Converts numbers into Indian Currency Words (Lakhs, Crores, Thousands)
 * and formats monetary amounts using Indian numeral grouping (e.g. ₹1,25,000.00).
 */

const ONES: string[] = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS: string[] = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function convertTwoDigits(n: number): string {
  if (n === 0) return '';
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${TENS[ten]}${one > 0 ? '-' + ONES[one] : ''}`.trim();
}

function convertThreeDigits(n: number): string {
  if (n === 0) return '';
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;
  let result = '';
  if (hundred > 0) {
    result += `${ONES[hundred]} Hundred`;
    if (remainder > 0) result += ' ';
  }
  if (remainder > 0) {
    result += convertTwoDigits(remainder);
  }
  return result.trim();
}

/**
 * Converts a positive number up to 99,99,99,999 into Indian currency words.
 * Example: 125000 -> "One Lakh Twenty-Five Thousand Rupees Only"
 */
export function numberToIndianWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Zero Rupees Only';
  }

  const absAmount = Math.abs(amount);
  const rupees = Math.floor(absAmount);
  const paise = Math.round((absAmount - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return 'Zero Rupees Only';
  }

  let words = '';

  if (rupees > 0) {
    // Breakdown: Crores (10,000,000), Lakhs (100,000), Thousands (1,000), Hundreds (100)
    let tempRupees = rupees;

    const crores = Math.floor(tempRupees / 10000000);
    tempRupees %= 10000000;

    const lakhs = Math.floor(tempRupees / 100000);
    tempRupees %= 100000;

    const thousands = Math.floor(tempRupees / 1000);
    tempRupees %= 1000;

    const hundredsAndRest = tempRupees;

    const parts: string[] = [];

    if (crores > 0) {
      parts.push(`${convertTwoDigits(crores)} Crore`);
    }
    if (lakhs > 0) {
      parts.push(`${convertTwoDigits(lakhs)} Lakh`);
    }
    if (thousands > 0) {
      parts.push(`${convertTwoDigits(thousands)} Thousand`);
    }
    if (hundredsAndRest > 0) {
      parts.push(convertThreeDigits(hundredsAndRest));
    }

    words = parts.join(' ').trim() + ' Rupees';
  }

  if (paise > 0) {
    const paiseWords = convertTwoDigits(paise) + ' Paise';
    if (words) {
      words += ' and ' + paiseWords;
    } else {
      words = paiseWords;
    }
  }

  return words + ' Only';
}

/**
 * Formats a number to Indian Currency string (e.g. ₹1,25,000.00).
 */
export function formatINR(value: number, includeSymbol: boolean = true): string {
  if (isNaN(value)) value = 0;
  
  // Format with standard Indian localization
  const formatter = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatted = formatter.format(value);
  return includeSymbol ? `₹${formatted}` : formatted;
}
