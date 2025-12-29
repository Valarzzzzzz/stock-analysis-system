import { NextRequest, NextResponse } from 'next/server';
import { chat } from '@/lib/ai';
import { saveImage, getConversationById, saveConversation, addMessageToConversation } from '@/lib/storage';
import { Message, Conversation } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const conversationId = formData.get('conversationId') as string;
    const message = formData.get('message') as string;
    const image = formData.get('image') as File | null;
    const model = (formData.get('model') as 'deepseek' | 'qwen') || 'qwen';

    if (!conversationId || !message) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 获取或创建对话
    let conversation = await getConversationById(conversationId);

    if (!conversation) {
      // 创建新对话
      conversation = {
        id: conversationId,
        title: '新对话',
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // 处理图片（如果有）
    let imageUrl: string | undefined;
    let imageBase64: string | undefined;

    if (image) {
      const arrayBuffer = await image.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      imageBase64 = buffer.toString('base64');
      imageUrl = await saveImage(buffer, image.name);
    }

    // 创建用户消息
    const userMessage: Message = {
      id: `${Date.now()}_user`,
      role: 'user',
      content: message,
      imageUrl,
      timestamp: new Date().toISOString(),
    };

    // 添加用户消息到对话
    conversation.messages.push(userMessage);

    // 调用 AI API（支持 DeepSeek 和千问）
    const aiResponse = await chat(conversation.messages, imageBase64, model);

    // 创建 AI 消息
    const aiMessage: Message = {
      id: `${Date.now()}_ai`,
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    };

    // 添加 AI 消息到对话
    conversation.messages.push(aiMessage);
    conversation.updatedAt = new Date().toISOString();

    // 如果是第一条消息，设置标题
    if (conversation.messages.length === 2) {
      conversation.title = message.slice(0, 30) + (message.length > 30 ? '...' : '');
    }

    // 保存对话
    await saveConversation(conversation);

    return NextResponse.json({
      success: true,
      data: {
        userMessage,
        aiMessage,
        conversation,
      },
    });
  } catch (error: any) {
    console.error('对话失败:', error);
    return NextResponse.json(
      { error: error.message || '对话失败，请稍后重试' },
      { status: 500 }
    );
  }
}
