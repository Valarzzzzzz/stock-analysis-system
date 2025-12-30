import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  getConversationById,
  getReviewConversationByConversationId,
  saveReviewConversation,
  addMessageToReviewConversation,
  completeReviewConversation,
  saveImage,
} from '@/lib/storage';
import { callDeepSeek, analyzeReviewImage } from '@/lib/ai';
import { Message, ReviewConversation, PredictionReview, AIAnalysis } from '@/types';

// GET - 获取复盘对话
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');

    if (!conversationId) {
      return NextResponse.json(
        { success: false, error: '缺少参数' },
        { status: 400 }
      );
    }

    const reviewConversation = await getReviewConversationByConversationId(conversationId);

    return NextResponse.json({
      success: true,
      data: reviewConversation,
    });
  } catch (error) {
    console.error('获取复盘对话失败:', error);
    return NextResponse.json(
      { success: false, error: '获取复盘对话失败' },
      { status: 500 }
    );
  }
}

// POST - 创建/更新复盘对话
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const action = formData.get('action') as string;

    if (action === 'create') {
      return await handleCreate(formData);
    } else if (action === 'message') {
      return await handleMessage(formData);
    } else if (action === 'complete') {
      return await handleComplete(formData);
    }

    return NextResponse.json(
      { success: false, error: '未知操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('操作失败:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}

// 创建复盘对话
async function handleCreate(formData: FormData) {
  const conversationId = formData.get('conversationId') as string;

  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: '缺少参数' },
      { status: 400 }
    );
  }

  // 获取原始对话
  const conversation = await getConversationById(conversationId);
  if (!conversation) {
    return NextResponse.json(
      { success: false, error: '对话不存在' },
      { status: 404 }
    );
  }

  // 提取对话中的所有预测
  const predictions = extractPredictionsFromConversation(conversation.messages);

  // 创建复盘对话
  const reviewConversation: ReviewConversation = {
    id: uuidv4(),
    conversationId,
    messages: [
      {
        id: uuidv4(),
        role: 'assistant',
        content: `欢迎进行复盘！我已经识别出这个对话中有 ${predictions.length} 个预测。\n\n请提供实际的价格数据（可以上传K线图，我会自动识别），我将对每个预测进行评估。`,
        timestamp: new Date().toISOString(),
      },
    ],
    predictions,
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

// 发送消息（包括上传实际数据）
async function handleMessage(formData: FormData) {
  const conversationId = formData.get('conversationId') as string;
  const messageText = formData.get('message') as string;
  const imageFile = formData.get('image') as File | null;

  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: '缺少参数' },
      { status: 400 }
    );
  }

  const reviewConversation = await getReviewConversationByConversationId(conversationId);
  if (!reviewConversation) {
    return NextResponse.json(
      { success: false, error: '复盘对话不存在' },
      { status: 404 }
    );
  }

  let imageUrl = '';
  let extractedData: any = null;

  // 处理图片上传
  if (imageFile) {
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    imageUrl = await saveImage(buffer, imageFile.name);

    // 使用AI识别图片中的价格信息
    try {
      const imageBase64 = buffer.toString('base64');
      // 找到第一个预测作为参考
      const firstPrediction = reviewConversation.predictions[0];
      if (firstPrediction) {
        extractedData = await analyzeReviewImage(imageBase64, firstPrediction.prediction);
      }
    } catch (error) {
      console.error('图片识别失败:', error);
    }
  }

  // 添加用户消息
  const userMessage: Message = {
    id: uuidv4(),
    role: 'user',
    content: messageText,
    imageUrl,
    timestamp: new Date().toISOString(),
  };

  await addMessageToReviewConversation(reviewConversation.id, userMessage);

  // 如果成功提取了数据，更新预测的实际数据
  if (extractedData) {
    // 对所有预测应用相同的实际数据
    for (const pred of reviewConversation.predictions) {
      if (!pred.actualData) {
        pred.actualData = {
          actualHigh: extractedData.actualHigh,
          actualLow: extractedData.actualLow,
          actualClose: extractedData.actualClose,
        };

        // 计算单个预测的准确率
        pred.accuracy = calculateAccuracy(pred.prediction, pred.actualData);
      }
    }

    await saveReviewConversation(reviewConversation);

    // AI回复
    const aiResponse = generateReviewResponse(reviewConversation.predictions, extractedData);
    const assistantMessage: Message = {
      id: uuidv4(),
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date().toISOString(),
    };

    await addMessageToReviewConversation(reviewConversation.id, assistantMessage);

    // 重新获取更新后的对话
    const updatedConversation = await getReviewConversationByConversationId(conversationId);

    return NextResponse.json({
      success: true,
      data: {
        conversation: updatedConversation,
        extractedData,
      },
    });
  }

  // 如果没有提取到数据，使用AI理解用户输入
  const conversationHistory = reviewConversation.messages.map(m => ({
    role: m.role,
    content: m.content,
  }));
  conversationHistory.push({ role: 'user', content: messageText });

  const aiPrompt = `用户正在进行预测复盘。请分析用户提供的信息，如果包含实际价格数据（最高价、最低价、收盘价），请提取并告知。如果信息不完整，请引导用户提供。

对话中的预测:
${reviewConversation.predictions.map((p, i) => `
预测 #${i + 1}:
- 支撑: ${p.prediction.keyLevels.support}
- 阻力: ${p.prediction.keyLevels.resistance}
- 方向: ${p.prediction.direction}
- 目标: ${p.prediction.target}
`).join('\n')}

请回复用户。`;

  const aiReply = await callDeepSeek(conversationHistory, aiPrompt);

  const assistantMessage: Message = {
    id: uuidv4(),
    role: 'assistant',
    content: aiReply,
    timestamp: new Date().toISOString(),
  };

  await addMessageToReviewConversation(reviewConversation.id, assistantMessage);

  // 重新获取更新后的对话
  const updatedConversation = await getReviewConversationByConversationId(conversationId);

  return NextResponse.json({
    success: true,
    data: {
      conversation: updatedConversation,
    },
  });
}

// 完成复盘
async function handleComplete(formData: FormData) {
  const conversationId = formData.get('conversationId') as string;

  if (!conversationId) {
    return NextResponse.json(
      { success: false, error: '缺少参数' },
      { status: 400 }
    );
  }

  const reviewConversation = await getReviewConversationByConversationId(conversationId);
  if (!reviewConversation) {
    return NextResponse.json(
      { success: false, error: '复盘对话不存在' },
      { status: 404 }
    );
  }

  // 检查是否所有预测都有实际数据
  const incompletePredictions = reviewConversation.predictions.filter(p => !p.actualData);
  if (incompletePredictions.length > 0) {
    return NextResponse.json(
      { success: false, error: '请先为所有预测提供实际数据' },
      { status: 400 }
    );
  }

  // 计算平均准确率
  const accuracies = reviewConversation.predictions
    .filter(p => p.accuracy !== undefined)
    .map(p => p.accuracy!);

  const overallAccuracy = accuracies.length > 0
    ? Math.round(accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length)
    : 0;

  // 计算整体质量评分 (0-100)
  const qualityScore = calculateQualityScore(reviewConversation.predictions);

  await completeReviewConversation(reviewConversation.id, overallAccuracy, qualityScore);

  return NextResponse.json({
    success: true,
    data: {
      overallAccuracy,
      qualityScore,
    },
  });
}

// 从对话中提取预测
function extractPredictionsFromConversation(messages: Message[]): PredictionReview[] {
  const predictions: PredictionReview[] = [];

  for (const msg of messages) {
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
}

// 计算单个预测的准确率
function calculateAccuracy(
  prediction: AIAnalysis,
  actualData: { actualHigh: number; actualLow: number; actualClose: number }
): number {
  let score = 0;
  let totalChecks = 0;

  const { support, resistance } = prediction.keyLevels;
  const { actualHigh, actualLow, actualClose } = actualData;

  // 1. 检查支撑位是否准确 (30分)
  totalChecks += 30;
  if (actualLow >= support * 0.98 && actualLow <= support * 1.02) {
    score += 30; // 支撑位在2%误差范围内
  } else if (actualLow >= support * 0.95 && actualLow <= support * 1.05) {
    score += 20; // 支撑位在5%误差范围内
  } else if (actualLow >= support * 0.90 && actualLow <= support * 1.10) {
    score += 10; // 支撑位在10%误差范围内
  }

  // 2. 检查阻力位是否准确 (30分)
  totalChecks += 30;
  if (actualHigh >= resistance * 0.98 && actualHigh <= resistance * 1.02) {
    score += 30;
  } else if (actualHigh >= resistance * 0.95 && actualHigh <= resistance * 1.05) {
    score += 20;
  } else if (actualHigh >= resistance * 0.90 && actualHigh <= resistance * 1.10) {
    score += 10;
  }

  // 3. 检查方向是否准确 (40分)
  totalChecks += 40;
  if (prediction.direction === '做多' && actualClose > (support + resistance) / 2) {
    score += 40;
  } else if (prediction.direction === '做空' && actualClose < (support + resistance) / 2) {
    score += 40;
  } else if (prediction.direction === '观望' && actualClose >= support && actualClose <= resistance) {
    score += 40;
  } else if (prediction.direction !== '观望') {
    score += 10; // 方向错误但在区间内
  }

  return Math.round((score / totalChecks) * 100);
}

// 计算整体质量评分
function calculateQualityScore(predictions: PredictionReview[]): number {
  if (predictions.length === 0) return 0;

  let totalScore = 0;

  // 1. 准确率得分 (60分)
  const accuracies = predictions
    .filter(p => p.accuracy !== undefined)
    .map(p => p.accuracy!);
  const avgAccuracy = accuracies.length > 0
    ? accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length
    : 0;
  totalScore += (avgAccuracy / 100) * 60;

  // 2. 一致性得分 (20分) - 预测之间的一致性
  if (predictions.length > 1) {
    const accuracyVariance = calculateVariance(accuracies);
    const consistencyScore = Math.max(0, 20 - accuracyVariance / 5);
    totalScore += consistencyScore;
  } else {
    totalScore += 20; // 单个预测默认满分
  }

  // 3. 风险控制得分 (20分) - 止损设置是否合理
  const riskScore = predictions.filter(p => {
    if (!p.actualData) return false;
    const { stopLoss } = p.prediction;
    const { actualLow } = p.actualData;
    return stopLoss > 0 && stopLoss < actualLow * 1.1;
  }).length;
  totalScore += (riskScore / predictions.length) * 20;

  return Math.round(totalScore);
}

// 计算方差
function calculateVariance(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
  const squaredDiffs = numbers.map(n => Math.pow(n - mean, 2));
  return squaredDiffs.reduce((sum, d) => sum + d, 0) / numbers.length;
}

// 生成复盘回复
function generateReviewResponse(predictions: PredictionReview[], extractedData: any): string {
  let response = '✅ 已成功识别实际价格数据！\n\n';
  response += `📊 实际数据:\n`;
  response += `• 最高价: ${extractedData.actualHigh}\n`;
  response += `• 最低价: ${extractedData.actualLow}\n`;
  response += `• 收盘价: ${extractedData.actualClose}\n\n`;

  response += `📈 各预测准确率:\n\n`;

  predictions.forEach((pred, index) => {
    if (pred.accuracy !== undefined) {
      const emoji = pred.accuracy >= 80 ? '✅' : pred.accuracy >= 60 ? '⚠️' : '❌';
      response += `${emoji} 预测 #${index + 1}: ${pred.accuracy}%\n`;
      response += `  支撑 ${pred.prediction.keyLevels.support} | 阻力 ${pred.prediction.keyLevels.resistance}\n`;
      response += `  方向: ${pred.prediction.direction} | 目标: ${pred.prediction.target}\n\n`;
    }
  });

  response += `\n💡 您可以继续提问或点击"完成复盘"查看最终评分。`;

  return response;
}
