'use client';

import { useState, useEffect } from 'react';
import type { MonitorTemplate } from '@/types';

interface AddTargetModalProps {
  open: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddTargetModal({ open, onClose, onAdded }: AddTargetModalProps) {
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newSelector, setNewSelector] = useState('');
  const [newInterval, setNewInterval] = useState('1hour');
  const [newRenderMode, setNewRenderMode] = useState<'static' | 'browser'>('static');
  const [newWaitForSelector, setNewWaitForSelector] = useState('');
  const [newProxy, setNewProxy] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newWebhook, setNewWebhook] = useState('');
  const [newFeishuUrl, setNewFeishuUrl] = useState('');
  const [newWeComUrl, setNewWeComUrl] = useState('');
  const [newServerChanKey, setNewServerChanKey] = useState('');
  const [templates, setTemplates] = useState<Record<string, MonitorTemplate[]>>({});
  const [showTemplates, setShowTemplates] = useState(false);

  useEffect(() => {
    if (open) {
      fetch('/api/templates?grouped=true')
        .then(res => res.json())
        .then(setTemplates)
        .catch(() => {});
    }
  }, [open]);

  const applyTemplate = (t: MonitorTemplate) => {
    setNewUrl(t.url);
    setNewName(t.name);
    setNewSelector(t.selector || '');
    setNewInterval(t.checkInterval);
    setNewRenderMode(t.renderMode || 'static');
    setNewWaitForSelector(t.waitForSelector || '');
    setShowTemplates(false);
  };

  const resetForm = () => {
    setNewUrl(''); setNewName(''); setNewSelector('');
    setNewRenderMode('static'); setNewWaitForSelector(''); setNewProxy('');
    setNewEmail(''); setNewWebhook(''); setNewFeishuUrl('');
    setNewWeComUrl(''); setNewServerChanKey('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
          notifyFeishu: newFeishuUrl || undefined,
          notifyWeCom: newWeComUrl || undefined,
          notifyServerChan: newServerChanKey || undefined,
        }),
      });
      if (res.ok) {
        resetForm();
        onClose();
        onAdded();
      }
    } catch (error) {
      console.error('Failed to add target:', error);
    }
  };

  if (!open) return null;

  return (
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

        {showTemplates && (
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
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">网页 URL *</label>
            <input type="url" value={newUrl} onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com/page" required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            {newUrl.includes('{') && (
              <p className="text-xs text-orange-500 mt-1">⚠️ URL 包含占位符，请替换为实际值</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">名称 (可选)</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="我的监控"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CSS 选择器 (可选)</label>
            <input type="text" value={newSelector} onChange={(e) => setNewSelector(e.target.value)}
              placeholder=".main-content"
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            <p className="text-xs text-gray-500 mt-1">留空则监控整个页面主要内容</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">检查频率</label>
              <select value={newInterval} onChange={(e) => setNewInterval(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="5min">每 5 分钟</option>
                <option value="15min">每 15 分钟</option>
                <option value="30min">每 30 分钟</option>
                <option value="1hour">每小时</option>
                <option value="6hour">每 6 小时</option>
                <option value="1day">每天</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">渲染模式</label>
              <select value={newRenderMode} onChange={(e) => setNewRenderMode(e.target.value as 'static' | 'browser')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                <option value="static">静态抓取 (快速)</option>
                <option value="browser">浏览器渲染 (SPA)</option>
              </select>
            </div>
          </div>

          {newRenderMode === 'browser' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">等待选择器 (可选)</label>
              <input type="text" value={newWaitForSelector} onChange={(e) => setNewWaitForSelector(e.target.value)}
                placeholder=".content-loaded"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <p className="text-xs text-gray-500 mt-1">浏览器渲染后等待此元素出现再抓取</p>
            </div>
          )}

          <div className="border-t pt-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">高级设置 (可选)</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">代理地址</label>
                <input type="text" value={newProxy} onChange={(e) => setNewProxy(e.target.value)}
                  placeholder="http://user:pass@host:port 或留空使用代理池"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">邮件通知</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="alerts@example.com"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Webhook URL</label>
                <input type="url" value={newWebhook} onChange={(e) => setNewWebhook(e.target.value)}
                  placeholder="https://api.myapp.com/webhook"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🔵 飞书 Webhook</label>
                <input type="url" value={newFeishuUrl} onChange={(e) => setNewFeishuUrl(e.target.value)}
                  placeholder="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">🟢 企业微信 Webhook</label>
                <input type="url" value={newWeComUrl} onChange={(e) => setNewWeComUrl(e.target.value)}
                  placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">📱 Server酱 Key</label>
                <input type="text" value={newServerChanKey} onChange={(e) => setNewServerChanKey(e.target.value)}
                  placeholder="SCTxxx (sct.ftqq.com)"
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50 transition">
              取消
            </button>
            <button type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              添加
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
