import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { chatWithLLMNonStream } from '@/lib/anythingllm';

const MANUAL_TRIGGER = /@(人工|manual)/i;

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

export interface ChatResult {
  conversationId: string;
  isNew: boolean;
  ended: boolean;
  userMessage: ChatMessage | null;
  replyMessages: ChatMessage[];
  waitingForAgent: boolean;
}

export function getHistory(conversationId: string) {
  const allMsgs = db.select().from(messages)
    .where(eq(messages.conversationId, conversationId))
    .orderBy(asc(messages.createdAt))
    .all();

  const conv = db.select().from(conversations)
    .where(eq(conversations.id, conversationId))
    .get();

  return {
    conversationId,
    messages: allMsgs.map((m) => ({ ...m, createdAt: new Date(m.createdAt).toISOString() })),
    waitingForAgent: conv?.waitingForAgent ?? false,
    ended: conv?.status === 'ended',
  };
}

export async function handleChat(
  conversationId: string | null,
  userContent: string
): Promise<ChatResult> {
  const trimmed = userContent.trim();
  let convId = conversationId;
  let isNew = false;

  // Reject if conversation has ended
  if (convId) {
    const existing = db.select().from(conversations).where(eq(conversations.id, convId)).get();
    if (!existing) {
      // Conversation was deleted — start fresh
      convId = null;
    } else if (existing.status === 'ended') {
      return {
        conversationId: convId,
        isNew: false,
        ended: true,
        userMessage: null,
        replyMessages: [],
        waitingForAgent: false,
      };
    }
  }

  if (!convId) {
    convId = uuid();
    isNew = true;
    const now = new Date();
    db.insert(conversations).values({
      id: convId,
      title: trimmed.slice(0, 30) + (trimmed.length > 30 ? '...' : ''),
      customerName: '访客',
      status: 'active',
      mode: 'ai',
      waitingForAgent: false,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  // Save user message
  const userMsg: ChatMessage = {
    id: uuid(),
    conversationId: convId,
    role: 'user',
    content: trimmed,
    createdAt: new Date().toISOString(),
  };
  db.insert(messages).values({
    ...userMsg,
    createdAt: new Date(userMsg.createdAt),
  }).run();

  const replyMessages: ChatMessage[] = [];

  // Check for manual trigger
  if (MANUAL_TRIGGER.test(trimmed)) {
    const sysMsg: ChatMessage = {
      id: uuid(),
      conversationId: convId,
      role: 'system',
      content: '已为您转接人工客服，请稍候...',
      createdAt: new Date().toISOString(),
    };
    db.insert(messages).values({
      ...sysMsg,
      createdAt: new Date(sysMsg.createdAt),
    }).run();
    replyMessages.push(sysMsg);

    db.update(conversations).set({
      waitingForAgent: true,
      mode: 'manual',
      updatedAt: new Date(),
    }).where(eq(conversations.id, convId)).run();

    return { conversationId: convId, isNew, ended: false, userMessage: userMsg, replyMessages, waitingForAgent: true };
  }

  // Normal AI chat
  try {
    const aiReply = await chatWithLLMNonStream(trimmed);
    const aiMsg: ChatMessage = {
      id: uuid(),
      conversationId: convId,
      role: 'assistant',
      content: aiReply,
      createdAt: new Date().toISOString(),
    };
    db.insert(messages).values({
      ...aiMsg,
      createdAt: new Date(aiMsg.createdAt),
    }).run();
    replyMessages.push(aiMsg);

    db.update(conversations).set({
      updatedAt: new Date(),
    }).where(eq(conversations.id, convId)).run();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    const errMsg: ChatMessage = {
      id: uuid(),
      conversationId: convId,
      role: 'assistant',
      content: `[错误] ${errorMsg}。请检查后台设置中的 API 配置。`,
      createdAt: new Date().toISOString(),
    };
    db.insert(messages).values({
      ...errMsg,
      createdAt: new Date(errMsg.createdAt),
    }).run();
    replyMessages.push(errMsg);
  }

  return { conversationId: convId, isNew, ended: false, userMessage: userMsg, replyMessages, waitingForAgent: false };
}
