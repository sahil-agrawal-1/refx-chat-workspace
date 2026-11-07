import React, { useEffect, useCallback } from 'react';
import { SettingsTab, SETTINGS_NAV_ITEMS } from './types';
import { SettingsHeader } from './SettingsHeader';
import { SettingsSidebar } from './SettingsSidebar';

interface SettingsLayoutProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  onClose: () => void;
  children: React.ReactNode;
}

export const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  activeTab,
  onSelectTab,
  onClose,
  children,
}) => {
  // Keyboard navigation: Escape to close, Arrow keys to cycle sections
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // If user is typing in an input or textarea, don't navigate
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
      ) {
        return;
      }

      const currentIndex = SETTINGS_NAV_ITEMS.findIndex((i) => i.id === activeTab);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % SETTINGS_NAV_ITEMS.length;
        onSelectTab(SETTINGS_NAV_ITEMS[nextIndex].id);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex =
          (currentIndex - 1 + SETTINGS_NAV_ITEMS.length) % SETTINGS_NAV_ITEMS.length;
        onSelectTab(SETTINGS_NAV_ITEMS[prevIndex].id);
      }
    },
    [activeTab, onClose, onSelectTab]
  );

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-5xl h-[85vh] min-h-[560px] max-h-[820px] bg-[#171717] border border-[#303034] rounded-xl shadow-2xl flex flex-col overflow-hidden text-[#F2F2F2] ring-1 ring-[#303034]/80"
        role="dialog"
        aria-modal="true"
        aria-label="Application Settings"
      >
        {/* Compact Application-Style Header */}
        <SettingsHeader activeTab={activeTab} onClose={onClose} />

        {/* Content Area with Categorized Sidebar */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <SettingsSidebar activeTab={activeTab} onSelectTab={onSelectTab} />

          <main className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-[#171717] select-text">
            <div className="max-w-3xl space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};
