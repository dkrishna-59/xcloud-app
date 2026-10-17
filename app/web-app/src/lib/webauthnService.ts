/**
 * WebAuthn Passkey Authentication Client Service for XCloud Web Application
 * Uses @simplewebauthn/browser.
 */

import { startRegistration, startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

export const isPasskeySupported = (): boolean => {
  return typeof window !== 'undefined' && browserSupportsWebAuthn();
};

export const registerPasskey = async (userId: string, email: string, displayName: string): Promise<boolean> => {
  if (!isPasskeySupported()) throw new Error("WebAuthn Passkeys are not supported in this browser.");

  // 1. Fetch registration challenge options from backend
  const res = await fetch('/api/auth/passkey/register-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, email, displayName })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || "Failed to generate registration challenge");
  }

  const optionsJSON = await res.json();

  // 2. Invoke @simplewebauthn/browser registration ceremony
  const attestationResponse = await startRegistration(optionsJSON);

  // 3. Verify on backend and store credential
  const verifyRes = await fetch('/api/auth/passkey/register-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, credential: attestationResponse })
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
  const optionsJSON = await res.json();

  // 2. Get credential assertion from browser authenticator
  const assertionResponse = await startAuthentication(optionsJSON);

  // 3. Verify assertion on backend and issue custom token
  const verifyRes = await fetch('/api/auth/passkey/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertionResponse)
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    throw new Error(err.error || "Passkey login verification failed");
  }

  const data = await verifyRes.json();
  return { customToken: data.customToken, uid: data.uid };
};
