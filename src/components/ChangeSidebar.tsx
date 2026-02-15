'use client';

import { X, ExternalLink } from 'lucide-react';
import type { WatchTarget, ChangeRecord } from '@/types';
import { formatTime, getImportanceColor } from '@/lib/utils';

interface ChangeSidebarProps {
  change: (ChangeRecord & { target?: WatchTarget }) | null;
  onClose: () => void;
}

export function ChangeSidebar({ change, onClose }: ChangeSidebarProps) {
  if (!change) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">变化详情</h2>
            <p className="text-sm text-gray-500">{change.target?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">变化摘要</h3>
              <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                {change.changeSummary || '检测到网页内容发生变化。'}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">对比详情</h3>
              <div className="bg-gray-900 rounded-lg overflow-hidden font-mono text-xs leading-relaxed">
                <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between">
                  <span className="text-gray-400">DIFF VIEW</span>
                  <div className="flex gap-4">
                    <span className="text-green-400">+ 新增</span>
                    <span className="text-red-400 line-through">- 删除</span>
                  </div>
                </div>
                <div className="p-4 overflow-x-auto whitespace-pre text-gray-300 max-h-[500px]">
                  {change.diffHtml ? (
                    <div className="space-y-0.5" dangerouslySetInnerHTML={{ __html: change.diffHtml }} />
                  ) : (
                    <div className="text-gray-500 italic">暂无详细对比数据</div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="text-xs text-gray-400 mb-1">检测时间</div>
                <div className="text-sm font-medium">{formatTime(change.detectedAt)}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg border">
                <div className="text-xs text-gray-400 mb-1">重要程度</div>
                <div className="text-sm font-medium capitalize">
                  <span className={`px-2 py-0.5 rounded text-xs ${getImportanceColor(change.importance)}`}>
                    {change.importance}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <a
                href={change.target?.url} target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 transition shadow-lg shadow-blue-200"
              >
                访问原始网页
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
