import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const challengeBytes = window.crypto.getRandomValues(new Uint8Array(32));
    const challenge = Buffer.from(challengeBytes).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    const options = {
      challenge,
      timeout: 60000,
      rpId: "localhost",
      userVerification: "required"
    };

    return NextResponse.json(options);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
