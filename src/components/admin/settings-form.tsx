'use client';

import { useEffect, useState } from 'react';
import {
  Globe,
  Key,
  Database,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

interface Settings {
  api_base_url: string;
  api_key: string;
  workspace_slug: string;
  chat_mode: string;
}

interface Workspace {
  slug: string;
  name: string;
}

export default function SettingsForm() {
  const [settings, setSettings] = useState<Settings>({
    api_base_url: '',
    api_key: '',
    workspace_slug: '',
    chat_mode: 'chat',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Workspace list
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [fetchingWs, setFetchingWs] = useState(false);
  const [wsError, setWsError] = useState('');
  // Connection test
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const [needsSave, setNeedsSave] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
      .then((data) => {
        const s = data.settings ?? data;
        if (s && typeof s === 'object') {
          setSettings((prev) => ({
            ...prev,
            api_base_url: s.api_base_url ?? '',
            api_key: s.api_key ?? '',
            workspace_slug: s.workspace_slug ?? '',
            chat_mode: s.chat_mode ?? 'chat',
          }));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '保存失败');
        return;
      }

      setSuccess(true);
      setNeedsSave(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    // Save first so the backend has the latest config
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      setNeedsSave(false);
    } catch {
      // continue
    }

    try {
      const res = await fetch('/api/workspaces');
      setTestResult(res.ok ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
    }
  };

  const handleFetchWorkspaces = async () => {
    // Auto-save first so the API route reads the latest config
    if (needsSave) {
      setSaving(true);
      try {
        await fetch('/api/settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(settings),
        });
        setNeedsSave(false);
      } catch {
        // continue anyway
      }
      setSaving(false);
    }

    setFetchingWs(true);
    setWsError('');
    setWorkspaces([]);

    try {
      const res = await fetch('/api/workspaces');
      const data = await res.json();

      if (!res.ok) {
        setWsError(data.error || '获取工作区失败');
        return;
      }

      const ws: Workspace[] = data.workspaces ?? [];
      setWorkspaces(ws);

      if (ws.length === 0) {
        setWsError('未找到任何工作区，请先在 AnythingLLM 中创建工作区');
      }
    } catch {
      setWsError('网络错误');
    } finally {
      setFetchingWs(false);
    }
  };

  const updateField = (key: keyof Settings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setNeedsSave(true);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-900">系统设置</h1>
        <p className="text-sm text-zinc-500 mt-0.5">配置 AnythingLLM 连接参数</p>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl space-y-4">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3.5 py-2.5 text-sm text-red-600">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3.5 py-2.5 text-sm text-emerald-600 flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            设置已保存
          </div>
        )}

        {/* API 配置 */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-sm">API 连接</CardTitle>
            <CardDescription className="text-xs">
              填写地址和密钥后保存，再拉取工作区列表
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="api_url" className="text-xs">API 地址</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <Input
                  id="api_url"
                  placeholder="http://localhost:3001"
                  value={settings.api_base_url}
                  onChange={(e) => updateField('api_base_url', e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="api_key" className="text-xs">API 密钥</Label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                <Input
                  id="api_key"
                  type="password"
                  placeholder="留空则不使用认证"
                  value={settings.api_key}
                  onChange={(e) => updateField('api_key', e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <p className="text-[10px] text-zinc-400">
                在 AnythingLLM 管理 → API Keys 中生成
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="submit"
                className="bg-zinc-900 hover:bg-zinc-800 text-white text-xs h-9"
                disabled={saving}
              >
                {saving ? '保存中...' : '保存配置'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-9 gap-1.5"
                onClick={handleTestConnection}
                disabled={testing || !settings.api_base_url}
              >
                {testing ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                测试连接
              </Button>
              {needsSave && (
                <Badge variant="secondary" className="text-[10px]">未保存</Badge>
              )}
              {testResult === 'success' && (
                <span className="flex items-center gap-1 text-xs text-emerald-600">
                  <CheckCircle2 className="size-3.5" /> 连接成功
                </span>
              )}
              {testResult === 'error' && (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <XCircle className="size-3.5" /> 连接失败
                </span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 工作区选择 */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm">工作区</CardTitle>
                <CardDescription className="text-xs">
                  从 AnythingLLM 拉取可用的工作区列表
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5"
                onClick={handleFetchWorkspaces}
                disabled={fetchingWs || !settings.api_base_url}
              >
                {fetchingWs ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="size-3.5" />
                )}
                {fetchingWs ? '拉取中...' : '拉取工作区'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {wsError && (
              <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
                {wsError}
              </div>
            )}

            {workspaces.length > 0 ? (
              <div className="grid gap-2">
                <Label className="text-xs">选择工作区</Label>
                <Select
                  value={settings.workspace_slug}
                  onValueChange={(v) => updateField('workspace_slug', v ?? '')}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <div className="flex items-center gap-2">
                      <Database className="size-3.5 text-zinc-400" />
                      <SelectValue placeholder="选择一个工作区" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {workspaces.map((ws) => (
                      <SelectItem key={ws.slug} value={ws.slug}>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{ws.name}</span>
                          <span className="text-zinc-400 text-xs">{ws.slug}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-zinc-400">
                  已找到 {workspaces.length} 个工作区
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-6 text-center">
                <Database className="size-6 text-zinc-300 mx-auto mb-2" />
                <p className="text-xs text-zinc-400">
                  点击右上角「拉取工作区」按钮获取列表
                </p>
              </div>
            )}

            {/* 允许手动输入 */}
            <details className="group">
              <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-600 select-none">
                手动输入工作区名称
              </summary>
              <div className="mt-2">
                <div className="relative">
                  <Database className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-zinc-400" />
                  <Input
                    placeholder="手动输入 workspace slug"
                    value={settings.workspace_slug}
                    onChange={(e) => updateField('workspace_slug', e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>
            </details>

            <div className="grid gap-2">
              <Label className="text-xs">聊天模式</Label>
              <Select
                value={settings.chat_mode}
                onValueChange={(v) => updateField('chat_mode', v ?? '')}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">chat — 多轮对话</SelectItem>
                  <SelectItem value="query">query — 单轮查询</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {needsSave && (
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                disabled={saving}
              >
                {saving ? '保存中...' : '保存工作区设置'}
              </Button>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
