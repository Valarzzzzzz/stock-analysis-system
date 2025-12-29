'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Analysis, ReviewConversation, Message } from '@/types';
import { format } from 'date-fns';

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [reviewConversation, setReviewConversation] = useState<ReviewConversation | null>(null);
  const [message, setMessage] = useState('');
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string>('');
  const [sending, setSending] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchAnalyses();
  }, []);

  useEffect(() => {
    // 自动滚动到底部
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reviewConversation?.messages]);

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

  const startReview = async (analysis: Analysis) => {
    setSelectedAnalysis(analysis);
    setSending(true);

    try {
      // 检查是否已有复盘对话
      const getRes = await fetch(`/api/review-chat?analysisId=${analysis.id}`);
      const getData = await getRes.json();

      if (getData.success && getData.data) {
        setReviewConversation(getData.data);
      } else {
        // 创建新的复盘对话
        const formData = new FormData();
        formData.append('action', 'create');
        formData.append('analysisId', analysis.id);

        const createRes = await fetch('/api/review-chat', {
          method: 'POST',
          body: formData,
        });

        const createData = await createRes.json();

        if (createData.success) {
          setReviewConversation(createData.data);
        } else {
          alert(createData.error || '创建复盘对话失败');
        }
      }
    } catch (error) {
      console.error('启动复盘失败:', error);
      alert('启动复盘失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const file = items[i].getAsFile();
        if (file) {
          setReviewImage(file);
          const reader = new FileReader();
          reader.onload = (e) => {
            setReviewImagePreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const sendMessage = async () => {
    if (!reviewConversation || (!message.trim() && !reviewImage)) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('action', 'message');
      formData.append('conversationId', reviewConversation.id);
      formData.append('message', message || '我上传了收盘后的K线图');

      if (reviewImage) {
        formData.append('image', reviewImage);
      }

      const res = await fetch('/api/review-chat', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setReviewConversation(data.data.conversation);
        if (data.data.extractedData) {
          setExtractedData(data.data.extractedData);
        }
        setMessage('');
        setReviewImage(null);
        setReviewImagePreview('');
      } else {
        alert(data.error || '发送消息失败');
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      alert('发送消息失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  const completeReview = async () => {
    if (!reviewConversation) return;

    if (!reviewConversation.actualData) {
      alert('请先提供实际价格数据（通过图片或文字）');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('action', 'complete');
      formData.append('conversationId', reviewConversation.id);

      const res = await fetch('/api/review-chat', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert(`复盘完成！准确率: ${data.data.accuracy}%`);
        setSelectedAnalysis(null);
        setReviewConversation(null);
        setExtractedData(null);
        fetchAnalyses(); // 刷新列表
      } else {
        alert(data.error || '完成复盘失败');
      }
    } catch (error) {
      console.error('完成复盘失败:', error);
      alert('完成复盘失败，请稍后重试');
    } finally {
      setSending(false);
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
        </div>
      </nav>

      {/* 主内容 */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold mb-8">历史分析记录</h1>

        {analyses.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            暂无分析记录
            <Link href="/" className="block mt-4 text-black hover:underline">
              开始第一次分析
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
                  <img
                    src={analysis.imageUrl}
                    alt="Stock Chart"
                    className="w-32 h-32 object-cover rounded border border-gray-200"
                  />

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
                      <div className="text-sm text-gray-600 mb-3">
                        {analysis.userInput}
                      </div>
                    )}

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">支撑: </span>
                        <span className="font-medium text-green-600">
                          {analysis.aiAnalysis.keyLevels.support}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">阻力: </span>
                        <span className="font-medium text-red-600">
                          {analysis.aiAnalysis.keyLevels.resistance}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">方向: </span>
                        <span className="font-medium">
                          {analysis.aiAnalysis.direction}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">目标: </span>
                        <span className="font-medium">
                          {analysis.aiAnalysis.target}
                        </span>
                      </div>
                    </div>

                    {analysis.status === 'pending_review' && (
                      <button
                        onClick={() => startReview(analysis)}
                        className="mt-4 px-4 py-2 bg-black text-white text-sm rounded hover:bg-gray-800 transition"
                      >
                        💬 开始复盘对话
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 复盘对话界面 */}
      {selectedAnalysis && reviewConversation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[80vh] flex flex-col">
            {/* 头部 */}
            <div className="border-b border-gray-200 p-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">复盘对话</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedAnalysis.stockCode && `[${selectedAnalysis.stockCode}] `}
                  {selectedAnalysis.date}
                </p>
              </div>
              <div className="flex gap-2">
                {reviewConversation.actualData && (
                  <button
                    onClick={completeReview}
                    disabled={sending}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-300 transition"
                  >
                    ✓ 完成复盘
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedAnalysis(null);
                    setReviewConversation(null);
                    setExtractedData(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition"
                >
                  关闭
                </button>
              </div>
            </div>

            {/* 实际数据显示 */}
            {reviewConversation.actualData && (
              <div className="bg-blue-50 border-b border-blue-200 p-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="font-medium">📊 实际数据:</span>
                  <span>最高 {reviewConversation.actualData.actualHigh}</span>
                  <span>最低 {reviewConversation.actualData.actualLow}</span>
                  <span>收盘 {reviewConversation.actualData.actualClose}</span>
                  {reviewConversation.accuracy && (
                    <span className="ml-auto font-medium text-blue-700">
                      准确率: {reviewConversation.accuracy}%
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {reviewConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-lg p-4 ${
                      msg.role === 'user'
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="图片"
                        className="max-w-full rounded mb-2"
                      />
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div
                      className={`text-xs mt-2 ${
                        msg.role === 'user' ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* 输入区域 */}
            <div className="border-t border-gray-200 p-4">
              {reviewImagePreview && (
                <div className="mb-3 relative inline-block">
                  <img
                    src={reviewImagePreview}
                    alt="预览"
                    className="max-h-32 rounded border border-gray-300"
                  />
                  <button
                    onClick={() => {
                      setReviewImage(null);
                      setReviewImagePreview('');
                    }}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="输入消息或粘贴图片 (Ctrl+V)..."
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-black"
                  rows={2}
                  disabled={sending}
                />
                <button
                  onClick={sendMessage}
                  disabled={sending || (!message.trim() && !reviewImage)}
                  className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 transition"
                >
                  {sending ? '发送中...' : '发送'}
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-2">
                💡 提示：可以粘贴K线图让AI自动识别价格，或直接告诉我实际数据
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
