import { NextResponse } from 'next/server';
import { storageService } from '@/services/storage';

// GET - List snapshots for a target
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetId = searchParams.get('targetId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    
    if (!targetId) {
      return NextResponse.json(
        { error: 'targetId is required' },
        { status: 400 }
      );
    }
    
    const snapshots = await storageService.getSnapshotsForTarget(targetId, limit);
    
    // Return lightweight list (without full content to save bandwidth)
    const list = snapshots.map(s => ({
      id: s.id,
      targetId: s.targetId,
      contentHash: s.contentHash,
      contentLength: s.content.length,
      capturedAt: s.capturedAt,
      metadata: s.metadata,
    }));
    
    return NextResponse.json(list);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch snapshots', details: (error as Error).message },
      { status: 500 }
    );
  }
}
