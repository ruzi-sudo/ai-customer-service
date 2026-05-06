import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { conversations, messages } from '@/lib/db/schema';
import { eq, desc, and, or } from 'drizzle-orm';
import { getAuthUser } from '@/lib/auth';
import { v4 as uuid } from 'uuid';

export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: '未登录' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const mode = searchParams.get('mode');
  const waiting = searchParams.get('waiting');

  const conditions = [];
  if (status) conditions.push(eq(conversations.status, status as 'active' | 'closed'));
  if (mode) conditions.push(eq(conversations.mode, mode as 'ai' | 'manual'));
  if (waiting === 'true') conditions.push(eq(conversations.waitingForAgent, true));

  const result = conditions.length > 0
    ? db.select().from(conversations).where(and(...conditions)).orderBy(desc(conversations.updatedAt)).all()
    : db.select().from(conversations).orderBy(desc(conversations.updatedAt)).all();

  return NextResponse.json({ conversations: result });
}

export async function POST(request: NextRequest) {
  const { customerName, title } = await request.json();

  const id = uuid();
  const now = new Date();
  db.insert(conversations).values({
    id,
    title: title || '新对话',
    customerName: customerName || '访客',
    status: 'active',
    mode: 'ai',
    waitingForAgent: false,
    createdAt: now,
    updatedAt: now,
  }).run();

  const conv = db.select().from(conversations).where(eq(conversations.id, id)).get();
  return NextResponse.json({ conversation: conv }, { status: 201 });
}
