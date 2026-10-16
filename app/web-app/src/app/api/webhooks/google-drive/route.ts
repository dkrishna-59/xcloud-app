import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const channelId = req.headers.get('x-goog-channel-id');
    const resourceState = req.headers.get('x-goog-resource-state');
    const channelToken = req.headers.get('x-goog-channel-token');

    console.log(`[WEBHOOK] Google Drive event received. Channel: ${channelId}, State: ${resourceState}`);

    if (resourceState === 'sync') {
      return NextResponse.json({ received: true, message: 'Sync handshake acknowledged' });
    }

    // Handle delta sync event (add, update, trash, change)
    // In production, fetch changes.list using startPageToken and broadcast via WebSockets / Supabase Realtime

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook processing error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
