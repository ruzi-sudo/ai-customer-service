import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, asc } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { chatWithLLMNonStream } from '@/lib/anythingllm';

const MANUAL_TRIGGER = /@(人工|manual)/i;

export async function POST(request: NextRequest) {
  const { conversationId, message: userContent } = await request.json();

  if (!userContent?.trim()) {
    return NextResponse.json({ error: '消息不能为空' }, { status: 400 });
  }

  // Get or create conversation
  let convId = conversationId;
  if (!convId) {
    convId = uuid();
    const now = new Date();
    db.insert(conversations).values({
      id: convId,
      title: userContent.slice(0, 30) + (userContent.length > 30 ? '...' : ''),
      customerName: '访客',
      status: 'active',
      mode: 'ai',
      waitingForAgent: false,
      createdAt: now,
      updatedAt: now,
    }).run();
  }

  // Save user message
  const userMsgId = uuid();
  db.insert(messages).values({
    id: userMsgId,
    conversationId: convId,
    role: 'user',
    content: userContent.trim(),
    createdAt: new Date(),
  }).run();

  // Check for manual trigger
  if (MANUAL_TRIGGER.test(userContent)) {
    const sysMsgId = uuid();
    db.insert(messages).values({
      id: sysMsgId,
      conversationId: convId,
      role: 'system',
      content: '已为您转接人工客服，请稍候...',
      createdAt: new Date(),
    }).run();

    db.update(conversations).set({
      waitingForAgent: true,
      mode: 'manual',
      updatedAt: new Date(),
    }).where(eq(conversations.id, convId)).run();

    const allMsgs = db.select().from(messages)
      .where(eq(messages.conversationId, convId))
      .orderBy(asc(messages.createdAt))
      .all();

    return NextResponse.json({
      conversationId: convId,
      messages: allMsgs,
      waitingForAgent: true,
    });
  }

  // Normal AI chat
  try {
    const aiReply = await chatWithLLMNonStream(userContent);

    const aiMsgId = uuid();
    db.insert(messages).values({
      id: aiMsgId,
      conversationId: convId,
      role: 'assistant',
      content: aiReply,
      createdAt: new Date(),
    }).run();

    db.update(conversations).set({
      updatedAt: new Date(),
    }).where(eq(conversations.id, convId)).run();
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    const errMsgId = uuid();
    db.insert(messages).values({
      id: errMsgId,
      conversationId: convId,
      role: 'assistant',
      content: `[错误] ${errorMsg}。请检查后台设置中的 API 配置。`,
      createdAt: new Date(),
    }).run();
  }

  const allMsgs = db.select().from(messages)
    .where(eq(messages.conversationId, convId))
    .orderBy(asc(messages.createdAt))
    .all();

  return NextResponse.json({
    conversationId: convId,
    messages: allMsgs,
    waitingForAgent: false,
  });
}
