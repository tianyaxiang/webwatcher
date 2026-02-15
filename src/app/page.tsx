'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Eye, Trash2, Clock, AlertTriangle, CheckCircle, ExternalLink, Play, Square, Zap } from 'lucide-react';
import type { WatchTarget, ChangeRecord, MonitorStats, SchedulerStatus } from '@/types';

export default function Home() {
  const [targets, setTargets] = useState<WatchTarget[]>([]);
  const [changes, setChanges] = useState<(ChangeRecord & { target?: WatchTarget })[]>([]);
  const [stats, setStats] = useState<MonitorStats | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [checkingId, setCheckingId] = useState<string | null>(null);
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  
  // Form state
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newSelector, setNewSelector] = useState('');
  const [newInterval, setNewInterval] = useState('1hour');
  const [newEmail, setNewEmail] = useState('');
  const [newWebhook, setNewWebhook] = useState('');
  
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
  
  const addTarget = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: newUrl,
          name: newName || undefined,
          selector: newSelector || undefined,
          checkInterval: newInterval,
          notifyEmail: newEmail || undefined,
          notifyWebhook: newWebhook || undefined,
        }),
      });
      
      if (res.ok) {
        setShowAddForm(false);
        setNewUrl('');
        setNewName('');
        setNewSelector('');
        setNewEmail('');
        setNewWebhook('');
        loadData();
      }
    } catch (error) {
      console.error('Failed to add target:', error);
    }
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
  
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return '从未';
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'text-red-500 bg-red-50';
      case 'medium': return 'text-yellow-500 bg-yellow-50';
      default: return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
              {/* Scheduler Controls */}
              <div className="flex items-center gap-2 mr-2">
                {schedulerStatus?.isRunning ? (
                  <button
                    onClick={() => controlScheduler('stop')}
                    disabled={schedulerLoading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                    title="停止自动检查"
                  >
                    <Square className="w-3 h-3" />
                    停止
                  </button>
                ) : (
                  <button
                    onClick={() => controlScheduler('start')}
                    disabled={schedulerLoading}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                    title="开始自动检查"
                  >
                    <Play className="w-3 h-3" />
                    启动
                  </button>
                )}
                <button
                  onClick={() => controlScheduler('check-all')}
                  disabled={schedulerLoading}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition"
                  title="立即检查所有目标"
                >
                  <Zap className={`w-3 h-3 ${schedulerLoading ? 'animate-pulse' : ''}`} />
                  全部检查
                </button>
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <Plus className="w-4 h-4" />
                添加监控
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        {stats && (
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
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Targets List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b flex justify-between items-center">
                <h2 className="font-semibold text-gray-900">监控列表</h2>
                <button
                  onClick={loadData}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                  title="刷新"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {loading ? (
                <div className="p-8 text-center text-gray-500">加载中...</div>
              ) : targets.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-2 opacity-30" />
                  <p>还没有监控目标</p>
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="mt-2 text-blue-500 hover:underline"
                  >
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
                            href={target.url}
                            target="_blank"
                            rel="noopener noreferrer"
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
                              <span className="text-orange-500">
                                上次变化: {formatTime(target.lastChangedAt)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => checkTarget(target.id)}
                            disabled={checkingId === target.id}
                            className="p-2 hover:bg-blue-100 text-blue-500 rounded-lg transition"
                            title="立即检查"
                          >
                            <RefreshCw className={`w-4 h-4 ${checkingId === target.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => toggleTarget(target.id, !target.enabled)}
                            className={`p-2 rounded-lg transition ${target.enabled ? 'hover:bg-yellow-100 text-yellow-500' : 'hover:bg-green-100 text-green-500'}`}
                            title={target.enabled ? '暂停' : '启用'}
                          >
                            {target.enabled ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteTarget(target.id)}
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
          </div>

          {/* Recent Changes */}
          <div>
            <div className="bg-white rounded-lg shadow-sm">
              <div className="p-4 border-b">
                <h2 className="font-semibold text-gray-900">最近变化</h2>
              </div>
              
              {changes.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-sm">
                  暂无变化记录
                </div>
              ) : (
                <div className="divide-y max-h-96 overflow-y-auto">
                  {changes.map(change => (
                    <div key={change.id} className="p-3 hover:bg-gray-50 transition">
                      <div className="flex items-start gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs ${getImportanceColor(change.importance)}`}>
                          {change.importance === 'high' ? '重要' : change.importance === 'medium' ? '一般' : '轻微'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {change.target?.name || '未知'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                            {change.changeSummary || '检测到内容变化'}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(change.detectedAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Add Target Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">添加监控目标</h2>
            <form onSubmit={addTarget} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  网页 URL *
                </label>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://example.com/page"
                  required
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  名称 (可选)
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="我的监控"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSS 选择器 (可选)
                </label>
                <input
                  type="text"
                  value={newSelector}
                  onChange={(e) => setNewSelector(e.target.value)}
                  placeholder=".main-content"
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">留空则监控整个页面主要内容</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  检查频率
                </label>
                <select
                  value={newInterval}
                  onChange={(e) => setNewInterval(e.target.value as any)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="5min">每 5 分钟</option>
                  <option value="15min">每 15 分钟</option>
                  <option value="30min">每 30 分钟</option>
                  <option value="1hour">每小时</option>
                  <option value="6hour">每 6 小时</option>
                  <option value="1day">每天</option>
                </select>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">通知设置 (可选)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">邮件地址</label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="alerts@example.com"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Webhook URL</label>
                    <input
                      type="url"
                      value={newWebhook}
                      onChange={(e) => setNewWebhook(e.target.value)}
                      placeholder="https://api.myapp.com/webhook"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                >
                  添加
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
