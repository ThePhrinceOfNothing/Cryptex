import { invoke } from '@tauri-apps/api/core';
import {
  deriveKey,
  encryptData,
  decryptData,
  generateRandomBytes,
  bufferToBase64,
  base64ToBuffer
} from './crypto';
import type { EncryptedPayload } from './crypto';

export interface VaultSettings {
  workspaceName: string;
  subtitle: string;
  fontSize: 'Small' | 'Default' | 'Large';
  uiDensity: 'Comfortable' | 'Compact';
  autoLockTimer: '1 min' | '5 min' | '15 min' | 'Never';
  currency?: 'USD' | 'PHP' | 'EUR' | 'GBP' | 'JPY';
  avatarBase64?: string;
}

export interface VaultData {
  todos: any[];
  credentials: any[];
  notes?: Note[];
  transactions?: Transaction[];
  events?: CalendarEvent[];
  settings?: VaultSettings;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataBase64: string;
  addedAt: number;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  date: string;
  category: string;
  amount: number;
  type: 'in' | 'out';
}

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
}

export async function vaultExists(): Promise<boolean> {
  return await invoke('vault_exists');
}

export async function saveVaultWithKey(key: CryptoKey, salt: Uint8Array, data: VaultData): Promise<void> {
  const jsonString = JSON.stringify(data);
  const { iv, ciphertext } = await encryptData(jsonString, key);

  const payload: EncryptedPayload = {
    salt: bufferToBase64(salt.buffer as ArrayBuffer),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    ciphertext: bufferToBase64(ciphertext as ArrayBuffer)
  };

  await invoke('save_vault', { payload });
}

export async function saveVault(password: string, data: VaultData): Promise<{ key: CryptoKey, salt: Uint8Array }> {
  const salt = generateRandomBytes(16);
  const key = await deriveKey(password, salt);
  await saveVaultWithKey(key, salt, data);
  return { key, salt };
}

export async function deleteVault(): Promise<void> {
  await invoke('delete_vault');
}

export async function exportVault(key: CryptoKey, salt: Uint8Array, data: VaultData): Promise<void> {
  const jsonString = JSON.stringify(data);
  const { iv, ciphertext } = await encryptData(jsonString, key);
  
  const payload: EncryptedPayload = {
    salt: bufferToBase64(salt.buffer as ArrayBuffer),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    ciphertext: bufferToBase64(ciphertext as ArrayBuffer)
  };
  
  const jsonBlob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(jsonBlob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `zk-vault-backup-${new Date().toISOString().split('T')[0]}.vault`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function loadVaultPayload(): Promise<EncryptedPayload> {
  return await invoke('load_vault');
}

export async function loadVaultWithKey(key: CryptoKey, payload: EncryptedPayload): Promise<VaultData> {
  const ivBuffer = base64ToBuffer(payload.iv);
  const ciphertextBuffer = base64ToBuffer(payload.ciphertext);
  const jsonString = await decryptData(ciphertextBuffer, new Uint8Array(ivBuffer), key);
  return JSON.parse(jsonString) as VaultData;
}

export async function loadVault(password: string): Promise<{ data: VaultData, key: CryptoKey, salt: Uint8Array }> {
  const payload = await loadVaultPayload();
  const saltBuffer = base64ToBuffer(payload.salt);
  const salt = new Uint8Array(saltBuffer);
  const key = await deriveKey(password, salt);
  const data = await loadVaultWithKey(key, payload);
  return { data, key, salt };
}
