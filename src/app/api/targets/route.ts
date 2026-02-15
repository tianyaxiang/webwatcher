import { NextResponse } from 'next/server';
import { storageService } from '@/services/storage';
import { webMonitorService } from '@/services/webMonitor';
import type { WatchTarget } from '@/types';

// GET - List all targets
export async function GET() {
  try {
    const targets = await storageService.getTargets();
    return NextResponse.json(targets);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch targets', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Add new target
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, name, selector, checkInterval, notifyEmail, notifyWebhook, renderMode, waitForSelector, proxy, templateId } = body;
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }
    
    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }
    
    const newTarget: WatchTarget = {
      id: `target_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      url,
      name: name || new URL(url).hostname,
      selector: selector || undefined,
      checkInterval: checkInterval || '1hour',
      enabled: true,
      createdAt: new Date().toISOString(),
      renderMode: renderMode || undefined,
      waitForSelector: waitForSelector || undefined,
      proxy: proxy || undefined,
      templateId: templateId || undefined,
      notifyEmail: notifyEmail || undefined,
      notifyWebhook: notifyWebhook || undefined,
    };
    
    // Take initial snapshot
    try {
      const pageData = await webMonitorService.fetchPage(url, selector, {
        renderMode: newTarget.renderMode,
        waitForSelector: newTarget.waitForSelector,
        proxy: newTarget.proxy,
      });
      const snapshot = {
        id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        targetId: newTarget.id,
        content: pageData.content,
        contentHash: webMonitorService.generateHash(pageData.content),
        capturedAt: new Date().toISOString(),
        metadata: {
          title: pageData.title,
          statusCode: pageData.statusCode,
          responseTime: pageData.responseTime,
        },
      };
      
      await storageService.saveSnapshot(snapshot);
      newTarget.lastCheckedAt = snapshot.capturedAt;
    } catch (error) {
      console.warn('Failed to take initial snapshot:', error);
    }
    
    await storageService.addTarget(newTarget);
    
    return NextResponse.json(newTarget, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add target', details: (error as Error).message },
      { status: 500 }
    );
  }
}
