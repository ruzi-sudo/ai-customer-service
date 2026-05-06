import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, desc, asc } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { sql } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const conv = db.select().from(conversations).where(eq(conversations.id, id)).get();
  if (!conv) return NextResponse.json({ error: '会话不存在' }, { status: 404 });

  const msgs = db.select().from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt))
    .all();

  return NextResponse.json({ conversation: conv, messages: msgs });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();

  const updates: Record<string, unknown> = { updatedAt: new Date() };
  if (body.status) updates.status = body.status;
  if (body.mode) updates.mode = body.mode;
  if ('waitingForAgent' in body) updates.waitingForAgent = body.waitingForAgent;
  if ('rating' in body) updates.rating = body.rating;
  if (body.title) updates.title = body.title;

  db.update(conversations).set(updates).where(eq(conversations.id, id)).run();

  const conv = db.select().from(conversations).where(eq(conversations.id, id)).get();

  // Push updates via Socket.IO
  const io = (globalThis as any).__io;
  if (io) {
    // Notify customer in the conversation
    io.to(`conv:${id}`).emit('chat:status', {
      conversationId: id,
      mode: conv?.mode,
      status: conv?.status,
      waitingForAgent: conv?.waitingForAgent,
    });

    // Notify admin panel
    io.to('admin').emit('admin:conversation-update', {
      conversationId: id,
      mode: conv?.mode,
      status: conv?.status,
      waitingForAgent: conv?.waitingForAgent,
    });
  }

  return NextResponse.json({ conversation: conv });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { id } = await params;
  const conv = db.select().from(conversations).where(eq(conversations.id, id)).get();
  if (!conv) return NextResponse.json({ error: '会话不存在' }, { status: 404 });

  db.delete(messages).where(eq(messages.conversationId, id)).run();
  db.delete(conversations).where(eq(conversations.id, id)).run();

  return NextResponse.json({ success: true });
}
