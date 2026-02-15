/**
 * Browser Renderer Service - Uses Playwright for JavaScript-rendered (SPA) pages.
 * Falls back gracefully if Playwright is not installed.
 */

let playwright: typeof import('playwright') | null = null;
let browserInstance: import('playwright').Browser | null = null;

async function getPlaywright() {
  if (playwright) return playwright;
  try {
    playwright = await import('playwright');
    return playwright;
  } catch {
    return null;
  }
}

async function getBrowser() {
  if (browserInstance?.isConnected()) return browserInstance;

  const pw = await getPlaywright();
  if (!pw) throw new Error('Playwright is not installed. Run: pnpm add playwright && npx playwright install chromium');

  browserInstance = await pw.chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return browserInstance;
}

export interface BrowserFetchOptions {
  url: string;
  selector?: string;
  waitForSelector?: string;
  proxy?: string;
  timeoutMs?: number;
}

export interface BrowserFetchResult {
  content: string;
  title: string;
  statusCode: number;
  responseTime: number;
}

export async function browserFetchPage(opts: BrowserFetchOptions): Promise<BrowserFetchResult> {
  const startTime = Date.now();
  const timeout = opts.timeoutMs ?? 30000;

  const browser = await getBrowser();

  const contextOpts: Record<string, unknown> = {
    userAgent: 'WebWatcher/1.0 (https://webwatcher.dev)',
  };
  if (opts.proxy) {
    contextOpts.proxy = { server: opts.proxy };
  }

  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();

  let statusCode = 200;

  try {
    const response = await page.goto(opts.url, {
      waitUntil: 'networkidle',
      timeout,
    });
    statusCode = response?.status() ?? 200;

    // Optionally wait for a specific selector
    if (opts.waitForSelector) {
      await page.waitForSelector(opts.waitForSelector, { timeout: 10000 }).catch(() => {
        console.warn(`[BrowserRenderer] waitForSelector "${opts.waitForSelector}" timed out`);
      });
    }

    // Remove noise elements
    await page.evaluate(() => {
      const selectors = ['script', 'style', 'noscript', 'iframe', '[class*="ad"]', '[class*="advertisement"]', '[id*="ad"]'];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => el.remove());
      });
    });

    let content: string;

    if (opts.selector) {
      content = await page.$eval(opts.selector, el => el.textContent || '').catch(() => '');
    } else {
      content = await page.evaluate(() => {
        const main = document.querySelector('main, article, .content, .main, #content, #main');
        return (main || document.body)?.textContent || '';
      });
    }

    content = content.replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();

    const title = await page.title();
    const responseTime = Date.now() - startTime;

    return { content, title, statusCode, responseTime };
  } finally {
    await page.close();
    await context.close();
  }
}

export async function isBrowserAvailable(): Promise<boolean> {
  const pw = await getPlaywright();
  return pw !== null;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
