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
  thumbnail?: string; // base64 data URL (encrypted inside index)
  duration?: number; // duration in seconds
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

// Fallback MIME map when OS / browser leaves file.type empty (common on Windows for MKV/AVI/MOV)
const EXTENSION_MIME_MAP: Record<string, string> = {
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  csv: 'text/csv'
};

// In-memory zero-trace thumbnail generator for videos and images
export async function generateMediaThumbnail(file: File): Promise<{ thumbnail?: string; duration?: number }> {
  if (typeof document === 'undefined') return {};

  const name = file.name.toLowerCase();
  const mime = file.type || '';
  const isVideo = mime.startsWith('video/') || /\.(mp4|webm|mov|m4v|mkv|avi|wmv|flv)$/i.test(name);
  const isImage = mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(name);

  if (isVideo) {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;

      const blobUrl = URL.createObjectURL(file);
      video.src = blobUrl;

      let resolved = false;
      const cleanUp = () => {
        try {
          URL.revokeObjectURL(blobUrl);
          video.removeAttribute('src');
          video.load();
        } catch {}
      };

      const finish = (result: { thumbnail?: string; duration?: number }) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        cleanUp();
        resolve(result);
      };

      // 3.5s safety timeout if video codec cannot be decoded by browser canvas
      const timer = setTimeout(() => {
        finish({});
      }, 3500);

      video.onloadedmetadata = () => {
        const dur = video.duration || 0;
        // Seek to 10% of video (or 0.5s if short) to avoid black intro frames
        const targetTime = Math.min(Math.max(dur * 0.1, 0.5), dur > 1 ? dur - 0.5 : 0);
        video.currentTime = targetTime;
      };

      video.onseeked = () => {
        try {
          const maxDim = 320;
          let w = video.videoWidth || 320;
          let h = video.videoHeight || 180;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, w, h);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.65);
            finish({ thumbnail, duration: video.duration || undefined });
            return;
          }
        } catch (e) {
          console.warn('Canvas thumbnail extraction failed:', e);
        }
        finish({ duration: video.duration || undefined });
      };

      video.onerror = () => {
        finish({});
      };
    });
  }

  if (isImage) {
    return new Promise((resolve) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(file);
      img.src = blobUrl;

      let resolved = false;
      const cleanUp = () => {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
      };

      const finish = (result: { thumbnail?: string }) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timer);
        cleanUp();
        resolve(result);
      };

      const timer = setTimeout(() => {
        finish({});
      }, 2500);

      img.onload = () => {
        try {
          const maxDim = 320;
          let w = img.naturalWidth || 320;
          let h = img.naturalHeight || 180;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, w, h);
            const thumbnail = canvas.toDataURL('image/jpeg', 0.65);
            finish({ thumbnail });
            return;
          }
        } catch (e) {
          console.warn('Image thumbnail extraction failed:', e);
        }
        finish({});
      };

      img.onerror = () => {
        finish({});
      };
    });
  }

  return {};
}

export async function encryptAndStoreGhostFile(
  key: CryptoKey,
  file: File,
  onProgress?: (ratio: number) => void
): Promise<GhostFileMeta> {
  const fileBytes = await file.arrayBuffer();
  const iv = generateRandomBytes(12);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as any },
    key,
    fileBytes as any
  );

  const id = 'ghost_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  const encryptedBytes = new Uint8Array(ciphertext);

  // Send binary data directly to Tauri backend using raw binary streaming
  const CHUNK_SIZE = 16 * 1024 * 1024; // 16 MB chunks
  if (encryptedBytes.byteLength <= CHUNK_SIZE) {
    await invoke('save_ghost_file', encryptedBytes, {
      headers: {
        'x-file-id': id,
        'x-append': '0'
      }
    });
    if (onProgress) onProgress(1.0);
  } else {
    let offset = 0;
    let isAppend = false;
    while (offset < encryptedBytes.byteLength) {
      const end = Math.min(offset + CHUNK_SIZE, encryptedBytes.byteLength);
      const chunk = encryptedBytes.subarray(offset, end);
      await invoke('save_ghost_file', chunk, {
        headers: {
          'x-file-id': id,
          'x-append': isAppend ? '1' : '0'
        }
      });
      isAppend = true;
      offset = end;
      if (onProgress) onProgress(offset / encryptedBytes.byteLength);
    }
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  const resolvedMime = file.type || EXTENSION_MIME_MAP[ext] || 'application/octet-stream';

  // Extract media thumbnail & duration in-memory
  let thumbnail: string | undefined;
  let duration: number | undefined;
  try {
    const media = await generateMediaThumbnail(file);
    thumbnail = media.thumbnail;
    duration = media.duration;
  } catch (err) {
    console.warn('Media thumbnail generation failed:', err);
  }

  const meta: GhostFileMeta = {
    id,
    name: file.name,
    size: file.size,
    mimeType: resolvedMime,
    addedAt: Date.now(),
    iv: bufferToBase64(iv.buffer as ArrayBuffer),
    thumbnail,
    duration
  };

  return meta;
}

export async function loadAndDecryptGhostFile(key: CryptoKey, meta: GhostFileMeta): Promise<Blob> {
  const rawResponse = await invoke<ArrayBuffer | Uint8Array>('load_ghost_file', { id: meta.id });
  const encryptedBytes = rawResponse instanceof Uint8Array 
    ? rawResponse 
    : new Uint8Array(rawResponse);

  const ivBytes = new Uint8Array(base64ToBuffer(meta.iv));

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes as any },
    key,
    encryptedBytes
  );

  return new Blob([decryptedBuffer], { type: meta.mimeType });
}

export async function removeGhostFile(id: string): Promise<void> {
  await invoke('delete_ghost_file', { id });
}

export async function wipeEntireGhostVault(): Promise<void> {
  await invoke('wipe_ghost_vault');
}
