'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { Search, Headset, Send, Bot, User, X, MessageSquare, Info, Trash2, CheckSquare, Square, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { connectSocket } from '@/lib/socket-client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  customerName: string;
  title: string;
  status: string;
  mode: 'ai' | 'manual';
  waitingForAgent: boolean;
  rating: number | null;
  createdAt: string;
  updatedAt: string;
}

type FilterTab = 'all' | 'ai' | 'waiting' | 'manual' | 'ended';

function MessageItem({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  if (message.role === 'system') {
    return (
      <div className="flex justify-center my-2">
        <span className="flex items-center gap-1.5 text-xs text-zinc-400 italic bg-zinc-50 dark:bg-zinc-900 px-3 py-1 rounded-full">
          <Info className="size-3" />
          {message.content}
        </span>
      </div>
    );
  }

  const avatarMap: Record<string, React.ReactNode> = {
    user: (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
        <User className="size-3.5 text-zinc-600 dark:text-zinc-300" />
      </div>
    ),
    assistant: (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
        <Bot className="size-3.5 text-emerald-600 dark:text-emerald-400" />
      </div>
    ),
    agent: (
      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
        <Headset className="size-3.5 text-blue-600 dark:text-blue-400" />
      </div>
    ),
  };

  const labelMap: Record<string, string> = {
    user: '客户',
    assistant: 'AI',
    agent: '客服',
  };

  return (
    <div className={cn('flex gap-2', isUser && 'flex-row-reverse')}>
      {avatarMap[message.role]}
      <div
        className={cn(
          'max-w-[75%] rounded-lg px-3 py-2 text-sm',
          isUser
            ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900'
            : message.role === 'agent'
              ? 'bg-blue-50 text-zinc-900 dark:bg-blue-950 dark:text-zinc-100'
              : 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
        )}
      >
        {!isUser && (
          <p className={cn(
            'mb-1 text-xs font-medium',
            message.role === 'agent'
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-emerald-600 dark:text-emerald-400'
          )}>
            {labelMap[message.role]}
          </p>
        )}
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

export default function ConversationPanel() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterTab>('all');
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(() => {
    fetch('/api/conversations')
      .then((res) => res.json())
      .then((data) => {
        setConversations(Array.isArray(data) ? data : data.conversations ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fetchMessages = useCallback((convId: string) => {
    setMessagesLoading(true);
    fetch(`/api/conversations/${convId}`)
      .then((res) => res.json())
      .then((data) => {
        setMessages(data.messages ?? []);
      })
      .catch(() => setMessages([]))
      .finally(() => setMessagesLoading(false));
  }, []);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Socket.IO real-time updates
  useEffect(() => {
    const socket = connectSocket();
    socket.emit('admin:join');

    const handleMessage = (data: { conversationId: string; message: Message }) => {
      if (selectedId === data.conversationId) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    const handleConvUpdate = (data?: { conversationId?: string; mode?: string; status?: string; waitingForAgent?: boolean }) => {
      fetchConversations();
      if (data?.conversationId && selectedId === data.conversationId) {
        fetchMessages(data.conversationId);
      }
    };

    socket.on('admin:message', handleMessage);
    socket.on('admin:conversation-update', handleConvUpdate);

    return () => {
      socket.off('admin:message', handleMessage);
      socket.off('admin:conversation-update', handleConvUpdate);
      socket.emit('admin:leave');
    };
  }, [fetchConversations, fetchMessages, selectedId]);

  useEffect(() => {
    if (selectedId) {
      fetchMessages(selectedId);
    } else {
      setMessages([]);
    }
  }, [selectedId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  const filtered = conversations.filter((c) => {
    const matchesSearch =
      search === '' ||
      c.customerName.toLowerCase().includes(search.toLowerCase()) ||
      c.title.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'ai' && c.mode === 'ai' && !c.waitingForAgent && c.status !== 'ended') ||
      (filter === 'waiting' && c.waitingForAgent) ||
      (filter === 'manual' && c.mode === 'manual' && !c.waitingForAgent && c.status !== 'ended') ||
      (filter === 'ended' && c.status === 'ended');

    return matchesSearch && matchesFilter;
  });

  const handleAcceptConversation = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'manual', waitingForAgent: false }),
      });
      if (res.ok) {
        fetchConversations();
        fetchMessages(selectedId);
      }
    } catch {
      // ignore
    }
  };

  const handleEndManual = async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'ai', waitingForAgent: false }),
      });
      if (res.ok) {
        fetchConversations();
        fetchMessages(selectedId);
      }
    } catch {
      // ignore
    }
  };

  const handleDeleteSingle = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedId === id) setSelectedId(null);
        fetchConversations();
      }
    } catch {
      // ignore
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      const res = await fetch('/api/conversations', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (res.ok) {
        if (selectedIds.has(selectedId ?? '')) setSelectedId(null);
        setSelectedIds(new Set());
        fetchConversations();
      }
    } catch {
      // ignore
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const endedIds = filtered.filter((c) => c.status === 'ended').map((c) => c.id);
    if (endedIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(endedIds));
    }
  };

  const handleSendReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/agent-reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: replyText.trim() }),
      });
      if (res.ok) {
        setReplyText('');
        fetchMessages(selectedId);
        fetchConversations();
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (conv: Conversation) => {
    if (conv.status === 'ended') {
      return (
        <Badge className="bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
          已结束
        </Badge>
      );
    }
    if (conv.waitingForAgent) {
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          等待人工
        </Badge>
      );
    }
    if (conv.mode === 'manual') {
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
          人工服务
        </Badge>
      );
    }
    if (conv.status === 'active') {
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
          AI对话
        </Badge>
      );
    }
    return <Badge variant="secondary">已关闭</Badge>;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${month}月${day}日 ${hours}:${minutes}`;
  };

  const filterTabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'ai', label: 'AI对话' },
    { key: 'waiting', label: '等待人工' },
    { key: 'manual', label: '已接入' },
    { key: 'ended', label: '已结束' },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] lg:h-screen overflow-hidden rounded-lg border bg-white dark:bg-zinc-950">
      {/* Left panel - conversation list */}
      <div className={cn(
        'flex w-full shrink-0 flex-col border-r lg:w-80',
        selectedId ? 'hidden lg:flex' : 'flex'
      )}>
        {/* Search */}
        <div className="border-b p-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索会话..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>

        {/* Filter tabs - scrollable on mobile */}
        <div className="flex border-b px-1 overflow-x-auto">
          {filterTabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={cn(
                'flex-1 whitespace-nowrap px-2 py-2 text-xs font-medium transition-colors',
                filter === tab.key
                  ? 'border-b-2 border-emerald-600 text-emerald-600'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Conversation list */}
        <ScrollArea className="flex-1">
          {/* Batch delete toolbar */}
          {filter === 'ended' && filtered.length > 0 && (
            <div className="flex items-center justify-between border-b px-3 py-2 bg-zinc-50 dark:bg-zinc-900">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                {filtered.filter((c) => c.status === 'ended').every((c) => selectedIds.has(c.id)) ? (
                  <CheckSquare className="size-3.5" />
                ) : (
                  <Square className="size-3.5" />
                )}
                全选
              </button>
              {selectedIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleBatchDelete}
                >
                  <Trash2 className="size-3" />
                  删除 ({selectedIds.size})
                </Button>
              )}
            </div>
          )}
          <div className="divide-y">
            {filtered.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-3 text-left transition-colors',
                  selectedId === conv.id
                    ? 'bg-emerald-50 dark:bg-emerald-950'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-900'
                )}
              >
                {filter === 'ended' && conv.status === 'ended' && (
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(conv.id); }}
                    className="mt-1 shrink-0 text-zinc-400 hover:text-zinc-600"
                  >
                    {selectedIds.has(conv.id) ? (
                      <CheckSquare className="size-4 text-emerald-600" />
                    ) : (
                      <Square className="size-4" />
                    )}
                  </button>
                )}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(conv.id)}
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(conv.id); }}
                  className="flex flex-1 flex-col gap-1 text-left cursor-pointer"
                >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{conv.customerName}</span>
                  <div className="flex items-center gap-1.5">
                    {statusBadge(conv)}
                    {conv.status === 'ended' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteSingle(conv.id); }}
                        className="rounded p-1 text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                        aria-label="删除会话"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="truncate text-xs text-muted-foreground">{conv.title}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {formatDate(conv.updatedAt)}
                  </span>
                  {conv.waitingForAgent && (
                    <span className="flex size-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                暂无会话
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right panel - conversation detail */}
      <div className={cn(
        'flex flex-1 flex-col',
        selectedId ? 'flex' : 'hidden lg:flex'
      )}>
        {selected ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-3 py-3 lg:px-4">
              <div className="flex items-center gap-2 min-w-0">
                <button
                  onClick={() => setSelectedId(null)}
                  className="lg:hidden rounded-md p-1.5 text-zinc-500 hover:bg-zinc-100"
                >
                  <ArrowLeft className="size-4" />
                </button>
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold truncate">{selected.customerName}</h2>
                  <p className="text-xs text-muted-foreground truncate">{selected.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {statusBadge(selected)}
                {selected.status !== 'ended' && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden sm:inline-flex h-7 text-xs"
                    onClick={async () => {
                      if (!selectedId) return;
                      try {
                        const res = await fetch(`/api/conversations/${selectedId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ status: 'ended' }),
                        });
                        if (res.ok) {
                          fetchConversations();
                          fetchMessages(selectedId);
                        }
                      } catch {}
                    }}
                  >
                    结束会话
                  </Button>
                )}
                <button
                  onClick={() => setSelectedId(null)}
                  className="hidden lg:flex rounded-md p-1 text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="size-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-3 lg:p-4">
              {messagesLoading ? (
                <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
                  加载消息中...
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <MessageItem key={msg.id} message={msg} />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Action area */}
            <div className="border-t p-3">
              {selected.status === 'ended' && (
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => handleDeleteSingle(selected.id)}
                >
                  <Trash2 className="mr-2 size-4" />
                  删除此会话
                </Button>
              )}

              {!selected.status?.includes('ended') && selected.waitingForAgent && (
                <Button
                  onClick={handleAcceptConversation}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700"
                >
                  <Headset className="mr-2 size-4" />
                  接入对话
                </Button>
              )}

              {selected.mode === 'manual' && !selected.waitingForAgent && (
                <div className="space-y-2">
                  <Textarea
                    placeholder="输入回复内容..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    rows={2}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleSendReply}
                      disabled={sending || !replyText.trim()}
                      className="flex-1 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Send className="mr-2 size-4" />
                      {sending ? '发送中...' : '发送'}
                    </Button>
                    <Button variant="outline" onClick={handleEndManual}>
                      结束人工服务
                    </Button>
                  </div>
                </div>
              )}

              {selected.mode === 'ai' && !selected.waitingForAgent && (
                <div className="rounded-lg bg-zinc-50 p-3 text-center text-sm text-muted-foreground dark:bg-zinc-900">
                  当前为 AI 自动回复模式
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center">
              <MessageSquare className="mx-auto mb-3 size-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">请从左侧选择一个会话</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
