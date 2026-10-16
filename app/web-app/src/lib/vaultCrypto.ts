/**
 * Zero-Knowledge Client-Side Encrypted Vault Engine
 * Uses Web Crypto API (PBKDF2-SHA256, AES-GCM-256).
 */

export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

export const generateSalt = (): Uint8Array => {
  return window.crypto.getRandomValues(new Uint8Array(16));
};

export const deriveMasterKey = async (passphrase: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(passphrase),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export interface EncryptedVaultPayload {
  encryptedBlob: Blob;
  iv: string; // Base64 encoded 12-byte IV
}

export const encryptFile = async (file: File, key: CryptoKey): Promise<EncryptedVaultPayload> => {
  const arrayBuffer = await file.arrayBuffer();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    arrayBuffer
  );

  const encryptedBlob = new Blob([ciphertext], { type: 'application/octet-stream' });
  return {
    encryptedBlob,
    iv: arrayBufferToBase64(iv.buffer)
  };
};

export const decryptFile = async (encryptedBlob: Blob, ivBase64: string, key: CryptoKey, mimeType: string): Promise<File> => {
  const ciphertextBuffer = await encryptedBlob.arrayBuffer();
  const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertextBuffer
  );

  return new File([decryptedBuffer], 'decrypted_file', { type: mimeType });
};

/**
 * Encrypts and decrypts a test canary string to verify if the entered passphrase / master key is correct.
 */
export const verifyPassphraseCanary = async (key: CryptoKey, encryptedCanary?: string, ivBase64?: string): Promise<{ isValid: boolean; newCanary?: string; newIv?: string }> => {
  const canaryTestString = "XCLOUD_ZERO_KNOWLEDGE_VAULT_CANARY_VERIFIED";
  const enc = new TextEncoder();

  if (!encryptedCanary || !ivBase64) {
    // Generate new canary
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(canaryTestString));
    return {
      isValid: true,
      newCanary: arrayBufferToBase64(ciphertext),
      newIv: arrayBufferToBase64(iv.buffer)
    };
  }

  try {
    const ciphertextBuffer = base64ToArrayBuffer(encryptedCanary);
    const iv = new Uint8Array(base64ToArrayBuffer(ivBase64));
    const decryptedBuffer = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertextBuffer);
    const decoded = new TextDecoder().decode(decryptedBuffer);
    return { isValid: decoded === canaryTestString };
  } catch (e) {
    return { isValid: false };
  }
};
