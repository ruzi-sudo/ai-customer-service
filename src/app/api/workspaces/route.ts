import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAnythingLLMConfig } from '@/lib/anythingllm';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const config = await getAnythingLLMConfig();

  if (!config.apiBaseUrl) {
    return NextResponse.json({ error: '请先配置 API 地址' }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const res = await fetch(`${config.apiBaseUrl}/api/v1/workspaces`, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `API 返回 ${res.status}: ${text || res.statusText}` },
        { status: res.status }
      );
    }

    const data = await res.json();

    // AnythingLLM returns { workspaces: [...] }
    const workspaces = (data.workspaces ?? data ?? []).map((ws: Record<string, unknown>) => ({
      slug: ws.slug ?? ws.name ?? '',
      name: ws.name ?? ws.slug ?? '',
    }));

    return NextResponse.json({ workspaces });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: `连接失败: ${msg}` }, { status: 502 });
  }
}
