/**
 * Converts a number into Indian Rupee words (Lakhs, Crores)
 * Example: 125400 -> "Rupees One Lakh Twenty-Five Thousand Four Hundred Only"
 */
export function numberToIndianWords(num) {
  if (num === null || num === undefined || isNaN(num)) return '';
  const n = Math.floor(Math.abs(num));
  if (n === 0) return 'Rupees Zero Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(val) {
    if (val < 20) return units[val];
    const unit = val % 10;
    const ten = Math.floor(val / 10);
    return tens[ten] + (unit > 0 ? '-' + units[unit] : '');
  }

  function convertThreeDigits(val) {
    let str = '';
    const hundred = Math.floor(val / 100);
    const rest = val % 100;
    if (hundred > 0) {
      str += units[hundred] + ' Hundred';
      if (rest > 0) str += ' and ';
    }
    if (rest > 0) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  let words = '';
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const hundredAndRest = n % 1000;

  if (crore > 0) {
    words += convertTwoDigits(crore) + ' Crore ';
  }
  if (lakh > 0) {
    words += convertTwoDigits(lakh) + ' Lakh ';
  }
  if (thousand > 0) {
    words += convertTwoDigits(thousand) + ' Thousand ';
  }
  if (hundredAndRest > 0) {
    words += convertThreeDigits(hundredAndRest);
  }

  // Paise calculation
  const paise = Math.round((Math.abs(num) - n) * 100);
  let paiseStr = '';
  if (paise > 0) {
    paiseStr = ' and ' + convertTwoDigits(paise) + ' Paise';
  }

  return `Rupees ${words.trim()}${paiseStr} Only`;
}
