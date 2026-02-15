/**
 * Monitor Templates - Pre-configured monitoring setups for popular websites.
 */

import type { MonitorTemplate } from '@/types';

export const monitorTemplates: MonitorTemplate[] = [
  // === 开发者 ===
  {
    id: 'github-releases',
    name: 'GitHub Releases',
    description: '监控 GitHub 仓库的最新发布版本',
    category: '开发者',
    url: 'https://github.com/{owner}/{repo}/releases',
    selector: '.release',
    checkInterval: '1hour',
    icon: '🐙',
  },
  {
    id: 'github-commits',
    name: 'GitHub 最新提交',
    description: '监控仓库 main 分支的最新提交',
    category: '开发者',
    url: 'https://github.com/{owner}/{repo}/commits/main',
    selector: '.TimelineItem',
    checkInterval: '30min',
    icon: '📝',
  },
  {
    id: 'npm-package',
    name: 'NPM 包更新',
    description: '监控 NPM 包的版本更新',
    category: '开发者',
    url: 'https://www.npmjs.com/package/{package}',
    selector: '#top',
    checkInterval: '6hour',
    icon: '📦',
  },

  // === 新闻资讯 ===
  {
    id: 'hackernews-top',
    name: 'Hacker News 头条',
    description: '监控 HN 首页热门话题变化',
    category: '新闻资讯',
    url: 'https://news.ycombinator.com/',
    selector: '.titleline',
    checkInterval: '15min',
    icon: '🔶',
  },
  {
    id: 'v2ex-hot',
    name: 'V2EX 热门',
    description: '监控 V2EX 热门话题',
    category: '新闻资讯',
    url: 'https://www.v2ex.com/?tab=hot',
    selector: '#Main .cell.item',
    checkInterval: '15min',
    icon: '💬',
  },
  {
    id: 'producthunt-daily',
    name: 'Product Hunt 今日产品',
    description: '监控 PH 每日新产品',
    category: '新闻资讯',
    url: 'https://www.producthunt.com/',
    selector: '[data-test="homepage-section-0"]',
    renderMode: 'browser',
    waitForSelector: '[data-test="homepage-section-0"]',
    checkInterval: '1hour',
    icon: '🚀',
  },

  // === 电商价格 ===
  {
    id: 'jd-price',
    name: '京东商品价格',
    description: '监控京东商品价格变化',
    category: '电商价格',
    url: 'https://item.jd.com/{sku}.html',
    selector: '.p-price',
    renderMode: 'browser',
    waitForSelector: '.p-price',
    checkInterval: '1hour',
    icon: '🛒',
  },
  {
    id: 'amazon-price',
    name: 'Amazon 商品价格',
    description: '监控 Amazon 商品价格',
    category: '电商价格',
    url: 'https://www.amazon.com/dp/{asin}',
    selector: '#priceblock_ourprice, .a-price .a-offscreen',
    checkInterval: '6hour',
    icon: '📱',
  },

  // === 服务状态 ===
  {
    id: 'github-status',
    name: 'GitHub 服务状态',
    description: '监控 GitHub 服务可用性',
    category: '服务状态',
    url: 'https://www.githubstatus.com/',
    selector: '.components-section',
    checkInterval: '5min',
    icon: '🟢',
  },
  {
    id: 'cloudflare-status',
    name: 'Cloudflare 状态',
    description: '监控 Cloudflare 服务状态',
    category: '服务状态',
    url: 'https://www.cloudflarestatus.com/',
    selector: '.components-section',
    checkInterval: '5min',
    icon: '🌐',
  },

  // === 政府公告 ===
  {
    id: 'gov-policy',
    name: '政策公告',
    description: '监控政府网站政策更新（需自定义 URL）',
    category: '政府公告',
    url: 'https://www.gov.cn/zhengce/zuixin.htm',
    selector: '.news_box',
    checkInterval: '6hour',
    icon: '📜',
  },

  // === 社交媒体 ===
  {
    id: 'weibo-hot',
    name: '微博热搜',
    description: '监控微博热搜榜变化',
    category: '社交媒体',
    url: 'https://s.weibo.com/top/summary',
    selector: '#pl_top_realtimehot',
    checkInterval: '15min',
    icon: '🔥',
  },
  {
    id: 'zhihu-hot',
    name: '知乎热榜',
    description: '监控知乎热榜话题',
    category: '社交媒体',
    url: 'https://www.zhihu.com/hot',
    selector: '.HotList-list',
    renderMode: 'browser',
    waitForSelector: '.HotList-list',
    checkInterval: '30min',
    icon: '💡',
  },
];

/**
 * Get all templates
 */
export function getTemplates(): MonitorTemplate[] {
  return monitorTemplates;
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(): Record<string, MonitorTemplate[]> {
  const grouped: Record<string, MonitorTemplate[]> = {};
  for (const t of monitorTemplates) {
    if (!grouped[t.category]) grouped[t.category] = [];
    grouped[t.category].push(t);
  }
  return grouped;
}

/**
 * Get a single template by ID
 */
export function getTemplate(id: string): MonitorTemplate | undefined {
  return monitorTemplates.find(t => t.id === id);
}
