/**
 * Browser Renderer Service - Uses Playwright for JavaScript-rendered pages (SPA).
 * Falls back gracefully if Playwright is not installed.
 */

import * as cheerio from 'cheerio';

let playwright: any = null;
let browser: any = null;

async function ensureBrowser(proxyUrl?: string): Promise<any> {
  if (!playwright) {
    try {
      // @ts-ignore - playwright is an optional peer dependency
      playwright = await import('playwright');
    } catch {
      throw new Error(
        'Playwright is not installed. Run: pnpm add playwright && npx playwright install chromium'
      );
    }
  }

  // Re-create browser if proxy changes or browser is closed
  if (browser && browser.isConnected()) {
    return browser;
  }

  const launchOptions: any = {
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  };

  if (proxyUrl) {
    launchOptions.proxy = { server: proxyUrl };
  }

  browser = await playwright.chromium.launch(launchOptions);
  return browser;
}

/**
 * Close the browser instance (call on shutdown)
 */
export async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close().catch(() => {});
    browser = null;
  }
}

/**
 * Fetch a page using Playwright (headless browser)
 */
export async function browserFetchPage(
  options: {
    url: string;
    selector?: string;
    waitForSelector?: string;
    proxy?: string;
    timeoutMs?: number;
  }
): Promise<{
  content: string;
  title: string;
  statusCode: number;
  responseTime: number;
}> {
  const { url, selector, waitForSelector, proxy, timeoutMs = 30000 } = options;
  const startTime = Date.now();

  const b = await ensureBrowser(proxy);
  const context = await b.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  });

  const page = await context.newPage();
  let statusCode = 0;

  page.on('response', (resp: any) => {
    if (resp.url() === url || resp.url() === url + '/') {
      statusCode = resp.status();
    }
  });

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: timeoutMs });

    // Wait for a specific selector if provided
    if (waitForSelector) {
      await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {
        console.warn(`[BrowserRenderer] waitForSelector "${waitForSelector}" timed out`);
      });
    }

    // Small delay for any remaining JS execution
    await page.waitForTimeout(1000);

    const html = await page.content();
    const title = await page.title();
    const responseTime = Date.now() - startTime;

    // Parse with cheerio same as static mode
    const $ = cheerio.load(html);
    $('script').remove();
    $('style').remove();
    $('noscript').remove();
    $('iframe').remove();
    $('[class*="ad"]').remove();
    $('[class*="advertisement"]').remove();

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

    return { content, title, statusCode: statusCode || 200, responseTime };
  } finally {
    await context.close().catch(() => {});
  }
}

/**
 * Check if Playwright is available
 */
export async function isBrowserAvailable(): Promise<boolean> {
    // @ts-ignore - playwright is an optional peer dependency
    await import('playwright');
    await import('playwright');
    return true;
  } catch {
    return false;
  }
}
