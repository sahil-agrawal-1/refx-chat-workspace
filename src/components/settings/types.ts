import React from 'react';

export type SettingsTab =
  | 'general'
  | 'appearance'
  | 'skills'
  | 'models'
  | 'memory'
  | 'workspace'
  | 'terminal'
  | 'security'
  | 'about';

export type SettingsCategory =
  | 'PREFERENCES'
  | 'AI CONFIGURATION'
  | 'DATA & WORKSPACE'
  | 'DEVELOPMENT'
  | 'INFORMATION';

export interface SettingsNavItem {
  id: SettingsTab;
  label: string;
  category: SettingsCategory;
  description: string;
  badge?: string;
}

export const SETTINGS_CATEGORIES: SettingsCategory[] = [
  'PREFERENCES',
  'AI CONFIGURATION',
  'DATA & WORKSPACE',
  'DEVELOPMENT',
  'INFORMATION',
];

export const SETTINGS_NAV_ITEMS: SettingsNavItem[] = [
  {
    id: 'general',
    label: 'General',
    category: 'PREFERENCES',
    description: 'Application startup, AI chat behavior, and general preferences.',
  },
  {
    id: 'appearance',
    label: 'Appearance',
    category: 'PREFERENCES',
    description: 'Theme, accent palette, interface density, and typography.',
  },
  {
    id: 'skills',
    label: 'Skills & Tools',
    category: 'AI CONFIGURATION',
    description: 'Local agent skills, guidelines, and tool capabilities.',
  },
  {
    id: 'models',
    label: 'Models & Providers',
    category: 'AI CONFIGURATION',
    description: 'Cloud LLM credentials and local runtime configurations.',
  },
  {
    id: 'memory',
    label: 'Memory Manager',
    category: 'DATA & WORKSPACE',
    description: 'Conversation context, persistent app knowledge, and governance.',
  },
  {
    id: 'workspace',
    label: 'Workspace & Files',
    category: 'DATA & WORKSPACE',
    description: 'Workspace root, file scanning exclusions, and backup bin.',
  },
  {
    id: 'terminal',
    label: 'Terminal & Shell',
    category: 'DEVELOPMENT',
    description: 'ConPTY pseudo-console, default shell, and session limits.',
  },
  {
    id: 'security',
    label: 'Security & Policies',
    category: 'DEVELOPMENT',
    description: 'Agent execution policies, permissions, and DPAPI protection.',
  },
  {
    id: 'about',
    label: 'About REFX',
    category: 'INFORMATION',
    description: 'Application build details, runtime specs, and shortcuts.',
  },
];
