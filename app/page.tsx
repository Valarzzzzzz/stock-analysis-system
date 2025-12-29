'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Conversation, Message } from '@/types';
import { format } from 'date-fns';

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSidebar, setShowSidebar] = useState(true);
  const [selectedModel, setSelectedModel] = useState<'deepseek' | 'qwen'>('qwen');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    }
  };

  const createNewConversation = () => {
    const newId = 'conv_' + Date.now();
    setCurrentConversationId(newId);
    setMessages([]);
    setError('');
  };

  const selectConversation = (conv: Conversation) => {
    setCurrentConversationId(conv.id);
    setMessages(conv.messages);
    setError('');
  };

  const deleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这个对话吗？')) return;

    try {
      const res = await fetch('/api/conversations?id=' + id, {
        method: 'DELETE',
      });

      if (res.ok) {
        setConversations(conversations.filter(c => c.id !== id));
        if (currentConversationId === id) {
          createNewConversation();
        }
      }
    } catch (error) {
      console.error('删除对话失败:', error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 处理粘贴事件
  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // 检查是否为图片
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // 阻止默认粘贴行为

        const file = item.getAsFile();
        if (file) {
          setImage(file);
          const reader = new FileReader();
          reader.onloadend = () => {
            setImagePreview(reader.result as string);
          };
          reader.readAsDataURL(file);
        }
        break;
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() && !image) {
      setError('请输入消息或上传图片');
      return;
    }

    const conversationId = currentConversationId || ('conv_' + Date.now());

    setLoading(true);
    setError('');

    const tempUserMessage: Message = {
      id: 'temp_' + Date.now(),
      role: 'user',
      content: input,
      imageUrl: imagePreview || undefined,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, tempUserMessage]);
    const savedInput = input;
    const savedImage = image;
    setInput('');
    setImage(null);
    setImagePreview(null);

    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('message', savedInput || '请分析这张图片');
      formData.append('model', selectedModel);

      if (savedImage) {
        formData.append('image', savedImage);
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || '发送失败');
      }

      setMessages(data.data.conversation.messages);
      setCurrentConversationId(conversationId);
      await fetchConversations();
    } catch (err: any) {
      setError(err.message || '发送失败，请稍后重试');
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveAsAnalysis = async (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message || message.role !== 'assistant') return;

    // 找到对应的用户消息
    const messageIndex = messages.findIndex(m => m.id === messageId);
    const userMessage = messageIndex > 0 ? messages[messageIndex - 1] : null;

    const stockCode = prompt('请输入股票代码（可选，如 AAPL, TSLA）:');

    try {
      const res = await fetch('/api/save-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: currentConversationId,
          messageId: message.id,
          stockCode: stockCode || undefined,
          aiContent: message.content,
          imageUrl: userMessage?.imageUrl,
          userInput: userMessage?.content || '',
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('✅ 已保存为分析记录！\n\n您可以前往"复盘记录"页面进行复盘。');
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert('保存失败: ' + err.message);
    }
  };

  const currentConversation = conversations.find(c => c.id === currentConversationId);

  return (
    <div className="flex h-screen bg-white">
      {/* 左侧栏 */}
      <div className={'border-r border-gray-200 flex flex-col transition-all duration-300 overflow-hidden ' + (showSidebar ? 'w-64' : 'w-0')}>
        <div className="p-4 border-b border-gray-200">
          <h1 className="text-lg font-bold text-black mb-3">Stock AI Analyzer</h1>
          <button onClick={createNewConversation} className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition text-sm">
            + 新对话
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div key={conv.id} onClick={() => selectConversation(conv)} className={'p-3 cursor-pointer hover:bg-gray-50 border-b border-gray-100 ' + (currentConversationId === conv.id ? 'bg-gray-100' : '')}>
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-black truncate">{conv.title}</div>
                  <div className="text-xs text-gray-500 mt-1">{format(new Date(conv.updatedAt), 'MM-dd HH:mm')}</div>
                </div>
                <button onClick={(e) => deleteConversation(conv.id, e)} className="ml-2 text-gray-400 hover:text-red-600 text-xs">×</button>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200">
          <Link href="/history" className="block text-center text-sm text-gray-600 hover:text-black transition">📊 复盘记录</Link>
        </div>
      </div>

      {/* 主区域 */}
      <div className="flex-1 flex flex-col">
        <div className="h-16 border-b border-gray-200 flex items-center px-6">
          <button onClick={() => setShowSidebar(!showSidebar)} className="mr-4 text-gray-600 hover:text-black">☰</button>
          <h2 className="text-lg font-medium">{currentConversation?.title || '新对话'}</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <div className="text-6xl mb-4">💬</div>
              <p>开始新对话</p>
              <p className="text-sm mt-2">上传K线图或直接提问</p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={'flex ' + (msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                  <div className={'max-w-[70%] rounded-lg p-4 ' + (msg.role === 'user' ? 'bg-black text-white' : 'bg-gray-100 text-black')}>
                    {msg.imageUrl && <img src={msg.imageUrl} alt="上传的图片" className="max-w-full rounded mb-2" />}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className={'flex items-center justify-between mt-2'}>
                      <div className={'text-xs ' + (msg.role === 'user' ? 'text-gray-300' : 'text-gray-500')}>{format(new Date(msg.timestamp), 'HH:mm')}</div>
                      {msg.role === 'assistant' && (
                        <button onClick={() => handleSaveAsAnalysis(msg.id)} className="text-xs text-blue-600 hover:text-blue-800 hover:underline ml-2">💾 保存为分析</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg p-4">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{error}</div>}

            {imagePreview && (
              <div className="mb-3 relative inline-block">
                <img src={imagePreview} alt="预览" className="max-h-32 rounded border border-gray-200" />
                <button onClick={() => { setImage(null); setImagePreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600">×</button>
              </div>
            )}

            {/* 模型选择器 */}
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm text-gray-600">模型:</span>
              <button
                onClick={() => setSelectedModel('qwen')}
                className={`px-4 py-2 text-sm rounded-lg transition ${
                  selectedModel === 'qwen'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🌟 通义千问 {image && '(支持图片)'}
              </button>
              <button
                onClick={() => setSelectedModel('deepseek')}
                className={`px-4 py-2 text-sm rounded-lg transition ${
                  selectedModel === 'deepseek'
                    ? 'bg-black text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🧠 DeepSeek {!image && '(纯文本)'}
              </button>
            </div>

            <div className="flex items-end gap-2">
              <textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} onPaste={handlePaste} placeholder="输入消息...（可直接粘贴图片 Ctrl+V）" className="flex-1 border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black resize-none" rows={1} style={{ minHeight: '48px', maxHeight: '200px' }} />
              <button onClick={handleSend} disabled={loading || (!input.trim() && !image)} className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed transition">{loading ? '...' : '发送'}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
