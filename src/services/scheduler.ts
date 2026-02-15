import type { CheckInterval, WatchTarget } from '@/types';
import { storageService } from './storage';
import { webMonitorService } from './webMonitor';
import { notificationService } from './notification';

// Interval mapping to milliseconds
const INTERVAL_MS: Record<CheckInterval, number> = {
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '6hour': 6 * 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
};

class SchedulerService {
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;
  private checkInProgress: Set<string> = new Set();
  
  /**
   * Start the scheduler
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log('[Scheduler] Starting...');
    
    // Load all targets and schedule them
    const targets = await storageService.getTargets();
    for (const target of targets) {
      if (target.enabled) {
        this.scheduleTarget(target);
      }
    }
    
    console.log(`[Scheduler] Started with ${targets.filter(t => t.enabled).length} active targets`);
  }
  
  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) return;
    
    console.log('[Scheduler] Stopping...');
    
    // Clear all timers
    for (const [id, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();
    this.isRunning = false;
    
    console.log('[Scheduler] Stopped');
  }
  
  /**
   * Schedule a single target
   */
  scheduleTarget(target: WatchTarget): void {
    // Clear existing timer if any
    this.unscheduleTarget(target.id);
    
    if (!target.enabled) return;
    
    const intervalMs = INTERVAL_MS[target.checkInterval] || INTERVAL_MS['1hour'];
    
    console.log(`[Scheduler] Scheduling ${target.name} every ${target.checkInterval}`);
    
    // Run check immediately if never checked or last check was too long ago
    const shouldCheckNow = !target.lastCheckedAt || 
      (Date.now() - new Date(target.lastCheckedAt).getTime() > intervalMs);
    
    if (shouldCheckNow) {
      this.checkTarget(target.id);
    }
    
    // Set up interval
    const timer = setInterval(() => {
      this.checkTarget(target.id);
    }, intervalMs);
    
    this.timers.set(target.id, timer);
  }
  
  /**
   * Unschedule a target
   */
  unscheduleTarget(targetId: string): void {
    const timer = this.timers.get(targetId);
    if (timer) {
      clearInterval(timer);
      this.timers.delete(targetId);
      console.log(`[Scheduler] Unscheduled target ${targetId}`);
    }
  }
  
  /**
   * Check a target for changes
   */
  async checkTarget(targetId: string): Promise<void> {
    // Prevent concurrent checks for same target
    if (this.checkInProgress.has(targetId)) {
      console.log(`[Scheduler] Check already in progress for ${targetId}, skipping`);
      return;
    }
    
    this.checkInProgress.add(targetId);
    
    try {
      const target = await storageService.getTarget(targetId);
      if (!target || !target.enabled) {
        this.unscheduleTarget(targetId);
        return;
      }
      
      console.log(`[Scheduler] Checking ${target.name}...`);
      
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
      
      if (previousSnapshot) {
        const { hasChanged, changeType, diffText } = webMonitorService.detectChanges(
          previousSnapshot,
          currentSnapshot
        );
        
        if (hasChanged) {
          console.log(`[Scheduler] Change detected for ${target.name}`);
          
          // Analyze change with AI
          const analysis = await webMonitorService.analyzeChange(
            previousSnapshot.content,
            currentSnapshot.content,
            target.name
          );
          
          // Only process significant changes
          if (analysis.isSignificant) {
            const changeRecord = {
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
            
            // Send notifications
            await this.sendNotifications(target, changeRecord, analysis);
          } else {
            console.log(`[Scheduler] Change for ${target.name} filtered as noise`);
          }
        }
      }
      
      // Save current snapshot
      await storageService.saveSnapshot(currentSnapshot);
      
      // Update target last checked time
      await storageService.updateTarget(target.id, {
        lastCheckedAt: currentSnapshot.capturedAt,
      });
      
      console.log(`[Scheduler] Check complete for ${target.name}`);
      
    } catch (error) {
      console.error(`[Scheduler] Error checking ${targetId}:`, error);
    } finally {
      this.checkInProgress.delete(targetId);
    }
  }
  
  /**
   * Send notifications for a change
   */
  private async sendNotifications(
    target: WatchTarget,
    change: any,
    analysis: any
  ): Promise<void> {
    const notifications: Promise<void>[] = [];
    
    // Email notification
    if (target.notifyEmail) {
      notifications.push(
        notificationService.sendEmail({
          to: target.notifyEmail,
          subject: `[WebWatcher] ${target.name} 内容已变化`,
          html: this.generateEmailHtml(target, change, analysis),
        })
      );
    }
    
    // Webhook notification
    if (target.notifyWebhook) {
      notifications.push(
        notificationService.sendWebhook(target.notifyWebhook, {
          event: 'page_changed',
          target: {
            id: target.id,
            name: target.name,
            url: target.url,
          },
          change: {
            id: change.id,
            importance: change.importance,
            summary: change.changeSummary,
            detectedAt: change.detectedAt,
          },
        })
      );
    }
    
    if (notifications.length > 0) {
      await Promise.allSettled(notifications);
      
      // Mark change as notified
      // Note: In a real implementation, update the change record
      console.log(`[Scheduler] Notifications sent for ${target.name}`);
    }
  }
  
  /**
   * Generate email HTML content
   */
  private generateEmailHtml(target: WatchTarget, change: any, analysis: any): string {
    const importanceColors = {
      high: '#ef4444',
      medium: '#f59e0b',
      low: '#6b7280',
    };
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; }
          .card { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; }
          .importance { display: inline-block; padding: 4px 8px; border-radius: 4px; color: white; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h2>🔔 网页内容变化通知</h2>
        
        <div class="card">
          <h3>${target.name}</h3>
          <p><a href="${target.url}">${target.url}</a></p>
          <p>
            <span class="importance" style="background: ${importanceColors[change.importance as keyof typeof importanceColors]}">
              ${change.importance === 'high' ? '重要变化' : change.importance === 'medium' ? '一般变化' : '轻微变化'}
            </span>
          </p>
        </div>
        
        <div class="card">
          <h4>变化摘要</h4>
          <p>${change.changeSummary || '检测到内容变化'}</p>
        </div>
        
        <p>检测时间: ${new Date(change.detectedAt).toLocaleString('zh-CN')}</p>
        
        <p>
          <a href="${target.url}" class="button">查看页面</a>
        </p>
        
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 12px;">
          此邮件由 WebWatcher 自动发送
        </p>
      </body>
      </html>
    `;
  }
  
  /**
   * Get scheduler status
   */
  getStatus(): { isRunning: boolean; activeTargets: number } {
    return {
      isRunning: this.isRunning,
      activeTargets: this.timers.size,
    };
  }
}

export const schedulerService = new SchedulerService();
