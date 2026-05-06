import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { messages, conversations } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const { content } = await request.json();

  if (!content?.trim()) {
    return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 });
  }

  const conv = db.select().from(conversations).where(eq(conversations.id, id)).get();
  if (!conv) return NextResponse.json({ error: '会话不存在' }, { status: 404 });

  const msgId = uuid();
  db.insert(messages).values({
    id: msgId,
    conversationId: id,
    role: 'agent',
    content: content.trim(),
    createdAt: new Date(),
  }).run();

  // Update conversation: no longer waiting, set mode to manual
  db.update(conversations).set({
    waitingForAgent: false,
    mode: 'manual',
    updatedAt: new Date(),
  }).where(eq(conversations.id, id)).run();

  const msg = db.select().from(messages).where(eq(messages.id, msgId)).get();

  // Push to customer via Socket.IO
  const io = (globalThis as any).__io;
  if (io && msg) {
    const msgData = { ...msg, createdAt: new Date(msg.createdAt).toISOString() };
    io.to(`conv:${id}`).emit('chat:reply', msgData);
    io.to('admin').emit('admin:message', { conversationId: id, message: msgData });
  }

  return NextResponse.json({ message: msg }, { status: 201 });
}
