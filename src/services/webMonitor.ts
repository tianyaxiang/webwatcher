import * as cheerio from 'cheerio';
import crypto from 'crypto';
import * as diff from 'diff';
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
        const selected = $(selector);
        content = selected.length > 0 ? selected.text().trim() : '';
      } else {
        // Monitor main content
        const mainContent = $('main, article, .content, .main, #content, #main').first();
        content = mainContent.length > 0 
          ? mainContent.text().trim()
          : $('body').text().trim();
      }
      
      // Clean up whitespace: replace multiple spaces/newlines with single space
      // but keep some structure by replacing multiple newlines with a single newline
      content = content.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
      
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
