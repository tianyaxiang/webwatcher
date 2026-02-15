import { NextResponse } from 'next/server';
import { schedulerService } from '@/services/scheduler';
import { storageService } from '@/services/storage';

// GET - Get scheduler status
export async function GET() {
  try {
    const status = schedulerService.getStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get scheduler status', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Control scheduler (start/stop/check-all)
export async function POST(request: Request) {
  try {
    const { action, targetId } = await request.json();
    
    switch (action) {
      case 'start':
        await schedulerService.start();
        return NextResponse.json({ success: true, message: 'Scheduler started' });
        
      case 'stop':
        schedulerService.stop();
        return NextResponse.json({ success: true, message: 'Scheduler stopped' });
        
      case 'check-all':
        // Trigger immediate check for all enabled targets
        const targets = await storageService.getTargets();
        const checkPromises = targets
          .filter(t => t.enabled)
          .map(t => schedulerService.checkTarget(t.id));
        
        await Promise.allSettled(checkPromises);
        return NextResponse.json({ 
          success: true, 
          message: `Checked ${checkPromises.length} targets` 
        });
        
      case 'check-one':
        if (!targetId) {
          return NextResponse.json(
            { error: 'targetId is required for check-one action' },
            { status: 400 }
          );
        }
        await schedulerService.checkTarget(targetId);
        return NextResponse.json({ success: true, message: 'Target checked' });
        
      case 'reschedule':
        // Reschedule a specific target (after settings change)
        if (!targetId) {
          return NextResponse.json(
            { error: 'targetId is required for reschedule action' },
            { status: 400 }
          );
        }
        const target = await storageService.getTarget(targetId);
        if (target) {
          schedulerService.scheduleTarget(target);
        }
        return NextResponse.json({ success: true, message: 'Target rescheduled' });
        
      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: start, stop, check-all, check-one, reschedule' },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Scheduler operation failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
