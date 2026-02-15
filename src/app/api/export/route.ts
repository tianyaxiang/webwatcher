import { NextResponse } from 'next/server';
import { storageService } from '@/services/storage';

// GET - Export changes as Markdown or CSV
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'markdown';
    const targetId = searchParams.get('targetId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    let changes;
    if (targetId) {
      changes = await storageService.getChangesForTarget(targetId, limit);
    } else {
      changes = await storageService.getRecentChanges(limit);
    }

    const targets = await storageService.getTargets();
    const targetMap = new Map(targets.map(t => [t.id, t]));

    if (format === 'csv') {
      // CSV export
      const header = '时间,目标名称,URL,重要程度,变化摘要';
      const rows = changes.map(c => {
        const t = targetMap.get(c.targetId);
        const summary = (c.changeSummary || '').replace(/"/g, '""');
        return `"${c.detectedAt}","${t?.name || ''}","${t?.url || ''}","${c.importance}","${summary}"`;
      });
      const csv = [header, ...rows].join('\n');

      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="webwatcher-export-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    // Markdown export (default)
    const lines: string[] = [
      `# WebWatcher 变化报告`,
      '',
      `生成时间: ${new Date().toLocaleString('zh-CN')}`,
      '',
      `共 ${changes.length} 条变化记录`,
      '',
      '---',
      '',
    ];

    // Group by target
    const grouped = new Map<string, typeof changes>();
    for (const c of changes) {
      const list = grouped.get(c.targetId) || [];
      list.push(c);
      grouped.set(c.targetId, list);
    }

    for (const [tid, cList] of grouped) {
      const t = targetMap.get(tid);
      lines.push(`## ${t?.name || tid}`);
      lines.push(`URL: ${t?.url || 'N/A'}`);
      lines.push('');

      for (const c of cList) {
        const imp = c.importance === 'high' ? '🔴' : c.importance === 'medium' ? '🟡' : '⚪';
        lines.push(`### ${imp} ${new Date(c.detectedAt).toLocaleString('zh-CN')}`);
        lines.push('');
        lines.push(c.changeSummary || '检测到内容变化');
        lines.push('');
      }
      lines.push('---');
      lines.push('');
    }

    const md = lines.join('\n');

    return new Response(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="webwatcher-report-${new Date().toISOString().slice(0, 10)}.md"`,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to export', details: (error as Error).message },
      { status: 500 }
    );
  }
}
