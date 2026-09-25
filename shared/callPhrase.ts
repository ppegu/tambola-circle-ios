const SMALL = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

/** Single digits have a spoken introduction; other calls read digits then the number. */
export function callParts(number: number): { digits: string | null; full: string } {
  if (!Number.isInteger(number) || number < 1 || number > 90) throw new Error('Call must be between 1 and 90');
  const full = number < 20 ? SMALL[number]! : TENS[Math.floor(number / 10)]! + (number % 10 ? ' ' + SMALL[number % 10]! : '');
  return { digits: number < 10 ? null : `${SMALL[Math.floor(number / 10)]} ${SMALL[number % 10]}`, full: number < 10 ? `single number ${full}` : full };
}
