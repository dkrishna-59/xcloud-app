/**
 * FIDO2 / WebAuthn Passkey Login Service for XCloud Web Application
 * Uses @simplewebauthn/browser for passwordless sign-in with safe JSON parsing.
 */

import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

export const isWebAuthnSupported = (): boolean => {
  return typeof window !== 'undefined' && browserSupportsWebAuthn();
};

export const loginWithPasskey = async (): Promise<{ customToken: string; uid: string }> => {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn Passkeys are not supported in this browser.");
  }

  // 1. Fetch login challenge options from backend
  const challengeRes = await fetch('/api/auth/passkey/login-challenge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const challengeText = await challengeRes.text();
  let optionsJSON: any = {};
  try {
    optionsJSON = challengeText ? JSON.parse(challengeText) : {};
  } catch (_) {
    throw new Error("Invalid response format from login challenge server.");
  }

  if (!challengeRes.ok) {
    throw new Error(optionsJSON.error || "Failed to generate passkey login challenge");
  }

  // 2. Trigger browser authenticator prompt (Touch ID, Windows Hello, Face ID, Security Key)
  const authenticationResponse = await startAuthentication(optionsJSON);

  // 3. Verify assertion on backend
  const verifyRes = await fetch('/api/auth/passkey/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authenticationResponse)
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
