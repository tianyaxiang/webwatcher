import { NextResponse } from 'next/server';
import { schedulerService } from '@/services/scheduler';

// GET - Health check endpoint (no auth required)
export async function GET() {
  try {
    const schedulerStatus = schedulerService.getStatus();

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      scheduler: schedulerStatus,
      node: process.version,
      memory: {
        rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', error: (error as Error).message },
      { status: 500 }
    );
  }
}
