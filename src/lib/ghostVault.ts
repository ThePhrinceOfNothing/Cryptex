import { invoke } from '@tauri-apps/api/core';
import {
  deriveKey,
  generateRandomBytes,
  bufferToBase64,
  base64ToBuffer
} from './crypto';
import type { EncryptedPayload } from './crypto';

export interface GhostFileMeta {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  addedAt: number;
  iv: string; // base64
}

export interface GhostVaultIndexData {
  files: GhostFileMeta[];
  salt: string; // base64
  triggerWord?: string;
  createdAt: number;
}

export async function checkGhostVaultExists(): Promise<boolean> {
  return await invoke('ghost_vault_exists');
}

export async function initGhostVault(password: string, triggerWord: string = 'bazooka'): Promise<{ key: CryptoKey; index: GhostVaultIndexData }> {
  const salt = generateRandomBytes(16);
  const key = await deriveKey(password, salt);
  
  const index: GhostVaultIndexData = {
    files: [],
    salt: bufferToBase64(salt.buffer as ArrayBuffer),
    triggerWord: triggerWord.trim().toLowerCase() || 'bazooka',
    createdAt: Date.now()
  };

  await saveGhostVaultIndex(key, index);
  return { key, index };
}

export async function unlockGhostVault(password: string): Promise<{ key: CryptoKey; index: GhostVaultIndexData }> {
  const payload: EncryptedPayload | null = await invoke('load_ghost_index');
  if (!payload) {
    throw new Error('Ghost vault does not exist.');
  }

  const saltBuffer = base64ToBuffer(payload.salt);
  const salt = new Uint8Array(saltBuffer);
  const key = await deriveKey(password, salt);

  const ivBuffer = base64ToBuffer(payload.iv);
  const ciphertextBuffer = base64ToBuffer(payload.ciphertext);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBuffer) as any },
    key,
    ciphertextBuffer as any
  );

  const decoder = new TextDecoder();
  const jsonStr = decoder.decode(decryptedBuffer);
  const index: GhostVaultIndexData = JSON.parse(jsonStr);

  return { key, index };
}

export async function saveGhostVaultIndex(key: CryptoKey, index: GhostVaultIndexData): Promise<void> {
  const jsonString = JSON.stringify(index);
  const encoder = new TextEncoder();
  const encoded = encoder.encode(jsonString);

  const iv = generateRandomBytes(12);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    encoded as any
  );

  const payload: EncryptedPayload = {
    salt: index.salt,
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    ciphertext: bufferToBase64(ciphertext as ArrayBuffer)
  };

  await invoke('save_ghost_index', { payload });
}

export async function encryptAndStoreGhostFile(key: CryptoKey, file: File): Promise<GhostFileMeta> {
  const fileBytes = await file.arrayBuffer();
  const iv = generateRandomBytes(12);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    fileBytes as any
  );

  const id = 'ghost_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const encryptedBytes = new Uint8Array(ciphertext);

  // Send binary data directly to Tauri backend
  await invoke('save_ghost_file', {
    id,
    data: Array.from(encryptedBytes)
  });

  const meta: GhostFileMeta = {
    id,
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    addedAt: Date.now(),
    iv: bufferToBase64(iv.buffer as ArrayBuffer)
  };

  return meta;
}

export async function loadAndDecryptGhostFile(key: CryptoKey, meta: GhostFileMeta): Promise<Blob> {
  const encryptedRaw: number[] = await invoke('load_ghost_file', { id: meta.id });
  const encryptedBytes = new Uint8Array(encryptedRaw);

  const ivBytes = new Uint8Array(base64ToBuffer(meta.iv));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as any },
    key,
    encryptedBytes.buffer as any
  );

  return new Blob([decryptedBuffer], { type: meta.mimeType });
}

export async function removeGhostFile(id: string): Promise<void> {
  await invoke('delete_ghost_file', { id });
}

export async function wipeEntireGhostVault(): Promise<void> {
  await invoke('wipe_ghost_vault');
}
