/**
 * FIDO2 / WebAuthn Passkey Login Service for XCloud Web Application
 * Uses @simplewebauthn/browser for passwordless sign-in.
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

  if (!challengeRes.ok) {
    throw new Error("Failed to generate passkey login challenge");
  }

  const optionsJSON = await challengeRes.json();

  // 2. Trigger browser authenticator prompt (Touch ID, Windows Hello, Face ID, Security Key)
  const authenticationResponse = await startAuthentication(optionsJSON);

  // 3. Verify assertion on backend
  const verifyRes = await fetch('/api/auth/passkey/login-verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authenticationResponse)
  });

  if (!verifyRes.ok) {
    const err = await verifyRes.json();
    throw new Error(err.error || "Passkey authentication verification failed");
  }

  const data = await verifyRes.json();
  return { customToken: data.customToken, uid: data.uid };
};
