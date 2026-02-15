import { NextResponse } from 'next/server';
import { proxyPoolService } from '@/services/proxyPool';

// GET - Get proxy pool status
export async function GET() {
  return NextResponse.json(proxyPoolService.getStatus());
}

// POST - Manage proxy pool
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'add':
        proxyPoolService.addProxy({ url: body.url, label: body.label });
        return NextResponse.json({ success: true });

      case 'set':
        proxyPoolService.setProxies(body.proxies ?? []);
        return NextResponse.json({ success: true });

      case 'reset':
        proxyPoolService.resetFailures();
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to manage proxies', details: (error as Error).message },
      { status: 500 }
    );
  }
}
