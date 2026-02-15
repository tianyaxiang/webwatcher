import { NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { webMonitorService } from '@/services/webMonitor';

// GET - Get single target
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const target = await storageService.getTarget(id);
    
    if (!target) {
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      );
    }
    
    // Get recent changes for this target
    const changes = await storageService.getChangesForTarget(id, 10);
    
    return NextResponse.json({ target, changes });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch target', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT - Update target
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const updated = await storageService.updateTarget(id, body);
    
    if (!updated) {
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update target', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE - Remove target
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await storageService.deleteTarget(id);
    
    if (!deleted) {
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete target', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Trigger manual check for this target
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const target = await storageService.getTarget(id);
    
    if (!target) {
      return NextResponse.json(
        { error: 'Target not found' },
        { status: 404 }
      );
    }
    
    // Fetch current page
    const pageData = await webMonitorService.fetchPage(target.url, target.selector);
    
    // Create new snapshot
    const currentSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      targetId: target.id,
      content: pageData.content,
      contentHash: webMonitorService.generateHash(pageData.content),
      capturedAt: new Date().toISOString(),
      metadata: {
        title: pageData.title,
        statusCode: pageData.statusCode,
        responseTime: pageData.responseTime,
      },
    };
    
    // Get previous snapshot
    const previousSnapshot = await storageService.getLatestSnapshot(target.id);
    
    let changeDetected = false;
    let changeRecord = null;
    
    if (previousSnapshot) {
      const { hasChanged, changeType, diffText } = webMonitorService.detectChanges(
        previousSnapshot,
        currentSnapshot
      );
      
      if (hasChanged) {
        changeDetected = true;
        
        // Analyze change with AI
        const analysis = await webMonitorService.analyzeChange(
          previousSnapshot.content,
          currentSnapshot.content,
          target.name
        );
        
        changeRecord = {
          id: `change_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          targetId: target.id,
          previousSnapshotId: previousSnapshot.id,
          currentSnapshotId: currentSnapshot.id,
          detectedAt: new Date().toISOString(),
          changeType,
          changeSummary: analysis.summary,
          diffHtml: diffText,
          importance: analysis.importance,
          notified: false,
        };
        
        await storageService.saveChange(changeRecord);
        
        // Update target last changed time
        await storageService.updateTarget(target.id, {
          lastChangedAt: changeRecord.detectedAt,
        });
      }
    }
    
    // Save current snapshot
    await storageService.saveSnapshot(currentSnapshot);
    
    // Update target last checked time
    await storageService.updateTarget(target.id, {
      lastCheckedAt: currentSnapshot.capturedAt,
    });
    
    return NextResponse.json({
      success: true,
      changeDetected,
      change: changeRecord,
      snapshot: {
        id: currentSnapshot.id,
        capturedAt: currentSnapshot.capturedAt,
        contentLength: currentSnapshot.content.length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check target', details: (error as Error).message },
      { status: 500 }
    );
  }
}
