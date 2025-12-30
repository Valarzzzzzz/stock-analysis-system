'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Conversation, ReviewConversation, Message, AIAnalysis, PredictionReview } from '@/types';
import { format } from 'date-fns';

export default function ReviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [reviewConversation, setReviewConversation] = useState<ReviewConversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [reviewImage, setReviewImage] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string>('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchData();
  }, [conversationId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [reviewConversation?.messages]);

  const fetchData = async () => {
    try {
      // 获取原始对话
      const convRes = await fetch(`/api/conversations/${conversationId}`);
      const convData = await convRes.json();
      if (convData.success) {
        setConversation(convData.data);
      }

      // 获取或创建复盘对话
      const reviewRes = await fetch(`/api/review-conversation?conversationId=${conversationId}`);
      const reviewData = await reviewRes.json();

      if (reviewData.success && reviewData.data) {
        setReviewConversation(reviewData.data);
      } else {
        // 创建新的复盘对话
        await createReviewConversation();
      }
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const createReviewConversation = async () => {
    setSending(true);
    try {
      const formData = new FormData();
      formData.append('action', 'create');
      formData.append('conversationId', conversationId);

      const res = await fetch('/api/review-conversation', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setReviewConversation(data.data);
      }
    } catch (error) {
      console.error('创建复盘对话失败:', error);
    } finally {
      setSending(false);
    }
  };

  const extractPredictions = (conv: Conversation): PredictionReview[] => {
    const predictions: PredictionReview[] = [];

    for (const msg of conv.messages) {
      if (msg.role === 'assistant') {
        // 尝试从消息中提取预测信息
        const supportMatch = msg.content.match(/支撑[：:]\s*([\d.]+)/);
        const resistanceMatch = msg.content.match(/阻力[：:]\s*([\d.]+)/);
        const directionMatch = msg.content.match(/方向[：:]\s*(做多|做空|观望)/);
        const stopLossMatch = msg.content.match(/止损[：:]\s*([\d.]+)/);
        const targetMatch = msg.content.match(/目标[：:]\s*([\d.]+)/);

        if (supportMatch && resistanceMatch && directionMatch) {
          const prediction: AIAnalysis = {
            keyLevels: {
              support: parseFloat(supportMatch[1]),
              resistance: parseFloat(resistanceMatch[1]),
            },
            direction: directionMatch[1] as '做多' | '做空' | '观望',
            stopLoss: stopLossMatch ? parseFloat(stopLossMatch[1]) : 0,
            target: targetMatch ? parseFloat(targetMatch[1]) : 0,
            reasoning: msg.content,
          };

          predictions.push({
            messageId: msg.id,
            imageUrl: msg.imageUrl,
            prediction,
          });
        }
      }
    }

    return predictions;
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

      const res = await fetch('/api/review-conversation', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        setReviewConversation(data.data.conversation);
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
    if (!reviewConversation || !conversation) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('action', 'complete');
      formData.append('conversationId', reviewConversation.id);

      const res = await fetch('/api/review-conversation', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        alert(`复盘完成！\n平均准确率: ${data.data.overallAccuracy}%\n对话质量评分: ${data.data.qualityScore}分`);
        router.push('/review');
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

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!conversation || !reviewConversation) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500 mb-4">对话不存在</div>
          <Link href="/review" className="text-black hover:underline">
            返回复盘中心
          </Link>
        </div>
      </div>
    );
  }

  const predictions = extractPredictions(conversation);

  return (
    <div className="min-h-screen bg-white">
      {/* 顶部导航 */}
      <nav className="border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link
            href="/review"
            className="text-xl font-bold text-black hover:text-gray-700"
          >
            ← 复盘中心
          </Link>
        </div>
      </nav>

      {/* 主内容 */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">{conversation.title}</h1>
          <p className="text-gray-600">
            {format(new Date(conversation.createdAt), 'yyyy-MM-dd HH:mm')}
            <span className="mx-2">•</span>
            {predictions.length} 个预测待复盘
          </p>
        </div>

        {/* 预测列表 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">📋 对话中的预测</h2>
          <div className="grid gap-4">
            {predictions.map((pred, index) => {
              const reviewedPred = reviewConversation.predictions?.find(
                p => p.messageId === pred.messageId
              );

              return (
                <div
                  key={pred.messageId}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start gap-4">
                    {pred.imageUrl && (
                      <img
                        src={pred.imageUrl}
                        alt="预测图片"
                        className="w-24 h-24 object-cover rounded border border-gray-200"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium mb-2">预测 #{index + 1}</div>
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-gray-500">支撑: </span>
                          <span className="font-medium text-green-600">
                            {pred.prediction.keyLevels.support}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">阻力: </span>
                          <span className="font-medium text-red-600">
                            {pred.prediction.keyLevels.resistance}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">方向: </span>
                          <span className="font-medium">
                            {pred.prediction.direction}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">目标: </span>
                          <span className="font-medium">
                            {pred.prediction.target}
                          </span>
                        </div>
                      </div>
                      {reviewedPred?.actualData && (
                        <div className="mt-3 bg-blue-50 rounded p-3">
                          <div className="grid grid-cols-4 gap-3 text-sm">
                            <div>
                              <span className="text-gray-500">实际最高: </span>
                              <span className="font-medium">
                                {reviewedPred.actualData.actualHigh}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">实际最低: </span>
                              <span className="font-medium">
                                {reviewedPred.actualData.actualLow}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500">实际收盘: </span>
                              <span className="font-medium">
                                {reviewedPred.actualData.actualClose}
                              </span>
                            </div>
                            {reviewedPred.accuracy !== undefined && (
                              <div>
                                <span className="text-gray-500">准确率: </span>
                                <span className={`font-medium ${
                                  reviewedPred.accuracy >= 80 ? 'text-green-600' :
                                  reviewedPred.accuracy >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {reviewedPred.accuracy}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 复盘对话区域 */}
        <div className="border border-gray-200 rounded-lg">
          {/* 头部 */}
          <div className="border-b border-gray-200 p-4 flex items-center justify-between bg-gray-50">
            <h2 className="text-lg font-semibold">💬 复盘讨论</h2>
            {reviewConversation.status === 'ongoing' && (
              <button
                onClick={completeReview}
                disabled={sending || reviewConversation.predictions.length === 0}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:bg-gray-300 transition"
              >
                ✓ 完成复盘
              </button>
            )}
            {reviewConversation.status === 'completed' && (
              <div className="text-sm">
                <span className="text-gray-500">平均准确率: </span>
                <span className="font-medium text-green-600">
                  {reviewConversation.overallAccuracy}%
                </span>
                <span className="mx-2">•</span>
                <span className="text-gray-500">质量评分: </span>
                <span className="font-medium text-blue-600">
                  {reviewConversation.qualityScore}分
                </span>
              </div>
            )}
          </div>

          {/* 消息列表 */}
          <div className="h-[400px] overflow-y-auto p-6 space-y-4">
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
          {reviewConversation.status === 'ongoing' && (
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
                💡 提示：上传K线图或直接输入实际价格数据进行复盘
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
