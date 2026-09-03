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
  hasSeenTour?: boolean;
  theme?: 'light' | 'dark';
  accentColor?: string;
  ghostBehavior?: 'random' | 'fixed' | 'draggable';
  lastSeenVersion?: string;
}

export interface CredentialFolder {
  id: string;
  name: string;
  color?: string;
}

export interface CustomField {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
}

export interface Credential {
  id: string;
  title: string;
  username: string;
  password?: string; // Optional if only using custom fields
  url?: string;
  folderId?: string;
  totpSecret?: string;
  customFields?: CustomField[];
}

export interface NoteFolder {
  id: string;
  name: string;
  parentId?: string; // For infinite nesting
  isExpanded?: boolean;
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subtasks: Subtask[];
  createdAt: number;
  dueDate?: number;
}

export interface VaultData {
  todos?: any[]; // legacy
  tasks?: Task[];
  credentials: Credential[];
  credentialFolders?: CredentialFolder[];
  notes?: Note[];
  noteFolders?: NoteFolder[];
  transactions?: Transaction[];
  wallets?: Wallet[];
  budgets?: Budget[];
  events?: CalendarEvent[];
  settings?: VaultSettings;
  activityLog?: Record<string, number>; // YYYY-MM-DD -> count
}

export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  folderId?: string;
}

export interface TransactionSplit {
  id: string;
  category: string;
  amount: number;
  memo?: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO string
  category: string;
  amount: number;
  type: 'in' | 'out';
  description?: string;
  walletId?: string;
  tags?: string[];
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  lastProcessed?: number;
  splits?: TransactionSplit[];
  memo?: string;
}

export interface Wallet {
  id: string;
  name: string;
  balance: number;
}

export interface Budget {
  category: string;
  limit: number;
}

export interface CalendarEvent {
  id: string;
  date: string; // ISO format or YYYY-MM-DD
  time?: string; // HH:MM
  title: string;
  description?: string;
  color?: 'blue' | 'red' | 'green' | 'yellow' | 'purple';
  recurring?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  notified?: boolean;
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

export async function importVault(payload: EncryptedPayload): Promise<void> {
  await invoke('save_vault', { payload });
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


