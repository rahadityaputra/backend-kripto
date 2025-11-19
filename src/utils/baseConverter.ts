// baseConverter.ts

const BASE = 5;
const DIGITS_PER_BYTE = 4; // Cukup untuk merepresentasikan 255 (2010_5)

export function byteToBase5(byte: number): number[] {
  const digits = [];
  let num = byte;
  for (let i = 0; i < DIGITS_PER_BYTE; i++) {
    digits.push(num % BASE);
    num = Math.floor(num / BASE);
  }
  return digits.reverse();
}

export function base5ToByte(digits: number[]): number {
  let byte = 0;
  if (!digits || digits.length !== DIGITS_PER_BYTE) {
    throw new Error(`Invalid base-5 digits array: ${digits}`);
  }
  for (let i = 0; i < DIGITS_PER_BYTE; i++) {
    byte = byte * BASE + digits[i];
  }
  return byte;
}