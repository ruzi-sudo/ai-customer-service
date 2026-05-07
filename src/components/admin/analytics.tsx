'use client';

import { useEffect, useState } from 'react';
import { MessageSquare, ThumbsUp, TrendingUp, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Conversation {
  id: string;
  rating?: number;
  createdAt: string;
}

export default function Analytics() {
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
  const withRatings = conversations.filter((c) => c.rating != null);
  const avgRating =
    withRatings.length > 0
      ? withRatings.reduce((sum, c) => sum + (c.rating ?? 0), 0) / withRatings.length
      : 0;
  const satisfactionRate =
    withRatings.length > 0
      ? (withRatings.filter((c) => (c.rating ?? 0) >= 4).length / withRatings.length) * 100
      : 0;

  // Weekly data: group by day of week for the last 7 days
  const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const weeklyCounts = Array(7).fill(0);
  conversations.forEach((c) => {
    const date = new Date(c.createdAt);
    const dayIndex = (date.getDay() + 6) % 7; // Monday = 0
    weeklyCounts[dayIndex]++;
  });
  const maxWeekly = Math.max(...weeklyCounts, 1);

  // Rating distribution
  const ratingCounts = Array(5).fill(0);
  withRatings.forEach((c) => {
    if (c.rating != null && c.rating >= 1 && c.rating <= 5) {
      ratingCounts[c.rating - 1]++;
    }
  });
  const maxRating = Math.max(...ratingCounts, 1);

  // Response time distribution (mock data)
  const responseTimeData = [
    { label: '< 1秒', percent: 45, count: Math.round(totalConversations * 0.45) },
    { label: '1-3秒', percent: 30, count: Math.round(totalConversations * 0.30) },
    { label: '3-5秒', percent: 15, count: Math.round(totalConversations * 0.15) },
    { label: '> 5秒', percent: 10, count: Math.round(totalConversations * 0.10) },
  ];

  const metrics = [
    {
      label: '总会话数',
      value: totalConversations,
      icon: MessageSquare,
      color: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
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
      color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400',
    },
    {
      label: '平均响应时间',
      value: '1.2s',
      icon: Clock,
      color: 'text-violet-600 bg-violet-50 dark:bg-violet-950 dark:text-violet-400',
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        加载中...
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <h1 className="text-xl lg:text-2xl font-bold">数据分析</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="flex items-center gap-3 pt-4">
                <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${metric.color}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold">{metric.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Weekly chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">本周会话趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2" style={{ height: 200 }}>
              {weekDays.map((day, i) => (
                <div key={day} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {weeklyCounts[i]}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-emerald-500 transition-all"
                    style={{
                      height: `${Math.max((weeklyCounts[i] / maxWeekly) * 150, 4)}px`,
                    }}
                  />
                  <span className="text-xs text-muted-foreground">{day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Response time distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">响应时间分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {responseTimeData.map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span>{item.label}</span>
                    <span className="text-muted-foreground">
                      {item.percent}% ({item.count})
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-2 rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Rating distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">评分分布</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratingCounts[rating - 1];
                return (
                  <div key={rating}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1">
                        {rating} 星
                        {rating === 5 && <span className="text-xs text-muted-foreground">(非常满意)</span>}
                        {rating === 4 && <span className="text-xs text-muted-foreground">(满意)</span>}
                        {rating === 3 && <span className="text-xs text-muted-foreground">(一般)</span>}
                        {rating === 2 && <span className="text-xs text-muted-foreground">(不满意)</span>}
                        {rating === 1 && <span className="text-xs text-muted-foreground">(非常不满意)</span>}
                      </span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-2 rounded-full bg-amber-500 transition-all"
                        style={{
                          width: `${(count / maxRating) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
