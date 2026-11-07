import React from 'react';
import { Search, X } from 'lucide-react';

interface SettingsSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}

export const SettingsSearchInput: React.FC<SettingsSearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => {
  return (
    <div className={`relative flex items-center ${className}`}>
      <Search size={13} className="absolute left-2.5 text-[#71717A] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#141416] border border-[#303034] hover:border-[#71717A] focus:border-[#F2F2F2] rounded-md pl-8 pr-7 py-1.5 text-xs text-[#F2F2F2] placeholder-[#71717A] focus:outline-none transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2 p-0.5 text-[#71717A] hover:text-[#F2F2F2] rounded transition-colors cursor-pointer"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
};
