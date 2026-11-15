const MAX_MONEY_DIGITS = 11;

export const formatMoneyInput = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, MAX_MONEY_DIGITS);
  if (!digits) return '';
  const padded = digits.padStart(3, '0');
  const integer = padded.slice(0, -2).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${integer},${padded.slice(-2)}`;
};

export const parseMoney = (display: string): number => {
  const value = Number(display.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(value) ? value : 0;
};

export const moneyFromNumber = (value: number | null | undefined): string =>
  value ? formatMoneyInput(Math.round(value * 100).toString()) : '';
