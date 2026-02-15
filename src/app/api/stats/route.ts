import { NextResponse } from 'next/server';
import { storageService } from '@/services/storage';

// GET - Get monitoring stats
export async function GET() {
  try {
    const stats = await storageService.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: (error as Error).message },
      { status: 500 }
    );
  }
}
