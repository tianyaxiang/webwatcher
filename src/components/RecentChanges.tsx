'use client';

import { ChevronRight } from 'lucide-react';
import type { WatchTarget, ChangeRecord } from '@/types';
import { formatTime, getImportanceColor, getImportanceLabel } from '@/lib/utils';

interface RecentChangesProps {
  changes: (ChangeRecord & { target?: WatchTarget })[];
  onSelect: (change: ChangeRecord & { target?: WatchTarget }) => void;
}

export function RecentChanges({ changes, onSelect }: RecentChangesProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b">
        <h2 className="font-semibold text-gray-900">最近变化</h2>
      </div>

      {changes.length === 0 ? (
        <div className="p-6 text-center text-gray-500 text-sm">暂无变化记录</div>
      ) : (
        <div className="divide-y max-h-96 overflow-y-auto">
          {changes.map(change => (
            <div
              key={change.id}
              className="p-3 hover:bg-gray-50 transition cursor-pointer group"
              onClick={() => onSelect(change)}
            >
              <div className="flex items-start gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${getImportanceColor(change.importance)}`}>
                  {getImportanceLabel(change.importance)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {change.target?.name || '未知'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                    {change.changeSummary || '检测到内容变化'}
                  </p>
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-400">{formatTime(change.detectedAt)}</p>
                    <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
