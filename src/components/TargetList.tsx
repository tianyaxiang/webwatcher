'use client';

import { RefreshCw, Eye, Trash2, Clock, AlertTriangle, CheckCircle, ExternalLink, History } from 'lucide-react';
import type { WatchTarget } from '@/types';
import { formatTime } from '@/lib/utils';

interface TargetListProps {
  targets: WatchTarget[];
  loading: boolean;
  checkingId: string | null;
  onCheck: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
  onSnapshots: (target: WatchTarget) => void;
  onRefresh: () => void;
  onAddFirst: () => void;
}

export function TargetList({
  targets, loading, checkingId,
  onCheck, onToggle, onDelete, onSnapshots, onRefresh, onAddFirst,
}: TargetListProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold text-gray-900">监控列表</h2>
        <button onClick={onRefresh} className="p-2 hover:bg-gray-100 rounded-lg transition" title="刷新">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-500">加载中...</div>
      ) : targets.length === 0 ? (
        <div className="p-8 text-center text-gray-500">
          <Eye className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>还没有监控目标</p>
          <button onClick={onAddFirst} className="mt-2 text-blue-500 hover:underline">
            添加第一个监控
          </button>
        </div>
      ) : (
        <div className="divide-y">
          {targets.map(target => (
            <div key={target.id} className="p-4 hover:bg-gray-50 transition">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${target.enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <h3 className="font-medium text-gray-900 truncate">{target.name}</h3>
                  </div>
                  <a
                    href={target.url} target="_blank" rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline truncate flex items-center gap-1"
                  >
                    {target.url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {target.checkInterval}
                    </span>
                    <span>上次检查: {formatTime(target.lastCheckedAt)}</span>
                    {target.lastChangedAt && (
                      <span className="text-orange-500">上次变化: {formatTime(target.lastChangedAt)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onCheck(target.id)}
                    disabled={checkingId === target.id}
                    className="p-2 hover:bg-blue-100 text-blue-500 rounded-lg transition"
                    title="立即检查"
                  >
                    <RefreshCw className={`w-4 h-4 ${checkingId === target.id ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={() => onToggle(target.id, !target.enabled)}
                    className={`p-2 rounded-lg transition ${target.enabled ? 'hover:bg-yellow-100 text-yellow-500' : 'hover:bg-green-100 text-green-500'}`}
                    title={target.enabled ? '暂停' : '启用'}
                  >
                    {target.enabled ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onSnapshots(target)}
                    className="p-2 hover:bg-purple-100 text-purple-500 rounded-lg transition"
                    title="快照历史"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(target.id)}
                    className="p-2 hover:bg-red-100 text-red-500 rounded-lg transition"
                    title="删除"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
