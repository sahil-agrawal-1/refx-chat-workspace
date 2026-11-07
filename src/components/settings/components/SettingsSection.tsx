import React from 'react';

interface SettingsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
  title,
  description,
  children,
  action,
  className = '',
}) => {
  return (
    <section className={`space-y-2.5 ${className}`}>
      {(title || description || action) && (
        <div className="flex items-center justify-between gap-4 px-1">
          <div>
            {title && (
              <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-[11px] text-[#A1A1AA] mt-0.5 leading-normal">
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 divide-y divide-[#303034]/70 overflow-hidden shadow-xs">
        {children}
      </div>
    </section>
  );
};
