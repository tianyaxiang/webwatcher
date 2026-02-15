'use client';

import type { MonitorStats, SchedulerStatus } from '@/types';

interface StatsCardsProps {
  stats: MonitorStats | null;
  schedulerStatus: SchedulerStatus | null;
}

export function StatsCards({ stats, schedulerStatus }: StatsCardsProps) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-2xl font-bold text-blue-500">{stats.totalTargets}</div>
        <div className="text-sm text-gray-500">监控目标</div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-2xl font-bold text-green-500">{stats.activeTargets}</div>
        <div className="text-sm text-gray-500">活跃监控</div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-2xl font-bold text-orange-500">{stats.changesLast24h}</div>
        <div className="text-sm text-gray-500">24h 变化</div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="text-2xl font-bold text-purple-500">{stats.totalChanges}</div>
        <div className="text-sm text-gray-500">总变化数</div>
      </div>
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className={`text-2xl font-bold ${schedulerStatus?.isRunning ? 'text-green-500' : 'text-gray-400'}`}>
          {schedulerStatus?.isRunning ? '●' : '○'}
        </div>
        <div className="text-sm text-gray-500">
          {schedulerStatus?.isRunning ? `运行中 (${schedulerStatus.activeTargets})` : '已停止'}
        </div>
      </div>
    </div>
  );
}
