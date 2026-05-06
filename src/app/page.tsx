import { ClientFloatingChat } from '@/components/client-floating-chat';
import { Bot, MessageCircle, Settings } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-100">
      {/* Navbar */}
      <nav className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-zinc-900">AI 智能客服</span>
          </div>
          <Link
            href="/admin/login"
            className="text-xs text-zinc-500 hover:text-zinc-700 flex items-center gap-1.5"
          >
            <Settings className="h-3.5 w-3.5" />
            管理后台
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-3xl mx-auto px-6 py-24 text-center">
        <div className="h-20 w-20 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-8">
          <Bot className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-zinc-900 mb-3">
          AI 智能客服系统
        </h1>
        <p className="text-zinc-500 text-lg mb-4">
          基于 AnythingLLM 的智能客户服务解决方案
        </p>
        <p className="text-zinc-400 text-sm max-w-md mx-auto">
          支持智能问答、人工转接、多轮对话，为您的客户提供 7×24 小时专业服务
        </p>
        <div className="mt-8 flex justify-center gap-4 text-sm text-zinc-400">
          <div className="flex items-center gap-1.5">
            <MessageCircle className="h-4 w-4" />
            智能对话
          </div>
          <div className="flex items-center gap-1.5">
            <Bot className="h-4 w-4" />
            AI 驱动
          </div>
          <div className="flex items-center gap-1.5">
            <Settings className="h-4 w-4" />
            人工接入
          </div>
        </div>
        <p className="mt-12 text-xs text-zinc-400">
          点击右下角聊天图标开始体验 →
        </p>
      </div>

      {/* Floating Chat - client only */}
      <ClientFloatingChat />
    </div>
  );
}
