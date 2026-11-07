import React from 'react';
import {
  Sliders,
  Palette,
  Sparkles,
  Cpu,
  Brain,
  Folder,
  Terminal,
  Shield,
  Info,
} from 'lucide-react';
import {
  SettingsTab,
  SettingsCategory,
  SETTINGS_CATEGORIES,
  SETTINGS_NAV_ITEMS,
} from './types';
import { useAppStore } from '@/stores/app-store';

interface SettingsSidebarProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const { providers, taskMemories, appMemories } = useAppStore();

  const getIcon = (id: SettingsTab) => {
    switch (id) {
      case 'general':
        return <Sliders size={14} className="shrink-0" />;
      case 'appearance':
        return <Palette size={14} className="shrink-0" />;
      case 'skills':
        return <Sparkles size={14} className="shrink-0" />;
      case 'models':
        return <Cpu size={14} className="shrink-0" />;
      case 'memory':
        return <Brain size={14} className="shrink-0" />;
      case 'workspace':
        return <Folder size={14} className="shrink-0" />;
      case 'terminal':
        return <Terminal size={14} className="shrink-0" />;
      case 'security':
        return <Shield size={14} className="shrink-0" />;
      case 'about':
        return <Info size={14} className="shrink-0" />;
    }
  };

  const getBadge = (id: SettingsTab): string | undefined => {
    if (id === 'models') {
      const connectedCount = providers.filter((p) => p.status === 'connected').length;
      return connectedCount > 0 ? `${connectedCount} active` : undefined;
    }
    if (id === 'memory') {
      const count = taskMemories.length + appMemories.length;
      return count > 0 ? `${count}` : undefined;
    }
    return undefined;
  };

  return (
    <aside className="w-56 shrink-0 border-r border-[#303034] bg-[#171717] p-2.5 overflow-y-auto custom-scrollbar select-none">
      <div className="space-y-4">
        {SETTINGS_CATEGORIES.map((category) => {
          const items = SETTINGS_NAV_ITEMS.filter((i) => i.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} className="space-y-0.5">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-[#71717A] px-2.5 py-1">
                {category}
              </div>

              <div className="space-y-0.5">
                {items.map((item) => {
                  const isSelected = activeTab === item.id;
                  const badge = getBadge(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      className={`w-full h-8 flex items-center justify-between px-2.5 rounded-md text-left transition-all cursor-pointer font-medium text-xs ${
                        isSelected
                          ? 'bg-[#242426] text-[#F2F2F2] shadow-xs font-semibold'
                          : 'text-[#A1A1AA] hover:text-[#F2F2F2] hover:bg-[#1D1D1F]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={
                            isSelected ? 'text-[#F2F2F2]' : 'text-[#71717A]'
                          }
                        >
                          {getIcon(item.id)}
                        </span>
                        <span className="truncate">{item.label}</span>
                      </div>

                      {badge && (
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                            isSelected
                              ? 'bg-[#171717] text-[#F2F2F2] border border-[#303034]'
                              : 'bg-[#1D1D1F] text-[#71717A]'
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};
