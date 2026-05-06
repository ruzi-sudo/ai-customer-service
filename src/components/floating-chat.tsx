'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageBubble } from '@/components/message-bubble';
import {
  MessageCircle,
  X,
  Maximize2,
  Send,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

const QUICK_REPLIES = ['物流查询', '退换货流程', '订单状态', '积分兑换'];

type ChatState = 'closed' | 'mini' | 'full';

export function FloatingChat() {
  const [chatState, setChatState] = useState<ChatState>('closed');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (chatState === 'mini' && messages.length > 0) {
      setHasUnread(false);
    }
  }, [chatState, messages.length]);

  const handleOpenMini = () => {
    setChatState('mini');
    setHasUnread(false);
  };

  const handleClose = () => {
    setChatState('closed');
  };

  const handleExpand = () => {
    router.push('/chat');
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading || waitingForAgent) return;

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          message: content.trim(),
        }),
      });

      if (!res.ok) throw new Error('请求失败');

      const data = await res.json();

      setConversationId(data.conversationId);
      setMessages(
        data.messages.map((m: Message) => ({
          ...m,
          createdAt: new Date(m.createdAt).toISOString(),
        }))
      );

      if (data.waitingForAgent) {
        setWaitingForAgent(true);
      }

      // If chat is closed, show unread indicator
      if (chatState === 'closed') {
        setHasUnread(true);
      }
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'system',
        content: '发送失败，请稍后重试。',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = () => {
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickReply = (reply: string) => {
    sendMessage(reply);
  };

  // --- Closed state: floating button ---
  if (chatState === 'closed') {
    return (
      <button
        onClick={handleOpenMini}
        className={cn(
          'fixed bottom-6 right-6 z-50',
          'size-14 rounded-full',
          'bg-emerald-600 text-white',
          'shadow-xl',
          'flex items-center justify-center',
          'transition-all duration-200',
          'hover:scale-105 hover:shadow-2xl',
          'active:scale-95',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2'
        )}
        aria-label="打开客服聊天"
      >
        <MessageCircle className="size-6" />
        {/* Online badge */}
        <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
        </span>
        {/* Unread dot */}
        {hasUnread && (
          <span className="absolute -top-1 -left-1 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            !
          </span>
        )}
        {/* Online label */}
        <span className="absolute -bottom-5 text-[10px] text-emerald-600 font-medium whitespace-nowrap">
          在线
        </span>
      </button>
    );
  }

  // --- Mini state: popup window ---
  return (
    <div
      className={cn(
        'fixed bottom-6 right-6 z-50',
        'flex flex-col',
        'w-[400px] h-[550px]',
        'rounded-2xl',
        'bg-white dark:bg-zinc-900',
        'shadow-2xl',
        'border border-zinc-200 dark:border-zinc-700',
        'overflow-hidden'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-white/20">
            <Sparkles className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm leading-tight">AI 客服</span>
            <div className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-200 animate-pulse" />
              <span className="text-[10px] text-emerald-100">在线</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleExpand}
            className="text-white/80 hover:text-white hover:bg-white/20"
            aria-label="展开到完整页面"
          >
            <Maximize2 className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleClose}
            className="text-white/80 hover:text-white hover:bg-white/20"
            aria-label="关闭聊天"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
            <div className="flex size-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
              <Sparkles className="size-7 text-emerald-600" />
            </div>
            <div>
              <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                你好！有什么可以帮助你的？
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                点击下方快捷回复或直接输入问题
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {QUICK_REPLIES.map((reply) => (
                <button
                  key={reply}
                  onClick={() => handleQuickReply(reply)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium',
                    'bg-zinc-100 text-zinc-700',
                    'dark:bg-zinc-800 dark:text-zinc-300',
                    'hover:bg-emerald-50 hover:text-emerald-700',
                    'dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400',
                    'transition-colors',
                    'border border-zinc-200 dark:border-zinc-700'
                  )}
                >
                  {reply}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} compact />
            ))}
            {isLoading && (
              <div className="flex items-center gap-2 text-zinc-400 text-xs pl-2">
                <Loader2 className="size-3.5 animate-spin" />
                <span>AI 正在思考...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-700 p-3">
        {waitingForAgent ? (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 py-2">
            <Loader2 className="size-4 animate-spin" />
            <span>等待人工客服接入...</span>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入消息..."
              className="min-h-[38px] max-h-[80px] resize-none text-sm py-2"
              rows={1}
            />
            <Button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg size-9"
              aria-label="发送消息"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
            </Button>
          </div>
        )}
        <p className="text-[10px] text-zinc-400 mt-1.5 text-center">
          按 Enter 发送，输入 @人工 转接人工客服
        </p>
      </div>
    </div>
  );
}
