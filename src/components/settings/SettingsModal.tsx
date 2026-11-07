import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { SettingsTab } from './types';
import { SettingsLayout } from './SettingsLayout';
import { GeneralSettings } from './sections/GeneralSettings';
import { AppearanceSettings } from './sections/AppearanceSettings';
import { SkillsSettings } from './sections/SkillsSettings';
import { ProvidersSettings } from './sections/ProvidersSettings';
import { MemorySettings } from './sections/MemorySettings';
import { WorkspaceSettings } from './sections/WorkspaceSettings';
import { TerminalSettings } from './sections/TerminalSettings';
import { SecuritySettings } from './sections/SecuritySettings';
import { AboutSettings } from './sections/AboutSettings';

export const SettingsModal: React.FC = () => {
  const { activeModal, closeModal } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  // Automatically switch tab when opened via specific modal actions
  useEffect(() => {
    if (activeModal === 'providers') {
      setActiveTab('models');
    } else if (activeModal === 'memory') {
      setActiveTab('memory');
    }
  }, [activeModal]);

  const isOpen =
    activeModal === 'settings' ||
    activeModal === 'providers' ||
    activeModal === 'memory';

  if (!isOpen) return null;

  return (
    <SettingsLayout
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      onClose={closeModal}
    >
      {activeTab === 'general' && <GeneralSettings />}
      {activeTab === 'appearance' && <AppearanceSettings />}
      {activeTab === 'skills' && <SkillsSettings />}
      {activeTab === 'models' && <ProvidersSettings />}
      {activeTab === 'memory' && <MemorySettings />}
      {activeTab === 'workspace' && <WorkspaceSettings />}
      {activeTab === 'terminal' && <TerminalSettings />}
      {activeTab === 'security' && <SecuritySettings />}
      {activeTab === 'about' && <AboutSettings />}
    </SettingsLayout>
  );
};
