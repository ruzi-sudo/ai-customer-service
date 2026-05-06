import { db } from '@/lib/db';
import { settings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

async function getSetting(key: string): Promise<string> {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? '';
}

export interface AnythingLLMConfig {
  apiBaseUrl: string;
  apiKey: string;
  workspaceSlug: string;
  mode: string;
}

export async function getAnythingLLMConfig(): Promise<AnythingLLMConfig> {
  return {
    apiBaseUrl: await getSetting('api_base_url'),
    apiKey: await getSetting('api_key'),
    workspaceSlug: await getSetting('workspace_slug'),
    mode: await getSetting('chat_mode'),
  };
}

export async function chatWithLLM(message: string): Promise<ReadableStream> {
  const config = await getAnythingLLMConfig();

  const response = await fetch(
    `${config.apiBaseUrl}/api/v1/workspace/${config.workspaceSlug}/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ message, mode: config.mode || 'chat' }),
    }
  );

  if (!response.ok) {
    throw new Error(`AnythingLLM API error: ${response.status}`);
  }

  return response.body!;
}

export async function chatWithLLMNonStream(message: string): Promise<string> {
  const config = await getAnythingLLMConfig();

  const response = await fetch(
    `${config.apiBaseUrl}/api/v1/workspace/${config.workspaceSlug}/chat`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({ message, mode: config.mode || 'chat' }),
    }
  );

  if (!response.ok) {
    throw new Error(`AnythingLLM API error: ${response.status}`);
  }

  const data = await response.json();
  return data.textResponse || '抱歉，暂时无法回复。';
}
