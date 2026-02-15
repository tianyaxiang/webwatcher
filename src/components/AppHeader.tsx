'use client';

import { Eye, Play, Square, Zap, Plus, Download } from 'lucide-react';
import type { SchedulerStatus } from '@/types';

interface AppHeaderProps {
  schedulerStatus: SchedulerStatus | null;
  schedulerLoading: boolean;
  onControlScheduler: (action: 'start' | 'stop' | 'check-all') => void;
  onAddTarget: () => void;
}

export function AppHeader({ schedulerStatus, schedulerLoading, onControlScheduler, onAddTarget }: AppHeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Eye className="w-6 h-6 text-blue-500" />
              WebWatcher
            </h1>
            <p className="text-sm text-gray-500">智能网页变化监控</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2">
              {schedulerStatus?.isRunning ? (
                <button
                  onClick={() => onControlScheduler('stop')}
                  disabled={schedulerLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                  title="停止自动检查"
                >
                  <Square className="w-3 h-3" />
                  停止
                </button>
              ) : (
                <button
                  onClick={() => onControlScheduler('start')}
                  disabled={schedulerLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                  title="开始自动检查"
                >
                  <Play className="w-3 h-3" />
                  启动
                </button>
              )}
              <button
                onClick={() => onControlScheduler('check-all')}
                disabled={schedulerLoading}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                title="立即检查所有目标"
              >
                <Zap className={`w-3 h-3 ${schedulerLoading ? 'animate-pulse' : ''}`} />
                全部检查
              </button>
            </div>
            <a
              href="/api/export?format=markdown"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
              title="导出报告"
              download
            >
              <Download className="w-4 h-4" />
            </a>
            <a
              href="/api/export?format=csv"
              className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition"
              title="导出CSV"
              download
            >
              CSV
            </a>
            <button
              onClick={onAddTarget}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              <Plus className="w-4 h-4" />
              添加监控
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
