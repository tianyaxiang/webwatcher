import { NextResponse } from 'next/server';
import { storageService } from '@/services/storage';

// GET - Get a single snapshot with full content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const snapshot = await storageService.getSnapshot(id);
    
    if (!snapshot) {
      return NextResponse.json(
        { error: 'Snapshot not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(snapshot);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch snapshot', details: (error as Error).message },
      { status: 500 }
    );
  }
}
