export interface WatchTarget {
  id: string;
  url: string;
  name: string;
  selector?: string; // CSS selector to monitor specific element
  checkInterval: CheckInterval;
  enabled: boolean;
  createdAt: string;
  lastCheckedAt?: string;
  lastChangedAt?: string;
  // Notification options
  notifyEmail?: string;
  notifyWebhook?: string;
  notifyTelegram?: string;
  notifyDiscord?: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  activeTargets: number;
}

export type CheckInterval = '5min' | '15min' | '30min' | '1hour' | '6hour' | '1day';

export interface PageSnapshot {
  id: string;
  targetId: string;
  content: string;
  contentHash: string;
  capturedAt: string;
  metadata: {
    title?: string;
    statusCode: number;
    responseTime: number;
  };
}

export interface ChangeRecord {
  id: string;
  targetId: string;
  previousSnapshotId: string;
  currentSnapshotId: string;
  detectedAt: string;
  changeType: 'content' | 'structure' | 'both';
  changeSummary?: string; // AI-generated summary
  diffHtml?: string;
  importance: 'low' | 'medium' | 'high';
  notified: boolean;
}

export interface MonitorStats {
  totalTargets: number;
  activeTargets: number;
  totalChanges: number;
  changesLast24h: number;
  lastCheckTime?: string;
}

export interface AIAnalysisResult {
  isSignificant: boolean;
  importance: 'low' | 'medium' | 'high';
  summary: string;
  keywords: string[];
  category: string;
}
