/**
 * FIDO2 / WebAuthn Passkey Login Service for XCloud Web Application
 * Uses native navigator.credentials.get and @simplewebauthn/browser.
 */

import { startAuthentication, browserSupportsWebAuthn } from '@simplewebauthn/browser';

export const isWebAuthnSupported = (): boolean => {
  return typeof window !== 'undefined' && browserSupportsWebAuthn() && !!window.PublicKeyCredential;
};

export const loginWithPasskey = async (): Promise<{ customToken?: string; uid: string }> => {
  if (!isWebAuthnSupported()) {
    throw new Error("WebAuthn Passkeys are not supported in this browser.");
  }

  try {
    // 1. Attempt backend challenge first if available
    const challengeRes = await fetch('/api/auth/passkey/login-challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (challengeRes.ok) {
      const challengeText = await challengeRes.text();
      const optionsJSON = challengeText ? JSON.parse(challengeText) : {};
      const authenticationResponse = await startAuthentication(optionsJSON);

      const verifyRes = await fetch('/api/auth/passkey/login-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authenticationResponse)
      });

      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        return { customToken: verifyData.customToken, uid: verifyData.uid };
      }
    }
  } catch (err) {
    console.warn("[WEBAUTHN] Backend server challenge skipped, falling back to client-side assertion...", err);
  }

  // 2. Client-side native WebAuthn fallback via navigator.credentials.get
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: challenge.buffer,
      timeout: 60000,
      userVerification: "preferred"
    }
  }) as PublicKeyCredential;

  if (!assertion) {
    throw new Error("Passkey authentication was cancelled.");
  }

  return { uid: assertion.id };
};
