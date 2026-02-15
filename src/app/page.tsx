'use client';

import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Eye, Trash2, Clock, AlertTriangle, CheckCircle, ExternalLink, Play, Square, Zap, X, ChevronRight, History } from 'lucide-react';
import type { WatchTarget, ChangeRecord, MonitorStats, SchedulerStatus, MonitorTemplate } from '@/types';

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
  const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotContent, setSnapshotContent] = useState<string | null>(null);
  const [snapshotContentId, setSnapshotContentId] = useState<string | null>(null);
  
  // Form state
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newSelector, setNewSelector] = useState('');
  const [newInterval, setNewInterval] = useState('1hour');
  const [newRenderMode, setNewRenderMode] = useState<'static' | 'browser'>('static');
  const [newWaitForSelector, setNewWaitForSelector] = useState('');
  const [newProxy, setNewProxy] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWebhook, setNewWebhook] = useState('');
  const [templates, setTemplates] = useState<Record<string, MonitorTemplate[]>>({});
  const [showTemplates, setShowTemplates] = useState(false);
  
  useEffect(() => {
    loadData();
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/templates?grouped=true');
      setTemplates(await res.json());
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const applyTemplate = (t: MonitorTemplate) => {
    setNewUrl(t.url);
    setNewName(t.name);
    setNewSelector(t.selector || '');
    setNewInterval(t.checkInterval);
    setNewRenderMode(t.renderMode || 'static');
    setNewWaitForSelector(t.waitForSelector || '');
    setShowTemplates(false);
  };
  
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
          renderMode: newRenderMode !== 'static' ? newRenderMode : undefined,
          waitForSelector: newWaitForSelector || undefined,
          proxy: newProxy || undefined,
          notifyEmail: newEmail || undefined,
          notifyWebhook: newWebhook || undefined,
        }),
      });
      
      if (res.ok) {
        setShowAddForm(false);
        setNewUrl('');
        setNewName('');
        setNewSelector('');
        setNewRenderMode('static');
        setNewWaitForSelector('');
        setNewProxy('');
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
  
  const openSnapshots = async (target: WatchTarget) => {
    setSnapshotTarget(target);
    setSnapshots([]);
    setSnapshotContent(null);
    setSnapshotContentId(null);
    setSnapshotsLoading(true);
    try {
      const res = await fetch(`/api/snapshots?targetId=${target.id}&limit=50`);
      setSnapshots(await res.json());
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    }
    setSnapshotsLoading(false);
  };
  
  const viewSnapshotContent = async (snapshotId: string) => {
    if (snapshotContentId === snapshotId) {
      setSnapshotContent(null);
      setSnapshotContentId(null);
      return;
    }
    try {
      const res = await fetch(`/api/snapshots/${snapshotId}`);
      const data = await res.json();
      setSnapshotContent(data.content);
      setSnapshotContentId(snapshotId);
    } catch (error) {
      console.error('Failed to load snapshot content:', error);
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
                            onClick={() => openSnapshots(target)}
                            className="p-2 hover:bg-purple-100 text-purple-500 rounded-lg transition"
                            title="快照历史"
                          >
                            <History className="w-4 h-4" />
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
                    <div 
                      key={change.id} 
                      className="p-3 hover:bg-gray-50 transition cursor-pointer group"
                      onClick={() => setSelectedChange(change)}
                    >
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
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-gray-400">
                              {formatTime(change.detectedAt)}
                            </p>
                            <ChevronRight className="w-3 h-3 text-gray-300 group-hover:text-blue-500 transition" />
                          </div>
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

      {/* Change Detail Sidebar/Modal */}
      {selectedChange && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900">变化详情</h2>
                <p className="text-sm text-gray-500">{selectedChange.target?.name}</p>
              </div>
              <button 
                onClick={() => setSelectedChange(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">变化摘要</h3>
                  <div className="p-4 bg-blue-50 text-blue-800 rounded-lg border border-blue-100">
                    {selectedChange.changeSummary || '检测到网页内容发生变化。'}
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
                      {selectedChange.diffHtml ? (
                        <div 
                          className="space-y-0.5"
                          dangerouslySetInnerHTML={{ __html: selectedChange.diffHtml }} 
                        />
                      ) : (
                        <div className="text-gray-500 italic">暂无详细对比数据</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="text-xs text-gray-400 mb-1">检测时间</div>
                    <div className="text-sm font-medium">{formatTime(selectedChange.detectedAt)}</div>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="text-xs text-gray-400 mb-1">重要程度</div>
                    <div className="text-sm font-medium capitalize">
                      <span className={`px-2 py-0.5 rounded text-xs ${getImportanceColor(selectedChange.importance)}`}>
                        {selectedChange.importance}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <a 
                    href={selectedChange.target?.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
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
      )}

      {/* Snapshot History Panel */}
      {snapshotTarget && (
        <div className="fixed inset-0 bg-black/50 flex justify-end z-50">
          <div className="bg-white w-full max-w-2xl h-full flex flex-col shadow-2xl">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-500" />
                  快照历史
                </h2>
                <p className="text-sm text-gray-500">{snapshotTarget.name}</p>
              </div>
              <button 
                onClick={() => { setSnapshotTarget(null); setSnapshotContent(null); setSnapshotContentId(null); }}
                className="p-2 hover:bg-gray-200 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {snapshotsLoading ? (
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
                        className={`p-4 hover:bg-gray-50 transition cursor-pointer ${snapshotContentId === snap.id ? 'bg-purple-50' : ''}`}
                        onClick={() => viewSnapshotContent(snap.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {formatTime(snap.capturedAt)}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                                <span>状态码: {snap.metadata.statusCode}</span>
                                <span>响应: {snap.metadata.responseTime}ms</span>
                                <span>内容: {(snap.contentLength / 1024).toFixed(1)}KB</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-gray-400">{snap.contentHash.slice(0, 8)}</span>
                            <ChevronRight className={`w-4 h-4 text-gray-300 transition ${snapshotContentId === snap.id ? 'rotate-90' : ''}`} />
                          </div>
                        </div>
                      </div>
                      {snapshotContentId === snap.id && snapshotContent !== null && (
                        <div className="px-4 pb-4">
                          <div className="bg-gray-900 rounded-lg overflow-hidden">
                            <div className="bg-gray-800 px-4 py-2 border-b border-gray-700 flex justify-between">
                              <span className="text-gray-400 text-xs">快照内容</span>
                              <span className="text-gray-500 text-xs">{snap.metadata.title}</span>
                            </div>
                            <pre className="p-4 text-xs text-gray-300 overflow-x-auto max-h-80 whitespace-pre-wrap break-words">
                              {snapshotContent}
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
      )}

      {/* Add Target Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">添加监控目标</h2>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-sm px-3 py-1 bg-purple-100 text-purple-600 rounded-lg hover:bg-purple-200 transition"
              >
                {showTemplates ? '手动填写' : '📋 从模板选择'}
              </button>
            </div>

            {/* Template Picker */}
            {showTemplates ? (
              <div className="space-y-4 mb-4">
                {Object.entries(templates).map(([category, items]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-500 mb-2">{category}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map(t => (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t)}
                          className="text-left p-3 border rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{t.icon}</span>
                            <span className="text-sm font-medium">{t.name}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{t.description}</p>
                          {t.renderMode === 'browser' && (
                            <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 bg-orange-100 text-orange-600 rounded">需浏览器渲染</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

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
                {newUrl.includes('{') && (
                  <p className="text-xs text-orange-500 mt-1">⚠️ URL 包含占位符，请替换为实际值</p>
                )}
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

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    渲染模式
                  </label>
                  <select
                    value={newRenderMode}
                    onChange={(e) => setNewRenderMode(e.target.value as 'static' | 'browser')}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="static">静态抓取 (快速)</option>
                    <option value="browser">浏览器渲染 (SPA)</option>
                  </select>
                </div>
              </div>

              {newRenderMode === 'browser' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    等待选择器 (可选)
                  </label>
                  <input
                    type="text"
                    value={newWaitForSelector}
                    onChange={(e) => setNewWaitForSelector(e.target.value)}
                    placeholder=".content-loaded"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">浏览器渲染后等待此元素出现再抓取</p>
                </div>
              )}

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">高级设置 (可选)</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">代理地址</label>
                    <input
                      type="text"
                      value={newProxy}
                      onChange={(e) => setNewProxy(e.target.value)}
                      placeholder="http://user:pass@host:port 或留空使用代理池"
                      className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">邮件通知</label>
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
