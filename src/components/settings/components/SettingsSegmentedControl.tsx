import React from 'react';

export interface SegmentOption<T extends string> {
  id: T;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

interface SettingsSegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
}

export function SettingsSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
}: SettingsSegmentedControlProps<T>) {
  return (
    <div className="inline-flex items-center p-0.5 rounded-lg bg-[#141416] border border-[#303034]">
      {options.map((opt) => {
        const isSelected = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`flex items-center gap-1.5 rounded-md font-medium transition-all cursor-pointer ${
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
            } ${
              isSelected
                ? 'bg-[#242426] text-[#F2F2F2] shadow-xs border border-[#303034]'
                : 'text-[#A1A1AA] hover:text-[#F2F2F2] hover:bg-[#1D1D1F]/50 border border-transparent'
            }`}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span>{opt.label}</span>
            {opt.count !== undefined && (
              <span
                className={`text-[10px] font-mono px-1 py-0.2 rounded ${
                  isSelected
                    ? 'bg-[#141416] text-[#F2F2F2]'
                    : 'bg-[#1D1D1F] text-[#71717A]'
                }`}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
