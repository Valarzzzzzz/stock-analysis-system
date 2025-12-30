'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Conversation } from '@/types';
import { format } from 'date-fns';

export default function ReviewPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/conversations');
      const data = await res.json();
      if (data.success) {
        setConversations(data.data);
      }
    } catch (error) {
      console.error('获取对话列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const countPredictions = (conversation: Conversation): number => {
    return conversation.messages.filter(
      msg => msg.role === 'assistant' && msg.content.includes('支撑') && msg.content.includes('阻力')
    ).length;
  };

  const hasReview = async (conversationId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/review-conversation?conversationId=${conversationId}`);
      const data = await res.json();
      return data.success && data.data !== null;
    } catch {
      return false;
    }
  };

  const [reviewStatus, setReviewStatus] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const checkReviews = async () => {
      const status: { [key: string]: boolean } = {};
      for (const conv of conversations) {
        status[conv.id] = await hasReview(conv.id);
      }
      setReviewStatus(status);
    };
    if (conversations.length > 0) {
      checkReviews();
    }
  }, [conversations]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="text-xl font-bold text-black hover:text-gray-700"
          >
            ← Stock AI Analyzer
          </Link>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-2">复盘中心</h1>
        <p className="text-gray-600 mb-8">
          对历史对话中的预测进行复盘，评估AI预测的准确性
        </p>

        {conversations.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            暂无对话记录
            <Link href="/" className="block mt-4 text-black hover:underline">
              开始第一次对话
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {conversations.map((conversation) => {
              const predictionCount = countPredictions(conversation);
              const isReviewed = reviewStatus[conversation.id];

              return (
                <div
                  key={conversation.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
                >
                  <div className="flex items-start justify-between">
                    {/* 内容 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{conversation.title}</h3>
                        {isReviewed ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
                            已复盘
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
                            待复盘
                          </span>
                        )}
                      </div>

                      <div className="text-sm text-gray-500 mb-3">
                        {format(new Date(conversation.createdAt), 'yyyy-MM-dd HH:mm')}
                        <span className="mx-2">•</span>
                        {conversation.messages.length} 条消息
                        <span className="mx-2">•</span>
                        {predictionCount} 个预测
                      </div>

                      {/* 预览第一条用户消息 */}
                      {conversation.messages.length > 0 && (
                        <div className="text-sm text-gray-600 line-clamp-2">
                          {conversation.messages[0].content}
                        </div>
                      )}

                      {/* 操作按钮 */}
                      <div className="flex gap-3 mt-4">
                        {predictionCount > 0 && !isReviewed && (
                          <Link
                            href={`/review/${conversation.id}`}
                            className="px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition"
                          >
                            💬 开始复盘 ({predictionCount}个预测)
                          </Link>
                        )}
                        {isReviewed && (
                          <Link
                            href={`/review/${conversation.id}`}
                            className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded hover:bg-gray-200 transition"
                          >
                            📊 查看复盘结果
                          </Link>
                        )}
                        <Link
                          href={`/chat/${conversation.id}`}
                          className="px-4 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50 transition"
                        >
                          查看对话
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
