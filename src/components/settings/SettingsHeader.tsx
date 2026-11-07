import React from 'react';
import { Settings, X } from 'lucide-react';
import { SettingsTab, SETTINGS_NAV_ITEMS } from './types';

interface SettingsHeaderProps {
  activeTab: SettingsTab;
  onClose: () => void;
}

export const SettingsHeader: React.FC<SettingsHeaderProps> = ({ activeTab, onClose }) => {
  const activeMeta = SETTINGS_NAV_ITEMS.find((item) => item.id === activeTab);

  return (
    <div className="h-14 px-5 border-b border-[#303034] bg-[#171717] flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-7 h-7 rounded-md bg-[#1D1D1F] border border-[#303034] flex items-center justify-center text-[#F2F2F2] shrink-0">
          <Settings size={14} className="text-[#A1A1AA]" />
        </div>

        <div className="min-w-0">
          {/* Breadcrumb & Section Name */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-[#F2F2F2]">Settings</span>
            <span className="text-[#71717A]">/</span>
            <span className="text-[#A1A1AA]">{activeMeta?.category}</span>
            <span className="text-[#71717A]">/</span>
            <span className="font-medium text-[#F2F2F2] truncate">{activeMeta?.label}</span>
          </div>
          <p className="text-[11px] text-[#A1A1AA] truncate mt-0.5">
            {activeMeta?.description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#1D1D1F] border border-[#303034] text-[#71717A]">
          Esc
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-[#A1A1AA] hover:text-[#F2F2F2] hover:bg-[#1D1D1F] rounded-md transition-colors cursor-pointer"
          aria-label="Close settings"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
