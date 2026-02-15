import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface WebhookPayload {
  event: string;
  target: {
    id: string;
    name: string;
    url: string;
  };
  change: {
    id: string;
    importance: string;
    summary: string;
    detectedAt: string;
  };
}

// Importance display helpers
const importanceLabel = (imp: string) =>
  imp === 'high' ? '🔴 重要' : imp === 'medium' ? '🟡 一般' : '⚪ 轻微';

const importanceColor = (imp: string) =>
  imp === 'high' ? 'red' : imp === 'medium' ? 'orange' : 'grey';

class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  
  constructor() {
    this.initEmailTransporter();
  }
  
  // ==================== Email ====================

  private initEmailTransporter(): void {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    
    if (smtpHost && smtpUser && smtpPass) {
      this.emailTransporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort || '587', 10),
        secure: smtpPort === '465',
        auth: { user: smtpUser, pass: smtpPass },
      });
      console.log('[Notification] Email transporter initialized');
    } else {
      console.log('[Notification] Email not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }
  }
  
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.emailTransporter) {
      console.log('[Notification] Email not configured, skipping:', options.subject);
      return;
    }
    
    try {
      const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
      await this.emailTransporter.sendMail({
        from: `WebWatcher <${fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || this.htmlToText(options.html),
      });
      console.log(`[Notification] Email sent to ${options.to}: ${options.subject}`);
    } catch (error) {
      console.error('[Notification] Failed to send email:', error);
      throw error;
    }
  }

  // ==================== Webhook ====================

  async sendWebhook(url: string, payload: WebhookPayload): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebWatcher/1.0',
        },
        body: JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Webhook returned ${response.status}`);
      console.log(`[Notification] Webhook sent to ${url}`);
    } catch (error) {
      console.error(`[Notification] Failed to send webhook to ${url}:`, error);
      throw error;
    }
  }

  // ==================== Feishu 飞书 ====================

  /**
   * Send Feishu bot notification via webhook
   * Env: FEISHU_WEBHOOK_URL (机器人 webhook 地址)
   * Or pass webhookUrl directly per-target
   */
  async sendFeishu(target: any, change: any, webhookUrl?: string): Promise<void> {
    const url = webhookUrl || process.env.FEISHU_WEBHOOK_URL;
    if (!url) {
      console.log('[Notification] Feishu not configured (set FEISHU_WEBHOOK_URL)');
      return;
    }

    try {
      const card = {
        msg_type: 'interactive',
        card: {
          config: { wide_screen_mode: true },
          header: {
            title: { tag: 'plain_text', content: `🔔 ${target.name} 内容已变化` },
            template: change.importance === 'high' ? 'red' : change.importance === 'medium' ? 'orange' : 'blue',
          },
          elements: [
            {
              tag: 'div',
              text: {
                tag: 'lark_md',
                content: `**变化摘要**\n${change.changeSummary || '检测到内容变化'}`,
              },
            },
            {
              tag: 'div',
              fields: [
                { is_short: true, text: { tag: 'lark_md', content: `**重要程度**\n${importanceLabel(change.importance)}` } },
                { is_short: true, text: { tag: 'lark_md', content: `**检测时间**\n${new Date(change.detectedAt).toLocaleString('zh-CN')}` } },
              ],
            },
            { tag: 'hr' },
            {
              tag: 'action',
              actions: [
                {
                  tag: 'button',
                  text: { tag: 'plain_text', content: '查看原始网页' },
                  url: target.url,
                  type: 'primary',
                },
              ],
            },
          ],
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(card),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error(`Feishu webhook returned ${response.status}`);
      console.log(`[Notification] Feishu notification sent for ${target.name}`);
    } catch (error) {
      console.error('[Notification] Failed to send Feishu:', error);
      throw error;
    }
  }

  // ==================== WeChat 微信 ====================

  /**
   * Send via Server酱 (SCT) — https://sct.ftqq.com
   * Env: SERVERCHAN_KEY
   */
  async sendServerChan(target: any, change: any, sendKey?: string): Promise<void> {
    const key = sendKey || process.env.SERVERCHAN_KEY;
    if (!key) {
      console.log('[Notification] Server酱 not configured (set SERVERCHAN_KEY)');
      return;
    }

    try {
      const title = `${target.name} 内容变化 [${importanceLabel(change.importance)}]`;
      const desp = [
        `## ${target.name}`,
        '',
        `**URL:** [${target.url}](${target.url})`,
        '',
        `**重要程度:** ${importanceLabel(change.importance)}`,
        '',
        `**检测时间:** ${new Date(change.detectedAt).toLocaleString('zh-CN')}`,
        '',
        `### 变化摘要`,
        change.changeSummary || '检测到内容变化',
        '',
        '---',
        '*由 WebWatcher 自动发送*',
      ].join('\n');

      const url = `https://sctapi.ftqq.com/${key}.send`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, desp }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error(`Server酱 returned ${response.status}`);
      console.log(`[Notification] Server酱 notification sent for ${target.name}`);
    } catch (error) {
      console.error('[Notification] Failed to send Server酱:', error);
      throw error;
    }
  }

  /**
   * Send via 企业微信 Webhook
   * Env: WECOM_WEBHOOK_URL
   */
  async sendWeCom(target: any, change: any, webhookUrl?: string): Promise<void> {
    const url = webhookUrl || process.env.WECOM_WEBHOOK_URL;
    if (!url) {
      console.log('[Notification] 企业微信 not configured (set WECOM_WEBHOOK_URL)');
      return;
    }

    try {
      const content = [
        `🔔 <font color="${importanceColor(change.importance)}">**${target.name} 内容已变化**</font>`,
        `> 重要程度: ${importanceLabel(change.importance)}`,
        `> 检测时间: ${new Date(change.detectedAt).toLocaleString('zh-CN')}`,
        '',
        change.changeSummary || '检测到内容变化',
        '',
        `[查看原始网页](${target.url})`,
      ].join('\n');

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msgtype: 'markdown',
          markdown: { content },
        }),
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) throw new Error(`WeCom webhook returned ${response.status}`);
      console.log(`[Notification] 企业微信 notification sent for ${target.name}`);
    } catch (error) {
      console.error('[Notification] Failed to send WeCom:', error);
      throw error;
    }
  }

  // ==================== Telegram ====================

  async sendTelegram(chatId: string, message: string): Promise<void> {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
      console.log('[Notification] Telegram not configured');
      return;
    }
    
    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
      });
      if (!response.ok) throw new Error(`Telegram API returned ${response.status}`);
      console.log(`[Notification] Telegram sent to ${chatId}`);
    } catch (error) {
      console.error('[Notification] Failed to send Telegram:', error);
      throw error;
    }
  }
  
  // ==================== Discord ====================

  async sendDiscord(webhookUrl: string, target: any, change: any): Promise<void> {
    try {
      const importanceColors = { high: 0xef4444, medium: 0xf59e0b, low: 0x6b7280 };
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: `🔔 ${target.name} 内容已变化`,
            description: change.changeSummary || '检测到内容变化',
            url: target.url,
            color: importanceColors[change.importance as keyof typeof importanceColors] || 0x6b7280,
            fields: [
              { name: '重要程度', value: importanceLabel(change.importance), inline: true },
              { name: '检测时间', value: new Date(change.detectedAt).toLocaleString('zh-CN'), inline: true },
            ],
            footer: { text: 'WebWatcher' },
            timestamp: change.detectedAt,
          }],
        }),
      });
      if (!response.ok) throw new Error(`Discord webhook returned ${response.status}`);
      console.log('[Notification] Discord notification sent');
    } catch (error) {
      console.error('[Notification] Failed to send Discord:', error);
      throw error;
    }
  }

  // ==================== Unified Send ====================

  /**
   * Send all configured notifications for a target
   */
  async sendAll(target: any, change: any, emailHtml?: string): Promise<{ sent: string[]; failed: string[] }> {
    const sent: string[] = [];
    const failed: string[] = [];

    const tryNotify = async (name: string, fn: () => Promise<void>) => {
      try { await fn(); sent.push(name); } catch { failed.push(name); }
    };

    // Email
    if (target.notifyEmail && emailHtml) {
      await tryNotify('email', () => this.sendEmail({
        to: target.notifyEmail,
        subject: `[WebWatcher] ${target.name} 内容已变化`,
        html: emailHtml,
      }));
    }

    // Webhook
    if (target.notifyWebhook) {
      await tryNotify('webhook', () => this.sendWebhook(target.notifyWebhook, {
        event: 'page_changed',
        target: { id: target.id, name: target.name, url: target.url },
        change: { id: change.id, importance: change.importance, summary: change.changeSummary, detectedAt: change.detectedAt },
      }));
    }

    // Feishu
    if (target.notifyFeishu || process.env.FEISHU_WEBHOOK_URL) {
      await tryNotify('feishu', () => this.sendFeishu(target, change, target.notifyFeishu));
    }

    // WeChat (Server酱)
    if (target.notifyServerChan || process.env.SERVERCHAN_KEY) {
      await tryNotify('serverchan', () => this.sendServerChan(target, change, target.notifyServerChan));
    }

    // WeChat (企业微信)
    if (target.notifyWeCom || process.env.WECOM_WEBHOOK_URL) {
      await tryNotify('wecom', () => this.sendWeCom(target, change, target.notifyWeCom));
    }

    // Telegram
    if (target.notifyTelegram) {
      const msg = `🔔 <b>${target.name}</b> 内容已变化\n\n${change.changeSummary || '检测到内容变化'}\n\n${importanceLabel(change.importance)}\n\n<a href="${target.url}">查看网页</a>`;
      await tryNotify('telegram', () => this.sendTelegram(target.notifyTelegram, msg));
    }

    // Discord
    if (target.notifyDiscord) {
      await tryNotify('discord', () => this.sendDiscord(target.notifyDiscord, target, change));
    }

    return { sent, failed };
  }

  // ==================== Utils ====================

  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  async testEmail(to: string): Promise<boolean> {
    try {
      await this.sendEmail({
        to,
        subject: '[WebWatcher] 测试邮件',
        html: `<h2>🔔 WebWatcher 邮件测试</h2><p>邮件配置正确！</p><p>时间: ${new Date().toLocaleString('zh-CN')}</p>`,
      });
      return true;
    } catch { return false; }
  }

  /**
   * Get configured notification channels status
   */
  getStatus(): Record<string, boolean> {
    return {
      email: !!this.emailTransporter,
      feishu: !!process.env.FEISHU_WEBHOOK_URL,
      wecom: !!process.env.WECOM_WEBHOOK_URL,
      serverchan: !!process.env.SERVERCHAN_KEY,
      telegram: !!process.env.TELEGRAM_BOT_TOKEN,
    };
  }
}

export const notificationService = new NotificationService();
