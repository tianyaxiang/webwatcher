export type RenderMode = 'static' | 'browser';
export type ContentMode = 'html' | 'json';    // html=CSS selector, json=JSONPath

export interface ProxyConfig {
  url: string;       // e.g. http://user:pass@host:port or socks5://host:port
  label?: string;    // friendly name
}

export interface FetchConfig {
  headers?: Record<string, string>;   // Custom HTTP headers
  cookies?: string;                    // Cookie string: "key1=val1; key2=val2"
  userAgent?: string;                  // Custom User-Agent override
  contentMode?: ContentMode;           // 'html' (default) or 'json'
  jsonPath?: string;                   // JSONPath expression for json mode (e.g. "$.data.price")
  timeout?: number;                    // Request timeout in ms (default 30000)
}

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
  // Render mode
  renderMode?: RenderMode;    // 'static' (default) or 'browser' (Playwright)
  waitForSelector?: string;   // Wait for this selector before capturing (browser mode)
  // Deep fetch config
  fetchConfig?: FetchConfig;  // Custom headers, cookies, user-agent, JSON mode
  // Proxy
  proxy?: string;             // proxy URL or pool name
  // Template
  templateId?: string;        // ID of the template used to create this target
  // Notification options
  notifyEmail?: string;
  notifyWebhook?: string;
  notifyTelegram?: string;
  notifyDiscord?: string;
  notifyFeishu?: string;       // 飞书 webhook URL
  notifyWeCom?: string;        // 企业微信 webhook URL
  notifyServerChan?: string;   // Server酱 SendKey
}

export interface MonitorTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
  selector?: string;
  renderMode?: RenderMode;
  waitForSelector?: string;
  checkInterval: CheckInterval;
  icon?: string;              // emoji
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
