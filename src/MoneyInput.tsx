import type { InputHTMLAttributes } from 'react';
import { formatMoneyInput } from './money';

type MoneyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: string;
  onChange: (value: string) => void;
};

export const MoneyInput = ({ value, onChange, ...rest }: MoneyInputProps) => (
  <input
    {...rest}
    type="text"
    inputMode="numeric"
    value={value}
    onChange={e => onChange(formatMoneyInput(e.target.value))}
  />
);
