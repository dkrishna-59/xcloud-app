/**
 * WebAuthn Passkey Authentication Client Service for XCloud Web Application
 * Uses native browser navigator.credentials API.
 */

export const bufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

export const base64ToBuffer = (base64: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(b64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer;
};

export const isPasskeySupported = (): boolean => {
  return typeof window !== 'undefined' && window.PublicKeyCredential !== undefined;
};

export const registerPasskey = async (userId: string, email: string, displayName: string): Promise<boolean> => {
  if (!isPasskeySupported()) throw new Error("WebAuthn Passkeys are not supported in this browser.");

  // 1. Fetch registration challenge options from backend
  const res = await fetch('/api/auth/passkey/register-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, displayName })
  });
  if (!res.ok) throw new Error("Failed to generate registration challenge");
  const options = await res.json();

  // Convert base64 strings to ArrayBuffers for WebAuthn API
  options.challenge = base64ToBuffer(options.challenge);
  options.user.id = base64ToBuffer(options.user.id);
  if (options.excludeCredentials) {
    options.excludeCredentials = options.excludeCredentials.map((c: any) => ({
      ...c,
      id: base64ToBuffer(c.id)
    }));
  }

  // 2. Invoke browser credential creation
  const credential = (await navigator.credentials.create({ publicKey: options })) as PublicKeyCredential;
  if (!credential) throw new Error("Passkey creation cancelled or failed.");

  const response = credential.response as AuthenticatorAttestationResponse;

  const credentialPayload = {
    id: credential.id,
    rawId: bufferToBase64(credential.rawId),
    type: credential.type,
    response: {
      clientDataJSON: bufferToBase64(response.clientDataJSON),
      attestationObject: bufferToBase64(response.attestationObject),
      transports: response.getTransports ? response.getTransports() : []
    }
  };

  // 3. Verify on backend and store credential
  const verifyRes = await fetch('/api/auth/passkey/register-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, credential: credentialPayload })
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    throw new Error(err.error || "Passkey registration verification failed");
  }

  return true;
};

export const authenticatePasskey = async (): Promise<{ customToken: string; uid: string }> => {
  if (!isPasskeySupported()) throw new Error("WebAuthn Passkeys are not supported in this browser.");

  // 1. Fetch authentication options challenge
  const res = await fetch('/api/auth/passkey/login-challenge', { method: 'POST' });
  if (!res.ok) throw new Error("Failed to generate login challenge");
  const options = await res.json();

  options.challenge = base64ToBuffer(options.challenge);
  if (options.allowCredentials) {
    options.allowCredentials = options.allowCredentials.map((c: any) => ({
      ...c,
      id: base64ToBuffer(c.id)
    }));
  }

  // 2. Get credential assertion from browser authenticator
  const assertion = (await navigator.credentials.get({ publicKey: options })) as PublicKeyCredential;
  if (!assertion) throw new Error("Passkey authentication cancelled.");

  const response = assertion.response as AuthenticatorAssertionResponse;

  const assertionPayload = {
    id: assertion.id,
    rawId: bufferToBase64(assertion.rawId),
    type: assertion.type,
    response: {
      clientDataJSON: bufferToBase64(response.clientDataJSON),
      authenticatorData: bufferToBase64(response.authenticatorData),
      signature: bufferToBase64(response.signature),
      userHandle: response.userHandle ? bufferToBase64(response.userHandle) : null
    }
  };

  // 3. Verify assertion on backend and issue custom token
  const verifyRes = await fetch('/api/auth/passkey/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credential: assertionPayload })
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    throw new Error(err.error || "Passkey login verification failed");
  }

  const data = await verifyRes.json();
  return { customToken: data.customToken, uid: data.uid };
};
