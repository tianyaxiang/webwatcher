import { NextResponse } from 'next/server';
import { storageService } from '@/services/storage';

// GET - List recent changes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const targetId = searchParams.get('targetId');
    
    let changes;
    
    if (targetId) {
      changes = await storageService.getChangesForTarget(targetId, limit);
    } else {
      changes = await storageService.getRecentChanges(limit);
    }
    
    // Enrich with target info
    const targets = await storageService.getTargets();
    const targetMap = new Map(targets.map(t => [t.id, t]));
    
    const enrichedChanges = changes.map(change => ({
      ...change,
      target: targetMap.get(change.targetId) || null,
    }));
    
    return NextResponse.json(enrichedChanges);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch changes', details: (error as Error).message },
      { status: 500 }
    );
  }
}
