import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { accessToken, folderId } = await req.json();

    if (!accessToken) {
      return NextResponse.json({ error: "Missing Google access token" }, { status: 400 });
    }

    const channelId = `ch_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://xcloud.app'}/api/webhooks/google-drive`;
    const expiration = Date.now() + (6 * 24 * 60 * 60 * 1000); // 6 days (max 7)

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${folderId || 'root'}/watch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        expiration: expiration.toString()
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: `Failed to register watch channel: ${errText}` }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, channelId, expiration, resourceId: data.resourceId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
