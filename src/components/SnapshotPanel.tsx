'use client';

import { useState } from 'react';
import { X, ChevronRight, History } from 'lucide-react';
import type { WatchTarget } from '@/types';
import { formatTime } from '@/lib/utils';

interface SnapshotSummary {
  id: string;
  targetId: string;
  contentHash: string;
  contentLength: number;
  capturedAt: string;
  metadata: {
    title?: string;
    statusCode: number;
    responseTime: number;
  };
}

interface SnapshotPanelProps {
  target: WatchTarget | null;
  onClose: () => void;
}

export function SnapshotPanel({ target, onClose }: SnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [contentId, setContentId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // Load snapshots on first render when target changes
  if (target && !loaded) {
    setLoaded(true);
    setLoading(true);
    fetch(`/api/snapshots?targetId=${target.id}&limit=50`)
      .then(res => res.json())
      .then(data => { setSnapshots(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  if (!target) return null;

  const viewContent = async (snapshotId: string) => {
    if (contentId === snapshotId) {
      setContent(null);
      setContentId(null);
      return;
    }
    try {
      const res = await fetch(`/api/snapshots/${snapshotId}`);
      const data = await res.json();
      setContent(data.content);
      setContentId(snapshotId);
    } catch (error) {
      console.error('Failed to load snapshot:', error);
    }
  };

  const handleClose = () => {
    setSnapshots([]);
    setContent(null);
    setContentId(null);
    setLoaded(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
      <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-500" />
              快照历史
            </h2>
            <p className="text-sm text-gray-500">{target.name}</p>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-gray-200 rounded-full transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">加载中...</div>
          ) : snapshots.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <History className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>暂无快照记录</p>
              <p className="text-xs mt-1">执行一次检查后会生成快照</p>
            </div>
          ) : (
            <div className="divide-y">
              {snapshots.map((snap, idx) => (
                <div key={snap.id}>
                  <div
                    className={`p-4 hover:bg-gray-50 transition cursor-pointer ${contentId === snap.id ? 'bg-purple-50' : ''}`}
                    onClick={() => viewContent(snap.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatTime(snap.capturedAt)}</p>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                            <span>状态码: {snap.metadata.statusCode}</span>
                            <span>响应: {snap.metadata.responseTime}ms</span>
                            <span>内容: {(snap.contentLength / 1024).toFixed(1)}KB</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400">{snap.contentHash.slice(0, 8)}</span>
                        <ChevronRight className={`w-4 h-4 text-gray-300 transition ${contentId === snap.id ? 'rotate-90' : ''}`} />
                      </div>
                    </div>
                  </div>
                  {contentId === snap.id && content !== null && (
                    <div className="px-4 pb-4">
                      <div className="bg-gray-900 rounded-lg overflow-hidden">
                        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between">
                          <span className="text-gray-400 text-xs">快照内容</span>
                          <span className="text-gray-500 text-xs">{snap.metadata.title}</span>
                        </div>
                        <pre className="p-4 text-xs text-gray-300 overflow-x-auto max-h-80 whitespace-pre-wrap break-words">
                          {content}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
