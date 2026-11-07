import React from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SettingsSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
}

export const SettingsSelect: React.FC<SettingsSelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="appearance-none bg-[#141416] border border-[#303034] hover:border-[#71717A] focus:border-[#F2F2F2] rounded-md pl-2.5 pr-7 py-1.5 text-xs text-[#F2F2F2] font-medium focus:outline-none transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-[#1D1D1F] text-[#F2F2F2]">
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={12}
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[#71717A]"
      />
    </div>
  );
};
