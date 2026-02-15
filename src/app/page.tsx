'use client';

import { useState, useEffect } from 'react';
import type { WatchTarget, ChangeRecord, MonitorStats, SchedulerStatus } from '@/types';
import {
  AppHeader,
  StatsCards,
  TargetList,
  RecentChanges,
  ChangeSidebar,
  SnapshotPanel,
  AddTargetModal,
} from '@/components';

export default function Home() {
  const [targets, setTargets] = useState<WatchTarget[]>([]);
  const [changes, setChanges] = useState<(ChangeRecord & { target?: WatchTarget })[]>([]);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [selectedChange, setSelectedChange] = useState<(ChangeRecord & { target?: WatchTarget }) | null>(null);
  const [snapshotTarget, setSnapshotTarget] = useState<WatchTarget | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [targetsRes, changesRes, statsRes, schedulerRes] = await Promise.all([
        fetch('/api/targets'),
        fetch('/api/changes?limit=20'),
        fetch('/api/stats'),
        fetch('/api/scheduler'),
      ]);
      setTargets(await targetsRes.json());
      setChanges(await changesRes.json());
      setStats(await statsRes.json());
      setSchedulerStatus(await schedulerRes.json());
    } catch (error) {
      console.error('Failed to load data:', error);
    }
    setLoading(false);
  };

  const controlScheduler = async (action: 'start' | 'stop' | 'check-all') => {
    setSchedulerLoading(true);
    try {
      await fetch('/api/scheduler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      await loadData();
    } catch (error) {
      console.error('Failed to control scheduler:', error);
    }
    setSchedulerLoading(false);
  };

  const checkTarget = async (id: string) => {
    setCheckingId(id);
    try {
      await fetch(`/api/targets/${id}`, { method: 'POST' });
      await loadData();
    } catch (error) {
      console.error('Failed to check target:', error);
    }
    setCheckingId(null);
  };

  const deleteTarget = async (id: string) => {
    if (!confirm('确定要删除这个监控目标吗？')) return;
    try {
      await fetch(`/api/targets/${id}`, { method: 'DELETE' });
      await loadData();
    } catch (error) {
      console.error('Failed to delete target:', error);
    }
  };

  const toggleTarget = async (id: string, enabled: boolean) => {
    try {
      await fetch(`/api/targets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      await loadData();
    } catch (error) {
      console.error('Failed to toggle target:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader
        schedulerStatus={schedulerStatus}
        schedulerLoading={schedulerLoading}
        onControlScheduler={controlScheduler}
        onAddTarget={() => setShowAddForm(true)}
      />

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <StatsCards stats={stats} schedulerStatus={schedulerStatus} />

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TargetList
              targets={targets}
              loading={loading}
              checkingId={checkingId}
              onCheck={checkTarget}
              onToggle={toggleTarget}
              onDelete={deleteTarget}
              onSnapshots={setSnapshotTarget}
              onRefresh={loadData}
              onAddFirst={() => setShowAddForm(true)}
            />
          </div>
          <div>
            <RecentChanges changes={changes} onSelect={setSelectedChange} />
          </div>
        </div>
      </main>

      <ChangeSidebar change={selectedChange} onClose={() => setSelectedChange(null)} />
      <SnapshotPanel target={snapshotTarget} onClose={() => setSnapshotTarget(null)} />
      <AddTargetModal open={showAddForm} onClose={() => setShowAddForm(false)} onAdded={loadData} />
    </div>
  );
}
