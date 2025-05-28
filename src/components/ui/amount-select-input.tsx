import { Input } from './input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import React from 'react';

interface Option {
  value: string;
  label: string;
}

interface AmountSelectInputProps {
  amount: string | number;
  onAmountChange: (value: string) => void;
  options: Option[];
  selected: string;
  onSelectChange: (value: string) => void;
  placeholderAmount?: string;
  placeholderSelect?: string;
  disabled?: boolean;
}

export const AmountSelectInput: React.FC<AmountSelectInputProps> = ({
  amount,
  onAmountChange,
  options,
  selected,
  onSelectChange,
  placeholderAmount = '0',
  placeholderSelect = 'Seleccionar',
  disabled = false,
}) => {
  return (
    <div className="flex items-center border rounded px-2 py-1 bg-background w-full">
      <div className="w-[50%]">
        <Input
          type="number"
          min="0"
          step="any"
          className="w-full border-none focus:ring-0 bg-transparent focus:outline-none text-lg"
          value={amount}
          onChange={(e) => onAmountChange(e.target.value)}
          placeholder={placeholderAmount}
          disabled={disabled}
        />
      </div>
      <span className="mx-2">|</span>
      <div className="w-[50%]">
        <Select value={selected} onValueChange={onSelectChange} disabled={disabled}>
          <SelectTrigger className="w-full border-none bg-transparent focus:ring-0 focus:outline-none shadow-none">
            <SelectValue placeholder={placeholderSelect} />
          </SelectTrigger>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}; 