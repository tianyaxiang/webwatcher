import * as cheerio from 'cheerio';
import crypto from 'crypto';
import * as diff from 'diff';
import type { WatchTarget, PageSnapshot, ChangeRecord, AIAnalysisResult, RenderMode, FetchConfig } from '@/types';
import { browserFetchPage, isBrowserAvailable } from './browserRenderer';
import { proxyPoolService } from './proxyPool';

// Predefined User-Agent strings
const USER_AGENTS: Record<string, string> = {
  default: 'WebWatcher/1.0 (https://webwatcher.dev)',
  chrome: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  firefox: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  safari: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  mobile: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  googlebot: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
};

export interface FetchPageOptions {
  url: string;
  selector?: string;
  renderMode?: RenderMode;
  waitForSelector?: string;
  proxy?: string;
  fetchConfig?: FetchConfig;
}

export class WebMonitorService {
  /**
   * Fetch and parse a web page (auto-selects static or browser mode)
   */
  async fetchPage(url: string, selector?: string, opts?: Partial<FetchPageOptions>): Promise<{
    content: string;
    title: string;
    statusCode: number;
    responseTime: number;
  }> {
    const renderMode = opts?.renderMode ?? 'static';
    const proxy = opts?.proxy ?? (proxyPoolService.size > 0 ? proxyPoolService.getNext() : undefined);
    const fetchConfig = opts?.fetchConfig;

    // Use Playwright for browser mode
    if (renderMode === 'browser') {
      const available = await isBrowserAvailable();
      if (!available) {
        console.warn('[WebMonitor] Playwright not available, falling back to static mode');
      } else {
        try {
          const result = await browserFetchPage({
            url,
            selector,
            waitForSelector: opts?.waitForSelector,
            proxy: proxy ?? undefined,
          });
          if (proxy) proxyPoolService.reportSuccess(proxy);
          return result;
        } catch (error) {
          if (proxy) proxyPoolService.reportFailure(proxy);
          throw error;
        }
      }
    }

    // JSON API mode
    if (fetchConfig?.contentMode === 'json') {
      return this.fetchPageJson(url, fetchConfig, proxy ?? undefined);
    }

    // Static HTML mode (default)
    return this.fetchPageStatic(url, selector, proxy ?? undefined, fetchConfig);
  }

  /**
   * Resolve the User-Agent string from config
   */
  private resolveUserAgent(fetchConfig?: FetchConfig): string {
    if (!fetchConfig?.userAgent) return USER_AGENTS.default;
    // If it's a preset name, use the preset
    if (USER_AGENTS[fetchConfig.userAgent.toLowerCase()]) {
      return USER_AGENTS[fetchConfig.userAgent.toLowerCase()];
    }
    // Otherwise treat as a custom UA string
    return fetchConfig.userAgent;
  }

  /**
   * Build headers from fetchConfig
   */
  private buildHeaders(fetchConfig?: FetchConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.resolveUserAgent(fetchConfig),
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'zh-CN,zh;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    // Merge custom headers
    if (fetchConfig?.headers) {
      Object.assign(headers, fetchConfig.headers);
    }

    // Set cookies
    if (fetchConfig?.cookies) {
      headers['Cookie'] = fetchConfig.cookies;
    }

    return headers;
  }

  /**
   * Fetch JSON API and extract data using JSONPath-like syntax
   */
  private async fetchPageJson(url: string, fetchConfig: FetchConfig, proxy?: string): Promise<{
    content: string;
    title: string;
    statusCode: number;
    responseTime: number;
  }> {
    const startTime = Date.now();

    try {
      const headers = this.buildHeaders(fetchConfig);
      headers['Accept'] = 'application/json, */*';

      const response = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(fetchConfig.timeout || 30000),
      });

      const responseTime = Date.now() - startTime;
      const json = await response.json();

      let content: string;

      if (fetchConfig.jsonPath) {
        // Simple JSONPath implementation
        content = this.extractJsonPath(json, fetchConfig.jsonPath);
      } else {
        // Return formatted JSON
        content = JSON.stringify(json, null, 2);
      }

      if (proxy) proxyPoolService.reportSuccess(proxy);

      return {
        content,
        title: `JSON API: ${new URL(url).hostname}`,
        statusCode: response.status,
        responseTime,
      };
    } catch (error) {
      if (proxy) proxyPoolService.reportFailure(proxy);
      throw new Error(`Failed to fetch JSON API: ${(error as Error).message}`);
    }
  }

  /**
   * Simple JSONPath extractor
   * Supports: $.key.nested, $.array[0], $.array[*].field
   */
  private extractJsonPath(data: any, path: string): string {
    try {
      // Remove leading $. if present
      const cleanPath = path.startsWith('$.') ? path.slice(2) : path.startsWith('$') ? path.slice(1) : path;

      if (!cleanPath) return JSON.stringify(data, null, 2);

      const parts = cleanPath.split(/\.|\[|\]/).filter(Boolean);
      let current: any = data;

      for (const part of parts) {
        if (current === null || current === undefined) break;

        if (part === '*') {
          // Wildcard: iterate array and collect
          if (Array.isArray(current)) {
            // Get remaining path after *
            const remainingIdx = parts.indexOf(part) + 1;
            const remaining = parts.slice(remainingIdx).join('.');
            if (remaining) {
              current = current.map(item => {
                try { return this.extractJsonPath(item, remaining); } catch { return null; }
              }).filter(Boolean);
            }
            break;
          }
        } else if (/^\d+$/.test(part)) {
          current = current[parseInt(part, 10)];
        } else {
          current = current[part];
        }
      }

      if (typeof current === 'object') {
        return JSON.stringify(current, null, 2);
      }
      return String(current);
    } catch (error) {
      return `[JSONPath Error: ${(error as Error).message}]`;
    }
  }

  /**
   * Static fetch using fetch + cheerio
   */
  private async fetchPageStatic(url: string, selector?: string, proxy?: string, fetchConfig?: FetchConfig): Promise<{
    content: string;
    title: string;
    statusCode: number;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const headers = this.buildHeaders(fetchConfig);
      const fetchOpts: RequestInit = {
        headers,
        signal: AbortSignal.timeout(fetchConfig?.timeout || 30000),
      };

      const response = await fetch(url, fetchOpts);
      
      const responseTime = Date.now() - startTime;
      const html = await response.text();
      const $ = cheerio.load(html);
      
      // Remove noise elements
      $('script').remove();
      $('style').remove();
      $('noscript').remove();
      $('iframe').remove();
      $('nav').remove();
      $('footer').remove();
      $('[class*="ad"]').remove();
      $('[class*="advertisement"]').remove();
      $('[id*="ad"]').remove();
      
      let content: string;
      
      if (selector) {
        const selected = $(selector);
        content = selected.length > 0 ? selected.text().trim() : '';
      } else {
        const mainContent = $('main, article, .content, .main, #content, #main').first();
        content = mainContent.length > 0 
          ? mainContent.text().trim()
          : $('body').text().trim();
      }
      
      content = content.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
      const title = $('title').text().trim() || '';
      
      if (proxy) proxyPoolService.reportSuccess(proxy);
      
      return { content, title, statusCode: response.status, responseTime };
    } catch (error) {
      if (proxy) proxyPoolService.reportFailure(proxy);
      throw new Error(`Failed to fetch page: ${(error as Error).message}`);
    }
  }
  
  /**
   * Generate content hash for comparison
   */
  generateHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }
  
  /**
   * Compare two snapshots and detect changes
   */
  detectChanges(previous: PageSnapshot, current: PageSnapshot): {
    hasChanged: boolean;
    changeType: 'content' | 'structure' | 'both';
    diffHtml: string;
  } {
    if (previous.contentHash === current.contentHash) {
      return { hasChanged: false, changeType: 'content', diffHtml: '' };
    }
    
    // Generate line-by-line diff
    const diffs = diff.diffLines(previous.content, current.content);
    
    // Convert to a simple HTML-ready format (or just raw diff data)
    let diffHtml = '';
    diffs.forEach((part) => {
      const colorClass = part.added ? 'bg-green-100 text-green-800' : 
                         part.removed ? 'bg-red-100 text-red-800 line-through' : '';
      const prefix = part.added ? '+ ' : part.removed ? '- ' : '  ';
      
      if (part.added || part.removed || diffs.length < 10) {
        // Escape HTML
        const escapedValue = part.value
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#039;');
          
        diffHtml += `<div class="${colorClass}">${prefix}${escapedValue}</div>`;
      }
    });
    
    return {
      hasChanged: true,
      changeType: 'content',
      diffHtml,
    };
  }
  
  /**
   * AI-powered change analysis (stub for real implementation)
   */
  async analyzeChange(
    previousContent: string,
    currentContent: string,
    targetName: string
  ): Promise<AIAnalysisResult> {
    // Calculate basic metrics
    const prevLength = previousContent.length;
    const currLength = currentContent.length;
    const lengthChange = Math.abs(currLength - prevLength) / Math.max(prevLength, 1);
    
    // Use diff to get actual word changes
    const diffs = diff.diffWords(previousContent, currentContent);
    const addedWords = diffs.filter(d => d.added).length;
    const removedWords = diffs.filter(d => d.removed).length;
    
    // Simple heuristic for significance
    const isSignificant = addedWords > 10 || removedWords > 10 || lengthChange > 0.1;
    
    // Determine importance based on change magnitude
    let importance: 'low' | 'medium' | 'high';
    if (addedWords > 100 || lengthChange > 0.5) {
      importance = 'high';
    } else if (addedWords > 20 || lengthChange > 0.2) {
      importance = 'medium';
    } else {
      importance = 'low';
    }
    
    // Generate summary
    const summary = isSignificant
      ? `检测到 ${targetName} 有变化：增加了 ${addedWords} 个词，删除了 ${removedWords} 个词。`
      : `${targetName} 有轻微更新，内容基本保持不变。`;
    
    return {
      isSignificant,
      importance,
      summary,
      keywords: [],
      category: 'general',
    };
  }
  
  /**
   * Filter out noise changes (timestamps, ads, etc.)
   */
  filterNoise(content: string): string {
    return content
      // Remove timestamps
      .replace(/\d{4}-\d{2}-\d{2}/g, '[DATE]')
      .replace(/\d{2}:\d{2}(:\d{2})?/g, '[TIME]')
      // Remove common dynamic content
      .replace(/\d+ (seconds?|minutes?|hours?|days?) ago/gi, '[RELATIVE_TIME]')
      .replace(/©\s*\d{4}/g, '[COPYRIGHT]')
      // Remove numbers that look like counters
      .replace(/\b\d{1,3}(,\d{3})*\b/g, '[NUMBER]');
  }
}

export const webMonitorService = new WebMonitorService();
