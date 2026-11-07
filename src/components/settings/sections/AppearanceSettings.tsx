import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { SettingsSection } from '../components/SettingsSection';
import { SettingsRow } from '../components/SettingsRow';
import { SettingsToggle } from '../components/SettingsToggle';
import { SettingsSelect } from '../components/SettingsSelect';
import { Check, RotateCcw } from 'lucide-react';

export const AppearanceSettings: React.FC = () => {
  const { settings, updateSetting } = useAppStore();

  const currentTheme = (settings.theme as string) || 'Dark';
  const currentAccent = (settings.accent as string) || 'Neutral';
  const currentDensity = (settings.density as string) || 'Comfortable';
  const fontSize = (settings.fontSize as string) || '14';
  const codeFontFamily = (settings.codeFontFamily as string) || 'JetBrains Mono';
  const reduceMotion = Boolean(settings.reduceMotion);
  const highContrast = Boolean(settings.highContrast);

  const THEMES = [
    {
      id: 'Dark',
      label: 'Dark',
      description: 'Charcoal surfaces and high contrast text',
      preview: (
        <div className="h-14 w-full rounded-md bg-[#171717] border border-[#303034] p-2 flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#303034]" />
            <div className="w-8 h-1.5 rounded-sm bg-[#242426]" />
          </div>
          <div className="flex gap-1.5">
            <div className="w-6 h-6 rounded-sm bg-[#1D1D1F] border border-[#303034]/70" />
            <div className="flex-1 space-y-1 py-0.5">
              <div className="w-3/4 h-1.5 rounded-sm bg-[#303034]" />
              <div className="w-1/2 h-1 rounded-sm bg-[#242426]" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'Light',
      label: 'Light',
      description: 'Clean off-white surfaces with dark text',
      preview: (
        <div className="h-14 w-full rounded-md bg-[#F4F4F5] border border-[#E4E4E7] p-2 flex flex-col justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D4D4D8]" />
            <div className="w-8 h-1.5 rounded-sm bg-[#E4E4E7]" />
          </div>
          <div className="flex gap-1.5">
            <div className="w-6 h-6 rounded-sm bg-[#FFFFFF] border border-[#E4E4E7]" />
            <div className="flex-1 space-y-1 py-0.5">
              <div className="w-3/4 h-1.5 rounded-sm bg-[#D4D4D8]" />
              <div className="w-1/2 h-1 rounded-sm bg-[#E4E4E7]" />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'System',
      label: 'System',
      description: 'Match Windows display theme dynamically',
      preview: (
        <div className="h-14 w-full rounded-md border border-[#303034] overflow-hidden flex">
          <div className="w-1/2 bg-[#171717] p-2 flex flex-col justify-between border-r border-[#303034]">
            <div className="w-6 h-1.5 rounded-sm bg-[#303034]" />
            <div className="w-full h-3 rounded-sm bg-[#242426]" />
          </div>
          <div className="w-1/2 bg-[#F4F4F5] p-2 flex flex-col justify-between">
            <div className="w-6 h-1.5 rounded-sm bg-[#D4D4D8]" />
            <div className="w-full h-3 rounded-sm bg-[#FFFFFF] border border-[#E4E4E7]" />
          </div>
        </div>
      ),
    },
  ];

  const ACCENTS = [
    { id: 'Neutral', label: 'Neutral', color: '#71717A', preview: '#F2F2F2' },
    { id: 'Blue', label: 'Blue', color: '#3B82F6', preview: '#3B82F6' },
    { id: 'Purple', label: 'Purple', color: '#8B5CF6', preview: '#8B5CF6' },
    { id: 'Green', label: 'Green', color: '#10B981', preview: '#10B981' },
    { id: 'Orange', label: 'Orange', color: '#F59E0B', preview: '#F59E0B' },
    { id: 'Rose', label: 'Rose', color: '#F43F5E', preview: '#F43F5E' },
  ];

  const DENSITIES = [
    {
      id: 'Compact',
      label: 'Compact',
      description: 'High information density, condensed padding',
      preview: (
        <div className="space-y-1 p-2 rounded bg-[#141416] border border-[#303034]/70">
          <div className="h-2 rounded bg-[#242426] w-full" />
          <div className="h-2 rounded bg-[#242426] w-5/6" />
          <div className="h-2 rounded bg-[#242426] w-4/6" />
        </div>
      ),
    },
    {
      id: 'Comfortable',
      label: 'Comfortable',
      description: 'Balanced desktop layout for extended sessions',
      preview: (
        <div className="space-y-2 p-2 rounded bg-[#141416] border border-[#303034]/70">
          <div className="h-2.5 rounded bg-[#242426] w-full" />
          <div className="h-2.5 rounded bg-[#242426] w-5/6" />
          <div className="h-2.5 rounded bg-[#242426] w-4/6" />
        </div>
      ),
    },
    {
      id: 'Spacious',
      label: 'Spacious',
      description: 'Generous whitespace and touch-friendly controls',
      preview: (
        <div className="space-y-3 p-2 rounded bg-[#141416] border border-[#303034]/70">
          <div className="h-3 rounded bg-[#242426] w-full" />
          <div className="h-3 rounded bg-[#242426] w-5/6" />
          <div className="h-3 rounded bg-[#242426] w-4/6" />
        </div>
      ),
    },
  ];

  const handleResetDefaults = () => {
    updateSetting('theme', 'Dark');
    updateSetting('accent', 'Neutral');
    updateSetting('density', 'Comfortable');
    updateSetting('fontSize', '14');
    updateSetting('codeFontFamily', 'JetBrains Mono');
    updateSetting('reduceMotion', false);
    updateSetting('highContrast', false);
  };

  return (
    <div className="space-y-6">
      {/* Theme */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div>
            <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">Theme</h3>
            <p className="text-[11px] text-[#A1A1AA] mt-0.5">
              Choose between dark, light, or automatic system theme.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-[#A1A1AA] hover:text-[#F2F2F2] hover:bg-[#1D1D1F] border border-[#303034] rounded-md transition-colors cursor-pointer"
          >
            <RotateCcw size={11} />
            <span>Reset Defaults</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const isSelected = currentTheme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateSetting('theme', t.id)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-[#F2F2F2] bg-[#242426] ring-1 ring-[#F2F2F2]/20 shadow-xs'
                    : 'border-[#303034] bg-[#1D1D1F]/70 hover:border-[#71717A] hover:bg-[#242426]/40'
                }`}
              >
                {t.preview}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F2F2F2]">{t.label}</span>
                    {isSelected && <Check size={13} className="text-[#F2F2F2]" />}
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5 leading-tight">{t.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Accent Color */}
      <section className="space-y-2.5">
        <div className="px-1">
          <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">Accent Color</h3>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
            Select the accent hue applied to interactive controls, badges, and focus indicators.
          </p>
        </div>

        <div className="rounded-lg border border-[#303034] bg-[#1D1D1F]/70 p-3">
          <div className="grid grid-cols-6 gap-2">
            {ACCENTS.map((acc) => {
              const isSelected = currentAccent === acc.id;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => updateSetting('accent', acc.id)}
                  className={`p-2 rounded-md border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-[#F2F2F2] bg-[#242426] shadow-xs'
                      : 'border-[#303034] bg-[#141416] hover:border-[#71717A]'
                  }`}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center border border-white/10"
                    style={{ backgroundColor: acc.preview }}
                  >
                    {isSelected && <Check size={11} className={acc.id === 'Neutral' ? 'text-black' : 'text-white'} />}
                  </div>
                  <span className="text-[11px] font-medium text-[#F2F2F2]">{acc.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Interface Density */}
      <section className="space-y-2.5">
        <div className="px-1">
          <h3 className="text-[13px] font-semibold text-[#F2F2F2] tracking-tight">Interface Density</h3>
          <p className="text-[11px] text-[#A1A1AA] mt-0.5">
            Control the spacing, row heights, and layout padding throughout the workspace.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {DENSITIES.map((den) => {
            const isSelected = currentDensity === den.id;
            return (
              <button
                key={den.id}
                type="button"
                onClick={() => updateSetting('density', den.id)}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'border-[#F2F2F2] bg-[#242426] ring-1 ring-[#F2F2F2]/20 shadow-xs'
                    : 'border-[#303034] bg-[#1D1D1F]/70 hover:border-[#71717A] hover:bg-[#242426]/40'
                }`}
              >
                {den.preview}
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F2F2F2]">{den.label}</span>
                    {isSelected && <Check size={13} className="text-[#F2F2F2]" />}
                  </div>
                  <p className="text-[10px] text-[#A1A1AA] mt-0.5 leading-tight">{den.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Typography & Accessibility */}
      <SettingsSection
        title="Typography & Accessibility"
        description="Text scaling, font selection, and accessibility accommodations."
      >
        <SettingsRow
          label="UI Font Scale"
          description="Overall typography scaling for buttons, sidebars, and navigation."
        >
          <SettingsSelect
            value={fontSize}
            onChange={(v) => updateSetting('fontSize', v)}
            options={[
              { value: '12', label: '12px · Compact' },
              { value: '13', label: '13px · Small' },
              { value: '14', label: '14px · Standard (Default)' },
              { value: '15', label: '15px · Medium' },
              { value: '16', label: '16px · Large' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label="Editor Font Family"
          description="Code block and diff typography font family."
        >
          <SettingsSelect
            value={codeFontFamily}
            onChange={(v) => updateSetting('codeFontFamily', v)}
            options={[
              { value: 'JetBrains Mono', label: 'JetBrains Mono' },
              { value: 'Fira Code', label: 'Fira Code' },
              { value: 'Cascadia Code', label: 'Cascadia Code' },
              { value: 'Consolas', label: 'Consolas' },
            ]}
          />
        </SettingsRow>

        <SettingsRow
          label="Reduced Motion"
          description="Disable smooth animations and transitional scaling across all views."
        >
          <SettingsToggle
            checked={reduceMotion}
            onChange={(val) => updateSetting('reduceMotion', val)}
            ariaLabel="Reduced motion"
          />
        </SettingsRow>

        <SettingsRow
          label="High Contrast Borders"
          description="Increase the contrast ratio of container boundaries and separators."
        >
          <SettingsToggle
            checked={highContrast}
            onChange={(val) => updateSetting('highContrast', val)}
            ariaLabel="High contrast"
          />
        </SettingsRow>
      </SettingsSection>
    </div>
  );
};
