import { NextResponse } from 'next/server';
import { proxyPoolService } from '@/services/proxyPool';
import { isBrowserAvailable } from '@/services/browserRenderer';

// GET - Get system capabilities status
export async function GET() {
  try {
    const browserAvailable = await isBrowserAvailable();
    const proxyStatus = proxyPoolService.getStatus();

    return NextResponse.json({
      browser: {
        available: browserAvailable,
        engine: browserAvailable ? 'Playwright Chromium' : null,
      },
      proxy: proxyStatus,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch capabilities', details: (error as Error).message },
      { status: 500 }
    );
  }
}
