import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import './test-shim';
import { AppProvider, useAppStore } from './app-store';
import { SettingsModal } from '@/components/settings/SettingsModal';
import {
  SETTINGS_CATEGORIES,
  SETTINGS_NAV_ITEMS,
  SettingsTab,
} from '@/components/settings/types';

test('Settings redesign architecture and navigation metadata', () => {
  // Check categories match the specification exactly
  assert.deepEqual(SETTINGS_CATEGORIES, [
    'PREFERENCES',
    'AI CONFIGURATION',
    'DATA & WORKSPACE',
    'DEVELOPMENT',
    'INFORMATION',
  ]);

  // Check all 9 tabs are present
  const tabIds = SETTINGS_NAV_ITEMS.map((i) => i.id);
  assert.deepEqual(tabIds, [
    'general',
    'appearance',
    'skills',
    'models',
    'memory',
    'workspace',
    'terminal',
    'security',
    'about',
  ]);

  // Check category grouping
  const preferencesTabs = SETTINGS_NAV_ITEMS.filter((i) => i.category === 'PREFERENCES').map((i) => i.id);
  assert.deepEqual(preferencesTabs, ['general', 'appearance']);

  const aiConfigTabs = SETTINGS_NAV_ITEMS.filter((i) => i.category === 'AI CONFIGURATION').map((i) => i.id);
  assert.deepEqual(aiConfigTabs, ['skills', 'models']);

  const dataWorkspaceTabs = SETTINGS_NAV_ITEMS.filter((i) => i.category === 'DATA & WORKSPACE').map((i) => i.id);
  assert.deepEqual(dataWorkspaceTabs, ['memory', 'workspace']);

  const developmentTabs = SETTINGS_NAV_ITEMS.filter((i) => i.category === 'DEVELOPMENT').map((i) => i.id);
  assert.deepEqual(developmentTabs, ['terminal', 'security']);

  const informationTabs = SETTINGS_NAV_ITEMS.filter((i) => i.category === 'INFORMATION').map((i) => i.id);
  assert.deepEqual(informationTabs, ['about']);
});

test('SettingsModal renders under AppProvider without runtime exceptions', async () => {
  const container = (globalThis as any).document.createElement('div');
  const root = createRoot(container);

  let openSettingsModal: any;

  function Inner() {
    const { openModal } = useAppStore();
    openSettingsModal = openModal;
    return <SettingsModal />;
  }

  function TestHarness() {
    return (
      <AppProvider>
        <Inner />
      </AppProvider>
    );
  }

  await act(async () => {
    root.render(<TestHarness />);
  });

  // Verify modal is not rendered when inactive
  assert.equal(container.childNodes.length, 0);

  // Open modal
  await act(async () => {
    openSettingsModal('settings');
  });

  // Modal is now mounted in the container
  assert.ok(container.childNodes.length > 0);

  // Clean up
  await act(async () => {
    root.unmount();
  });
});
