import { invoke } from '@tauri-apps/api/core';

export interface AppConfig {
  workspaceName?: string;
  subtitle?: string;
  avatarBase64?: string;
  accentColor?: string;
  theme?: string;
}

export async function loadAppConfig(): Promise<AppConfig | null> {
  try {
    return await invoke<AppConfig | null>('load_config');
  } catch (error) {
    console.error('Failed to load app config:', error);
    return null;
  }
}

export async function saveAppConfig(config: AppConfig): Promise<void> {
  try {
    await invoke('save_config', { config });
  } catch (error) {
    console.error('Failed to save app config:', error);
    throw error;
  }
}

