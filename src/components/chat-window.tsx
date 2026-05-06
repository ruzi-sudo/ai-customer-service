'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageBubble } from '@/components/message-bubble';
import {
  RotateCcw,
  ArrowLeft,
  Send,
  Bot,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { MentionPopup } from '@/components/mention-popup';
import { connectSocket } from '@/lib/socket-client';
import type { Socket } from 'socket.io-client';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'agent' | 'system';
  content: string;
  createdAt: string;
}

const QUICK_REPLIES = ['物流查询', '退换货流程', '订单状态', '积分兑换'];

const CONV_ID_KEY = 'ai-cs-conversation-id';

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(CONV_ID_KEY) : null
  );
  const [waitingForAgent, setWaitingForAgent] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const convIdRef = useRef<string | null>(
    typeof window !== 'undefined' ? localStorage.getItem(CONV_ID_KEY) : null
  );
  const idCounter = useRef(0);

  // Keep ref in sync
  useEffect(() => { convIdRef.current = conversationId; }, [conversationId]);

  const handleReply = useCallback((msg: Message) => {
    setMessages((prev) => [...prev, msg]);
    setIsLoading(false);
  }, []);

  const handleConversation = useCallback(({ conversationId: cid }: { conversationId: string }) => {
    setConversationId(cid);
    localStorage.setItem(CONV_ID_KEY, cid);
    convIdRef.current = cid;
    socketRef.current?.emit('chat:join', cid);
  }, []);

  const handleWaiting = useCallback(({ waitingForAgent: w }: { waitingForAgent: boolean }) => {
    setWaitingForAgent(w);
  }, []);

  const handleStatus = useCallback((data: { waitingForAgent?: boolean; mode?: string; status?: string }) => {
    if (typeof data.waitingForAgent === 'boolean') setWaitingForAgent(data.waitingForAgent);
    if (data.status === 'ended') setSessionEnded(true);
  }, []);

  const handleEnded = useCallback(() => {
    setSessionEnded(true);
    setIsLoading(false);
  }, []);

  const handleError = useCallback(({ message }: { message: string }) => {
    const errMsg: Message = {
      id: `error-${Date.now()}`,
      role: 'system',
      content: message || '发送失败，请稍后重试。',
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, errMsg]);
    setIsLoading(false);
  }, []);

  const handleHistory = useCallback((data: { messages: Message[]; waitingForAgent: boolean; ended?: boolean }) => {
    if (data.messages?.length) {
      setMessages(data.messages.filter((m: Message) => m.content !== '__history__'));
      if (data.waitingForAgent) setWaitingForAgent(true);
    }
    if (data.ended) setSessionEnded(true);
  }, []);

  // Socket.IO connection + history restore
  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('chat:reply', handleReply);
    socket.on('chat:conversation', handleConversation);
    socket.on('chat:waiting', handleWaiting);
    socket.on('chat:status', handleStatus);
    socket.on('chat:ended', handleEnded);
    socket.on('chat:error', handleError);
    socket.on('chat:history', handleHistory);

    // Restore history
    const savedId = convIdRef.current;
    if (savedId) {
      convIdRef.current = savedId;
      socket.emit('chat:join', savedId);
      socket.emit('chat:history', savedId);
    }

    // Re-join room on reconnect
    socket.on('connect', () => {
      const cid = convIdRef.current;
      if (cid) {
        socket.emit('chat:join', cid);
      }
    });

    return () => {
      socket.off('chat:reply', handleReply);
      socket.off('chat:conversation', handleConversation);
      socket.off('chat:waiting', handleWaiting);
      socket.off('chat:status', handleStatus);
      socket.off('chat:ended', handleEnded);
      socket.off('chat:error', handleError);
      socket.off('chat:history', handleHistory);
    };
  }, [handleReply, handleConversation, handleWaiting, handleStatus, handleEnded, handleError, handleHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      textareaRef.current?.focus();
    }
  }, [isLoading, messages.length]);

  const sendMessage = (content: string) => {
    if (!content.trim() || isLoading || waitingForAgent || sessionEnded) return;

    const userMessage: Message = {
      id: `temp-${++idCounter.current}`,
      role: 'user',
      content: content.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    socketRef.current?.emit('chat:send', {
      conversationId: convIdRef.current,
      message: content.trim(),
    });
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

  const handleClear = () => {
    const cid = convIdRef.current;
    if (cid) socketRef.current?.emit('chat:leave', cid);
    setMessages([]);
    setConversationId(null);
    convIdRef.current = null;
    setWaitingForAgent(false);
    setSessionEnded(false);
    setInput('');
    localStorage.removeItem(CONV_ID_KEY);
  };

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-zinc-950">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/')}
            aria-label="返回首页"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-full bg-emerald-600 text-white">
              <Bot className="size-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-sm leading-tight text-zinc-900 dark:text-zinc-100">
                AI 智能客服
              </span>
              <div className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] text-zinc-500">在线</span>
              </div>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          aria-label="清空对话"
        >
          <RotateCcw className="size-4" />
        </Button>
      </header>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center">
              <div className="flex size-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/30">
                <Bot className="size-10 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                  你好！有什么可以帮助你的？
                </h2>
                <p className="text-sm text-zinc-500 mt-2 max-w-sm">
                  我是 AI 智能客服，可以帮你查询订单、了解退换货流程等。点击下方快捷问题开始对话。
                </p>
              </div>
              <div className="flex flex-wrap gap-2.5 justify-center mt-2">
                {QUICK_REPLIES.map((reply) => (
                  <button
                    key={reply}
                    onClick={() => handleQuickReply(reply)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium',
                      'bg-zinc-100 text-zinc-700',
                      'dark:bg-zinc-800 dark:text-zinc-300',
                      'hover:bg-emerald-50 hover:text-emerald-700',
                      'dark:hover:bg-emerald-900/30 dark:hover:text-emerald-400',
                      'transition-colors',
                      'border border-zinc-200 dark:border-zinc-700'
                    )}
                  >
                    <Sparkles className="size-3.5 inline-block mr-1.5 -mt-0.5" />
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-zinc-400 text-sm pl-12 py-2">
                  <Loader2 className="size-4 animate-spin" />
                  <span>AI 正在思考...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {sessionEnded ? (
            <div className="flex flex-col items-center justify-center gap-2 py-3">
              <p className="text-sm text-zinc-500">会话已结束</p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={handleClear}
              >
                开始新会话
              </Button>
            </div>
          ) : waitingForAgent ? (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-500 py-3">
              <Loader2 className="size-4 animate-spin" />
              <span>等待人工客服接入...</span>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <div className="flex-1 relative">
                <MentionPopup input={input} textareaRef={textareaRef} onSelect={setInput} />
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入消息..."
                  className="min-h-[44px] max-h-[120px] resize-none text-sm py-2.5"
                  rows={1}
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg size-10"
                aria-label="发送消息"
              >
                {isLoading ? (
                  <Loader2 className="size-4.5 animate-spin" />
                ) : (
                  <Send className="size-4.5" />
                )}
              </Button>
            </div>
          )}
          <p className="text-[11px] text-zinc-400 mt-2 text-center">
            Powered by AnythingLLM · 按 Enter 发送，输入 @人工 转接人工客服
          </p>
        </div>
      </div>
    </div>
  );
}
