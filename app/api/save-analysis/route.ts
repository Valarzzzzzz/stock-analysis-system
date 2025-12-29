import { NextRequest, NextResponse } from 'next/server';
import { saveAnalysis } from '@/lib/storage';
import { Analysis, AIAnalysis } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { conversationId, messageId, stockCode, aiContent, imageUrl, userInput } = body;

    if (!conversationId || !messageId || !aiContent) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 尝试从AI回复中提取结构化数据
    let aiAnalysis: AIAnalysis;

    try {
      // 尝试从文本中提取JSON
      const jsonMatch = aiContent.match(/```json\n?([\s\S]*?)\n?```/) ||
                        aiContent.match(/\{[\s\S]*"keyLevels"[\s\S]*\}/);

      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0];
        aiAnalysis = JSON.parse(jsonStr);
      } else {
        // 如果没有JSON格式,创建默认结构
        aiAnalysis = {
          keyLevels: { support: 0, resistance: 0 },
          direction: '观望',
          stopLoss: 0,
          target: 0,
          reasoning: aiContent,
        };
      }
    } catch (parseError) {
      // 解析失败,使用默认值
      aiAnalysis = {
        keyLevels: { support: 0, resistance: 0 },
        direction: '观望',
        stopLoss: 0,
        target: 0,
        reasoning: aiContent,
      };
    }

    // 创建分析记录
    const analysis: Analysis = {
      id: `analysis_${Date.now()}`,
      stockCode: stockCode || undefined,
      date: new Date().toLocaleDateString('zh-CN'),
      imageUrl: imageUrl || '',
      userInput: userInput || '聊天记录保存',
      aiAnalysis,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };

    await saveAnalysis(analysis);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('保存分析失败:', error);
    return NextResponse.json(
      { error: error.message || '保存失败，请稍后重试' },
      { status: 500 }
    );
  }
}
