'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Analysis } from '@/types';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const fetchAnalyses = async () => {
    try {
      const res = await fetch('/api/analyses');
      const data = await res.json();
      if (data.success) {
        setAnalyses(data.data);
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'reviewed') {
      return (
        <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">
          已复盘
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs rounded-full bg-yellow-100 text-yellow-700">
        待复盘
      </span>
    );
  };

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
          <Link
            href="/review"
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
          >
            💬 对话级复盘
          </Link>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">历史分析记录</h1>
          <p className="text-gray-600">
            这里显示所有通过"保存为分析"功能保存的单个分析记录
          </p>
        </div>

        {analyses.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-6xl mb-4">📊</div>
            <p className="mb-2">暂无分析记录</p>
            <p className="text-sm mb-6">
              在对话中使用"💾 保存为分析"按钮来创建分析记录
            </p>
            <Link href="/" className="inline-block px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition">
              开始分析
            </Link>
          </div>
        ) : (
          <div className="grid gap-6">
            {analyses.map((analysis) => (
              <div
                key={analysis.id}
                className="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition"
              >
                <div className="flex items-start gap-6">
                  {/* 图片 */}
                  {analysis.imageUrl && (
                    <img
                      src={analysis.imageUrl}
                      alt="Stock Chart"
                      className="w-32 h-32 object-cover rounded border border-gray-200"
                    />
                  )}

                  {/* 内容 */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm text-gray-500">
                        {format(new Date(analysis.createdAt), 'yyyy-MM-dd HH:mm')}
                        {analysis.stockCode && (
                          <span className="ml-2 font-medium text-black">
                            [{analysis.stockCode}]
                          </span>
                        )}
                      </div>
                      {getStatusBadge(analysis.status)}
                    </div>

                    {analysis.userInput && (
                      <div className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded">
                        <span className="font-medium">用户输入：</span>
                        {analysis.userInput}
                      </div>
                    )}

                    <div className="bg-white border border-gray-200 rounded p-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">AI 分析结果：</div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                        <div className="bg-green-50 p-3 rounded">
                          <div className="text-gray-500 text-xs mb-1">支撑位</div>
                          <div className="font-bold text-green-600 text-lg">
                            {analysis.aiAnalysis.keyLevels.support}
                          </div>
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <div className="text-gray-500 text-xs mb-1">阻力位</div>
                          <div className="font-bold text-red-600 text-lg">
                            {analysis.aiAnalysis.keyLevels.resistance}
                          </div>
                        </div>
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-gray-500 text-xs mb-1">操作方向</div>
                          <div className="font-bold text-blue-600 text-lg">
                            {analysis.aiAnalysis.direction}
                          </div>
                        </div>
                        <div className="bg-purple-50 p-3 rounded">
                          <div className="text-gray-500 text-xs mb-1">目标位</div>
                          <div className="font-bold text-purple-600 text-lg">
                            {analysis.aiAnalysis.target}
                          </div>
                        </div>
                      </div>

                      {analysis.aiAnalysis.reasoning && (
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                          <div className="font-medium mb-1">分析理由：</div>
                          <div className="whitespace-pre-wrap">
                            {analysis.aiAnalysis.reasoning}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex gap-2">
                      <div className="text-xs text-gray-500 flex items-center">
                        💡 提示：如需复盘对话中的多个预测，请前往
                        <Link href="/review" className="ml-1 text-black hover:underline font-medium">
                          对话级复盘中心
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
