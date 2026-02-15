import * as cheerio from 'cheerio';
import crypto from 'crypto';
import type { WatchTarget, PageSnapshot, ChangeRecord, AIAnalysisResult } from '@/types';

export class WebMonitorService {
  /**
   * Fetch and parse a web page
   */
  async fetchPage(url: string, selector?: string): Promise<{
    content: string;
    title: string;
    statusCode: number;
    responseTime: number;
  }> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'WebWatcher/1.0 (https://webwatcher.dev)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
        signal: AbortSignal.timeout(30000),
      });
      
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
        // Monitor specific element
        content = $(selector).text().trim();
      } else {
        // Monitor main content
        const mainContent = $('main, article, .content, .main, #content, #main').first();
        content = mainContent.length > 0 
          ? mainContent.text().trim()
          : $('body').text().trim();
      }
      
      // Clean up whitespace
      content = content.replace(/\s+/g, ' ').trim();
      
      const title = $('title').text().trim() || '';
      
      return {
        content,
        title,
        statusCode: response.status,
        responseTime,
      };
    } catch (error) {
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
    diffText: string;
  } {
    if (previous.contentHash === current.contentHash) {
      return { hasChanged: false, changeType: 'content', diffText: '' };
    }
    
    const prevWords = new Set(previous.content.split(' '));
    const currWords = new Set(current.content.split(' '));
    
    const added = [...currWords].filter(w => !prevWords.has(w));
    const removed = [...prevWords].filter(w => !currWords.has(w));
    
    const diffText = [
      added.length > 0 ? `+Added: ${added.slice(0, 50).join(' ')}...` : '',
      removed.length > 0 ? `-Removed: ${removed.slice(0, 50).join(' ')}...` : '',
    ].filter(Boolean).join('\n');
    
    return {
      hasChanged: true,
      changeType: 'content',
      diffText,
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
    
    // Simple heuristic for significance
    const isSignificant = lengthChange > 0.1; // More than 10% change
    
    // Determine importance based on change magnitude
    let importance: 'low' | 'medium' | 'high';
    if (lengthChange > 0.5) {
      importance = 'high';
    } else if (lengthChange > 0.2) {
      importance = 'medium';
    } else {
      importance = 'low';
    }
    
    // Generate summary (in production, use AI API)
    const summary = isSignificant
      ? `检测到 ${targetName} 有显著变化，内容变化约 ${Math.round(lengthChange * 100)}%`
      : `${targetName} 有轻微更新，可能是广告或时间戳变化`;
    
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
