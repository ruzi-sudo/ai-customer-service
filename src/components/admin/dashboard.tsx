'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, Users, ThumbsUp, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Conversation {
  id: string;
  customerName: string;
  title: string;
  status: string;
  rating?: number;
  createdAt: string;
  updatedAt: string;
}

export default function Dashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/conversations')
      .then((res) => res.json())
      .then((data) => {
        setConversations(Array.isArray(data) ? data : data.conversations ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const totalConversations = conversations.length;
  const activeConversations = conversations.filter((c) => c.status === 'active').length;
  const withRatings = conversations.filter((c) => c.rating != null);
  const avgRating =
    withRatings.length > 0
      ? withRatings.reduce((sum, c) => sum + (c.rating ?? 0), 0) / withRatings.length
      : 0;
  const satisfactionRate =
    withRatings.length > 0
      ? (withRatings.filter((c) => (c.rating ?? 0) >= 4).length / withRatings.length) * 100
      : 0;

  const recentConversations = [...conversations]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  const closedConversations = conversations.filter((c) => c.status === 'closed').length;

  const stats = [
    {
      label: '总会话数',
      value: totalConversations,
      icon: MessageSquare,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
    },
    {
      label: '活跃会话',
      value: activeConversations,
      icon: Users,
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400',
    },
    {
      label: '平均评分',
      value: avgRating > 0 ? avgRating.toFixed(1) : '-',
      icon: ThumbsUp,
      color: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
    },
    {
      label: '满意度',
      value: satisfactionRate > 0 ? `${satisfactionRate.toFixed(0)}%` : '-',
      icon: TrendingUp,
      color: 'text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400',
    },
  ];

  const statusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">活跃</Badge>;
      case 'closed':
        return <Badge variant="secondary">已关闭</Badge>;
      case 'waiting':
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">等待中</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin}分钟前`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}小时前`;
    const diffDay = Math.floor(diffHour / 24);
    if (diffDay < 7) return `${diffDay}天前`;
    return date.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">仪表盘</h1>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-3 pt-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${stat.color}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent conversations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">最近会话</CardTitle>
          </CardHeader>
          <CardContent>
            {recentConversations.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无会话记录</p>
            ) : (
              <div className="space-y-3">
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {conv.customerName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {conv.title}
                      </p>
                    </div>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      {statusBadge(conv.status)}
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conv.updatedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">会话状态分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>活跃会话</span>
                  <span className="font-medium">
                    {activeConversations} / {totalConversations}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${
                        totalConversations > 0
                          ? (activeConversations / totalConversations) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>已关闭会话</span>
                  <span className="font-medium">
                    {closedConversations} / {totalConversations}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-2 rounded-full bg-zinc-400 transition-all"
                    style={{
                      width: `${
                        totalConversations > 0
                          ? (closedConversations / totalConversations) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
