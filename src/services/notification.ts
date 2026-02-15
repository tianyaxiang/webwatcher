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

class NotificationService {
  private emailTransporter: nodemailer.Transporter | null = null;
  
  constructor() {
    this.initEmailTransporter();
  }
  
  /**
   * Initialize email transporter
   */
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
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
      
      console.log('[Notification] Email transporter initialized');
    } else {
      console.log('[Notification] Email not configured (set SMTP_HOST, SMTP_USER, SMTP_PASS)');
    }
  }
  
  /**
   * Send email notification
   */
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
  
  /**
   * Send webhook notification
   */
  async sendWebhook(url: string, payload: WebhookPayload): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'WebWatcher/1.0',
        },
        body: JSON.stringify({
          ...payload,
          timestamp: new Date().toISOString(),
        }),
        signal: AbortSignal.timeout(10000),
      });
      
      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }
      
      console.log(`[Notification] Webhook sent to ${url}`);
    } catch (error) {
      console.error(`[Notification] Failed to send webhook to ${url}:`, error);
      throw error;
    }
  }
  
  /**
   * Send Telegram notification (optional)
   */
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
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Telegram API returned ${response.status}`);
      }
      
      console.log(`[Notification] Telegram sent to ${chatId}`);
    } catch (error) {
      console.error('[Notification] Failed to send Telegram:', error);
      throw error;
    }
  }
  
  /**
   * Send Discord webhook notification
   */
  async sendDiscord(webhookUrl: string, target: any, change: any): Promise<void> {
    try {
      const importanceColors = {
        high: 0xef4444,
        medium: 0xf59e0b,
        low: 0x6b7280,
      };
      
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
              {
                name: '重要程度',
                value: change.importance === 'high' ? '🔴 重要' : 
                       change.importance === 'medium' ? '🟡 一般' : '⚪ 轻微',
                inline: true,
              },
              {
                name: '检测时间',
                value: new Date(change.detectedAt).toLocaleString('zh-CN'),
                inline: true,
              },
            ],
            footer: {
              text: 'WebWatcher',
            },
            timestamp: change.detectedAt,
          }],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Discord webhook returned ${response.status}`);
      }
      
      console.log('[Notification] Discord notification sent');
    } catch (error) {
      console.error('[Notification] Failed to send Discord:', error);
      throw error;
    }
  }
  
  /**
   * Simple HTML to text converter
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gi, '')
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Test email configuration
   */
  async testEmail(to: string): Promise<boolean> {
    try {
      await this.sendEmail({
        to,
        subject: '[WebWatcher] 测试邮件',
        html: `
          <h2>🔔 WebWatcher 邮件测试</h2>
          <p>如果您收到此邮件，说明邮件配置正确！</p>
          <p>时间: ${new Date().toLocaleString('zh-CN')}</p>
        `,
      });
      return true;
    } catch {
      return false;
    }
  }
}

export const notificationService = new NotificationService();
