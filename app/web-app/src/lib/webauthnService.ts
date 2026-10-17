/**
 * WebAuthn Passkey Authentication Client Service for XCloud Web Application
 * Uses @simplewebauthn/browser with safe JSON parsing.
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

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch (_) {
    throw new Error("Invalid response format from registration challenge server.");
  }

  if (!res.ok) {
    throw new Error(data.error || "Failed to generate registration challenge");
  }

  // 2. Invoke @simplewebauthn/browser registration ceremony
  const attestationResponse = await startRegistration(data);

  // 3. Verify on backend and store credential
  const verifyRes = await fetch('/api/auth/passkey/register-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, credential: attestationResponse })
  });

  const verifyText = await verifyRes.text();
  let verifyData: any = {};
  try {
    verifyData = verifyText ? JSON.parse(verifyText) : {};
  } catch (_) {
    throw new Error("Invalid response format from registration verification server.");
  }

  if (!verifyRes.ok) {
    throw new Error(verifyData.error || "Passkey registration verification failed");
  }

  return true;
};

export const authenticatePasskey = async (): Promise<{ customToken: string; uid: string }> => {
  if (!isPasskeySupported()) throw new Error("WebAuthn Passkeys are not supported in this browser.");

  // 1. Fetch authentication options challenge
  const res = await fetch('/api/auth/passkey/login-challenge', { method: 'POST' });
  const challengeText = await res.text();
  let optionsJSON: any = {};
  try {
    optionsJSON = challengeText ? JSON.parse(challengeText) : {};
  } catch (_) {
    throw new Error("Invalid response format from login challenge server.");
  }

  if (!res.ok) throw new Error(optionsJSON.error || "Failed to generate login challenge");

  // 2. Get credential assertion from browser authenticator
  const assertionResponse = await startAuthentication(optionsJSON);

  // 3. Verify assertion on backend and issue custom token
  const verifyRes = await fetch('/api/auth/passkey/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assertionResponse)
  });

  const verifyText = await verifyRes.text();
  let verifyData: any = {};
  try {
    verifyData = verifyText ? JSON.parse(verifyText) : {};
  } catch (_) {
    throw new Error("Invalid response format from login verification server.");
  }

  if (!verifyRes.ok) {
    throw new Error(verifyData.error || "Passkey login verification failed");
  }

  return { customToken: verifyData.customToken, uid: verifyData.uid };
};
