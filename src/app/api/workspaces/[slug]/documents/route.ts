import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAnythingLLMConfig } from '@/lib/anythingllm';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { slug } = await params;
  const config = await getAnythingLLMConfig();

  try {
    const res = await fetch(`${config.apiBaseUrl}/api/v1/workspace/${slug}`, {
      headers: buildHeaders(config),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `获取工作区失败: ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const ws = data.workspace ?? data;
    return NextResponse.json({
      workspace: {
        slug: ws.slug ?? slug,
        name: ws.name ?? slug,
        documents: ws.documents ?? [],
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { slug } = await params;
  const config = await getAnythingLLMConfig();

  const formData = await req.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: '请选择文件' }, { status: 400 });
  }

  try {
    // 1. Upload the file to AnythingLLM
    const uploadForm = new FormData();
    uploadForm.set('file', file);

    const uploadRes = await fetch(`${config.apiBaseUrl}/api/v1/document/upload`, {
      method: 'POST',
      headers: {
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        Accept: 'application/json',
      },
      body: uploadForm,
      signal: AbortSignal.timeout(60000),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => uploadRes.statusText);
      return NextResponse.json(
        { error: `上传失败: ${errText}` },
        { status: uploadRes.status }
      );
    }

    const uploadData = await uploadRes.json();
    const docName = uploadData.document?.docpath ?? uploadData.documents?.[0]?.docpath ?? file.name;

    // 2. Add document to workspace and update embeddings
    const addRes = await fetch(
      `${config.apiBaseUrl}/api/v1/workspace/${slug}/update-embeddings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        },
        body: JSON.stringify({
          adds: [docName],
        }),
        signal: AbortSignal.timeout(120000),
      }
    );

    if (!addRes.ok) {
      const errText = await addRes.text().catch(() => addRes.statusText);
      return NextResponse.json(
        { error: `嵌入工作区失败: ${errText}` },
        { status: addRes.status }
      );
    }

    return NextResponse.json({
      success: true,
      document: { name: docName, originalName: file.name },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : '未知错误';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

function buildHeaders(config: { apiKey: string }): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) h['Authorization'] = `Bearer ${config.apiKey}`;
  return h;
}
