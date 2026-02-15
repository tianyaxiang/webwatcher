import { NextResponse } from 'next/server';
import { notificationService } from '@/services/notification';

// GET - Get notification channels status
export async function GET() {
  try {
    return NextResponse.json(notificationService.getStatus());
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get notification status', details: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Test a notification channel
export async function POST(request: Request) {
  try {
    const { channel, target, change } = await request.json();

    const dummyTarget = target || { id: 'test', name: 'WebWatcher 测试', url: 'https://example.com' };
    const dummyChange = change || {
      id: 'test',
      importance: 'medium',
      changeSummary: '这是一条测试通知，确认通知渠道已正确配置。',
      detectedAt: new Date().toISOString(),
    };

    switch (channel) {
      case 'feishu':
        await notificationService.sendFeishu(dummyTarget, dummyChange);
        break;
      case 'wecom':
        await notificationService.sendWeCom(dummyTarget, dummyChange);
        break;
      case 'serverchan':
        await notificationService.sendServerChan(dummyTarget, dummyChange);
        break;
      case 'telegram':
        if (!dummyTarget.notifyTelegram) {
          return NextResponse.json({ error: 'Missing Telegram chat ID' }, { status: 400 });
        }
        await notificationService.sendTelegram(
          dummyTarget.notifyTelegram,
          `🔔 ${dummyTarget.name} 测试通知\n\n${dummyChange.changeSummary}`
        );
        break;
      default:
        return NextResponse.json({ error: `Unknown channel: ${channel}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, channel });
  } catch (error) {
    return NextResponse.json(
      { error: 'Notification test failed', details: (error as Error).message },
      { status: 500 }
    );
  }
}
