import React from 'react';

interface SettingsRowProps {
  label: string;
  description?: string;
  badge?: string;
  children: React.ReactNode;
  className?: string;
  alignTop?: boolean;
}

export const SettingsRow: React.FC<SettingsRowProps> = ({
  label,
  description,
  badge,
  children,
  className = '',
  alignTop = false,
}) => {
  return (
    <div
      className={`p-3.5 flex ${
        alignTop ? 'items-start' : 'items-center'
      } justify-between gap-4 hover:bg-[#242426]/30 transition-colors ${className}`}
    >
      <div className="min-w-0 pr-2">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-[#F2F2F2]">{label}</span>
          {badge && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#141416] border border-[#303034] text-[#A1A1AA]">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-2">{children}</div>
    </div>
  );
};
