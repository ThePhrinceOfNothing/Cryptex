// Robust LSB (Least Significant Bit) Image Steganography

const MAGIC_HEADER = 'TXSTEGO:';

export async function embedSecretInImage(
  imageFile: File,
  secretText: string
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Encode payload: MAGIC + secretText
      const fullPayload = MAGIC_HEADER + secretText;
      const encoder = new TextEncoder();
      const payloadBytes = encoder.encode(fullPayload);
      const payloadLen = payloadBytes.length;

      // Capacity: 3 bits per pixel (R, G, B)
      const maxBytes = Math.floor((data.length / 4) * 3 / 8) - 4;
      if (payloadLen > maxBytes) {
        reject(new Error(`Secret text is too large for this image. Maximum capacity: ${maxBytes} bytes.`));
        return;
      }

      // 4 bytes for length prefix + payloadBytes
      const combined = new Uint8Array(4 + payloadLen);
      combined[0] = (payloadLen >> 24) & 0xff;
      combined[1] = (payloadLen >> 16) & 0xff;
      combined[2] = (payloadLen >> 8) & 0xff;
      combined[3] = payloadLen & 0xff;
      combined.set(payloadBytes, 4);

      // Embed bits into R, G, B channels
      let byteIdx = 0;
      let bitIdx = 7;

      for (let i = 0; i < data.length; i++) {
        // Skip alpha channel (every 4th byte: 3, 7, 11...)
        if (i % 4 === 3) continue;

        if (byteIdx < combined.length) {
          const bit = (combined[byteIdx] >> bitIdx) & 1;
          data[i] = (data[i] & ~1) | bit; // Clear LSB and write payload bit

          bitIdx--;
          if (bitIdx < 0) {
            bitIdx = 7;
            byteIdx++;
          }
        } else {
          break;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to encode image to PNG blob'));
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file.'));
    };

    img.src = url;
  });
}

export async function extractSecretFromImage(imageFile: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to create canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Read first 32 bits to extract length
      let payloadLen = 0;
      let bitCount = 0;
      let dataIdx = 0;

      while (bitCount < 32 && dataIdx < data.length) {
        if (dataIdx % 4 !== 3) {
          const bit = data[dataIdx] & 1;
          payloadLen = (payloadLen << 1) | bit;
          bitCount++;
        }
        dataIdx++;
      }

      const maxBytes = Math.floor((data.length / 4) * 3 / 8) - 4;
      if (payloadLen <= 0 || payloadLen > maxBytes) {
        reject(new Error('No hidden Tectoryx secret found in this image.'));
        return;
      }

      // Read payload bytes
      const payloadBytes = new Uint8Array(payloadLen);
      let curByte = 0;
      let bitInByte = 0;
      let byteIdx = 0;

      while (byteIdx < payloadLen && dataIdx < data.length) {
        if (dataIdx % 4 !== 3) {
          const bit = data[dataIdx] & 1;
          curByte = (curByte << 1) | bit;
          bitInByte++;

          if (bitInByte === 8) {
            payloadBytes[byteIdx] = curByte;
            byteIdx++;
            curByte = 0;
            bitInByte = 0;
          }
        }
        dataIdx++;
      }

      const decoder = new TextDecoder();
      const decodedText = decoder.decode(payloadBytes);

      if (!decodedText.startsWith(MAGIC_HEADER)) {
        reject(new Error('Image does not contain a valid Tectoryx steganographic payload.'));
        return;
      }

      resolve(decodedText.slice(MAGIC_HEADER.length));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image file.'));
    };

    img.src = url;
  });
}
