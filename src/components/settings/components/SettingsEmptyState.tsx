import React from 'react';

interface SettingsEmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export const SettingsEmptyState: React.FC<SettingsEmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`p-8 text-center flex flex-col items-center justify-center rounded-lg border border-dashed border-[#303034] bg-[#141416]/40 ${className}`}
    >
      <div className="w-9 h-9 rounded-md bg-[#1D1D1F] border border-[#303034] flex items-center justify-center text-[#A1A1AA] mb-3">
        {icon}
      </div>
      <h4 className="text-xs font-semibold text-[#F2F2F2]">{title}</h4>
      <p className="text-[11px] text-[#A1A1AA] max-w-sm mt-1 leading-relaxed">
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};
