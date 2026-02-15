/**
 * Proxy Pool Service - Manages a pool of proxy servers for rotation.
 * Supports HTTP, HTTPS, and SOCKS5 proxies.
 */

import type { ProxyConfig } from '@/types';

class ProxyPoolService {
  private proxies: ProxyConfig[] = [];
  private currentIndex = 0;
  private failureCounts: Map<string, number> = new Map();
  private MAX_FAILURES = 5;

  /**
   * Load proxies from environment or config
   */
  initialize(): void {
    // Load from env: PROXY_URLS=http://a:b@host1:port,socks5://host2:port
    const envProxies = process.env.PROXY_URLS;
    if (envProxies) {
      this.proxies = envProxies.split(',').map((url, i) => ({
        url: url.trim(),
        label: `proxy-${i + 1}`,
      }));
      console.log(`[ProxyPool] Loaded ${this.proxies.length} proxies from environment`);
    }
  }

  /**
   * Add a proxy to the pool
   */
  addProxy(config: ProxyConfig): void {
    this.proxies.push(config);
  }

  /**
   * Set the entire proxy list
   */
  setProxies(configs: ProxyConfig[]): void {
    this.proxies = configs;
    this.currentIndex = 0;
    this.failureCounts.clear();
  }

  /**
   * Get next available proxy (round-robin with failure tracking)
   */
  getNext(): string | null {
    const available = this.proxies.filter(
      p => (this.failureCounts.get(p.url) ?? 0) < this.MAX_FAILURES
    );
    if (available.length === 0) return null;

    const proxy = available[this.currentIndex % available.length];
    this.currentIndex = (this.currentIndex + 1) % available.length;
    return proxy.url;
  }

  /**
   * Report a proxy failure
   */
  reportFailure(proxyUrl: string): void {
    const count = (this.failureCounts.get(proxyUrl) ?? 0) + 1;
    this.failureCounts.set(proxyUrl, count);
    if (count >= this.MAX_FAILURES) {
      console.warn(`[ProxyPool] Proxy ${proxyUrl} disabled after ${count} failures`);
    }
  }

  /**
   * Report a proxy success (reset failure count)
   */
  reportSuccess(proxyUrl: string): void {
    this.failureCounts.delete(proxyUrl);
  }

  /**
   * Get pool status
   */
  getStatus(): {
    total: number;
    active: number;
    disabled: number;
    proxies: { url: string; label?: string; failures: number; active: boolean }[];
  } {
    const proxies = this.proxies.map(p => {
      const failures = this.failureCounts.get(p.url) ?? 0;
      return {
        url: p.url.replace(/:\/\/([^:]+):([^@]+)@/, '://$1:***@'), // mask password
        label: p.label,
        failures,
        active: failures < this.MAX_FAILURES,
      };
    });

    return {
      total: this.proxies.length,
      active: proxies.filter(p => p.active).length,
      disabled: proxies.filter(p => !p.active).length,
      proxies,
    };
  }

  /**
   * Reset all failure counts
   */
  resetFailures(): void {
    this.failureCounts.clear();
  }

  get size(): number {
    return this.proxies.length;
  }
}

export const proxyPoolService = new ProxyPoolService();

// Auto-initialize from env
proxyPoolService.initialize();
