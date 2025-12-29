import { NextRequest, NextResponse } from 'next/server';
import {
  saveReviewConversation,
  getReviewConversationById,
  getReviewConversationByAnalysisId,
  addMessageToReviewConversation,
  completeReviewConversation,
  getAnalysisById,
  saveImage,
} from '@/lib/storage';
import { ReviewConversation, Message } from '@/types';
import { chat, analyzeReviewImage } from '@/lib/ai';

// 创建或获取复盘对话
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;

    // 创建新的复盘对话
    if (action === 'create') {
      const analysisId = formData.get('analysisId') as string;

      if (!analysisId) {
        return NextResponse.json(
          { error: '缺少分析ID' },
          { status: 400 }
        );
      }

      // 检查是否已存在复盘对话
      const existing = await getReviewConversationByAnalysisId(analysisId);
      if (existing) {
        return NextResponse.json({
          success: true,
          data: existing,
        });
      }

      // 获取原始分析
      const analysis = await getAnalysisById(analysisId);
      if (!analysis) {
        return NextResponse.json(
          { error: '未找到对应的分析记录' },
          { status: 404 }
        );
      }

      // 创建初始化消息（AI 主动发起复盘对话）
      const initialMessage: Message = {
        id: `${Date.now()}_ai`,
        role: 'assistant',
        content: `您好！让我们一起复盘这次分析。

**原始预测回顾：**
- 预测方向: ${analysis.aiAnalysis.direction}
- 支撑位: ${analysis.aiAnalysis.keyLevels.support}
- 阻力位: ${analysis.aiAnalysis.keyLevels.resistance}
- 目标位: ${analysis.aiAnalysis.target}

请您：
1. 粘贴收盘后的K线图（Ctrl+V），我会自动识别实际价格
2. 或者直接告诉我实际的最高价、最低价和收盘价

然后我们可以深入讨论预测的准确性、失误原因以及改进方向。`,
        timestamp: new Date().toISOString(),
      };

      const reviewConversation: ReviewConversation = {
        id: `review_conv_${Date.now()}`,
        analysisId,
        messages: [initialMessage],
        status: 'ongoing',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await saveReviewConversation(reviewConversation);

      return NextResponse.json({
        success: true,
        data: reviewConversation,
      });
    }

    // 发送消息到复盘对话
    if (action === 'message') {
      const conversationId = formData.get('conversationId') as string;
      const message = formData.get('message') as string;
      const image = formData.get('image') as File | null;

      if (!conversationId || !message) {
        return NextResponse.json(
          { error: '缺少必要参数' },
          { status: 400 }
        );
      }

      const conversation = await getReviewConversationById(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { error: '未找到复盘对话' },
          { status: 404 }
        );
      }

      // 获取原始分析
      const analysis = await getAnalysisById(conversation.analysisId);
      if (!analysis) {
        return NextResponse.json(
          { error: '未找到对应的分析记录' },
          { status: 404 }
        );
      }

      // 处理图片
      let imageUrl = '';
      let imageBase64 = '';
      let extractedData: { actualHigh: number; actualLow: number; actualClose: number; analysis: string } | null = null;

      if (image) {
        const bytes = await image.arrayBuffer();
        const buffer = Buffer.from(bytes);
        imageUrl = await saveImage(buffer, image.name);
        imageBase64 = buffer.toString('base64');

        // 使用 AI 提取价格数据
        try {
          extractedData = await analyzeReviewImage(imageBase64, analysis.aiAnalysis);
        } catch (error) {
          console.error('图片识别失败:', error);
        }
      }

      // 创建用户消息
      const userMessage: Message = {
        id: `${Date.now()}_user`,
        role: 'user',
        content: message,
        imageUrl,
        timestamp: new Date().toISOString(),
      };

      conversation.messages.push(userMessage);

      // 构建复盘对话的系统提示
      const reviewSystemPrompt = `你是一位专业的股市分析复盘专家。你正在与用户讨论之前的预测分析。

**原始分析信息：**
- 股票代码: ${analysis.stockCode || '未指定'}
- 分析日期: ${analysis.date}
- 用户问题: ${analysis.userInput}

**预测内容：**
- 预测方向: ${analysis.aiAnalysis.direction}
- 支撑位: ${analysis.aiAnalysis.keyLevels.support}
- 阻力位: ${analysis.aiAnalysis.keyLevels.resistance}
- 止损位: ${analysis.aiAnalysis.stopLoss}
- 目标位: ${analysis.aiAnalysis.target}
- 分析依据: ${analysis.aiAnalysis.reasoning.slice(0, 500)}...

${extractedData ? `
**图片识别的实际数据：**
- 实际最高价: ${extractedData.actualHigh}
- 实际最低价: ${extractedData.actualLow}
- 实际收盘价: ${extractedData.actualClose}
- 图片分析: ${extractedData.analysis}
` : ''}

${conversation.actualData ? `
**已确认的实际数据：**
- 实际最高价: ${conversation.actualData.actualHigh}
- 实际最低价: ${conversation.actualData.actualLow}
- 实际收盘价: ${conversation.actualData.actualClose}
` : ''}

**复盘任务：**
1. 如果用户提供了实际价格数据（通过图片或文字），帮助分析预测的准确性
2. 深入讨论预测成功或失败的原因
3. 识别预测中的偏差和盲点
4. 提供具体的改进建议
5. 总结关键经验教训

**对话要求：**
- 客观、专业地评估预测质量
- 不要为错误的预测找借口，要诚实分析失误原因
- 提供具体、可操作的改进建议
- 如果预测准确，总结成功经验
- 如果用户询问是否完成复盘，确认所有数据后建议用户使用"完成复盘"功能`;

      // 将系统提示添加到消息列表
      const messagesForAI: Message[] = [
        {
          id: 'system',
          role: 'assistant',
          content: reviewSystemPrompt,
          timestamp: new Date().toISOString(),
        },
        ...conversation.messages,
      ];

      // 调用 AI API
      const aiResponse = await chat(messagesForAI, imageBase64, 'qwen');

      // 创建 AI 消息
      const aiMessage: Message = {
        id: `${Date.now()}_ai`,
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
      };

      conversation.messages.push(aiMessage);
      conversation.updatedAt = new Date().toISOString();

      // 如果识别到了价格数据且还没有保存，自动保存
      if (extractedData && !conversation.actualData) {
        conversation.actualData = {
          actualHigh: extractedData.actualHigh,
          actualLow: extractedData.actualLow,
          actualClose: extractedData.actualClose,
        };
      }

      await saveReviewConversation(conversation);

      return NextResponse.json({
        success: true,
        data: {
          conversation,
          extractedData, // 返回识别的数据供前端显示
        },
      });
    }

    // 完成复盘
    if (action === 'complete') {
      const conversationId = formData.get('conversationId') as string;

      if (!conversationId) {
        return NextResponse.json(
          { error: '缺少对话ID' },
          { status: 400 }
        );
      }

      const conversation = await getReviewConversationById(conversationId);
      if (!conversation) {
        return NextResponse.json(
          { error: '未找到复盘对话' },
          { status: 404 }
        );
      }

      if (!conversation.actualData) {
        return NextResponse.json(
          { error: '缺少实际数据，无法完成复盘' },
          { status: 400 }
        );
      }

      // 获取原始分析
      const analysis = await getAnalysisById(conversation.analysisId);
      if (!analysis) {
        return NextResponse.json(
          { error: '未找到对应的分析记录' },
          { status: 404 }
        );
      }

      // 计算准确率
      const prediction = analysis.aiAnalysis;
      const { actualHigh, actualLow, actualClose } = conversation.actualData;
      const actualMove = actualClose - (actualHigh + actualLow) / 2;

      let accuracy = 0;
      if (prediction.direction === '做多' && actualMove > 0) {
        accuracy = 70 + Math.min(30, (actualHigh / prediction.target) * 30);
      } else if (prediction.direction === '做空' && actualMove < 0) {
        accuracy = 70 + Math.min(30, (prediction.target / actualLow) * 30);
      } else if (prediction.direction === '观望') {
        accuracy = Math.abs(actualMove) < 10 ? 80 : 50;
      } else {
        accuracy = 30; // 方向错误
      }

      accuracy = Math.round(Math.max(0, Math.min(100, accuracy)));

      await completeReviewConversation(
        conversationId,
        conversation.actualData,
        accuracy
      );

      return NextResponse.json({
        success: true,
        data: { accuracy },
      });
    }

    return NextResponse.json(
      { error: '无效的操作' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('复盘对话失败:', error);
    return NextResponse.json(
      { error: error.message || '复盘对话失败' },
      { status: 500 }
    );
  }
}

// 获取复盘对话
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const analysisId = searchParams.get('analysisId');

    if (!analysisId) {
      return NextResponse.json(
        { error: '缺少分析ID' },
        { status: 400 }
      );
    }

    const conversation = await getReviewConversationByAnalysisId(analysisId);

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取复盘对话失败' },
      { status: 500 }
    );
  }
}
