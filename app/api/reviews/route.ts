import { NextRequest, NextResponse } from 'next/server';
import { saveReview, getAnalysisById, getReviews } from '@/lib/storage';
import { Review } from '@/types';
import { analyzeReviewImage } from '@/lib/ai';

// 获取所有复盘
export async function GET() {
  try {
    const reviews = await getReviews();
    return NextResponse.json({
      success: true,
      data: reviews,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取复盘失败' },
      { status: 500 }
    );
  }
}

// 创建复盘
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type');
    let analysisId: string;
    let actualHigh: number;
    let actualLow: number;
    let actualClose: number;
    let feedback: string;
    let imageBase64: string | undefined;

    // 处理 FormData（图片上传）或 JSON（手动输入）
    if (contentType?.includes('multipart/form-data')) {
      const formData = await request.formData();
      analysisId = formData.get('analysisId') as string;
      feedback = (formData.get('feedback') as string) || '';

      const imageFile = formData.get('image') as File | null;

      if (!imageFile) {
        return NextResponse.json(
          { error: '请上传复盘图片' },
          { status: 400 }
        );
      }

      // 获取原始分析
      const analysis = await getAnalysisById(analysisId);
      if (!analysis) {
        return NextResponse.json(
          { error: '未找到对应的分析记录' },
          { status: 404 }
        );
      }

      // 将图片转为 base64
      const bytes = await imageFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      imageBase64 = buffer.toString('base64');

      // 使用 AI 提取实际价格数据
      const extractedData = await analyzeReviewImage(imageBase64, analysis.aiAnalysis);

      actualHigh = extractedData.actualHigh;
      actualLow = extractedData.actualLow;
      actualClose = extractedData.actualClose;
      feedback = feedback || extractedData.analysis;
    } else {
      // 手动输入模式
      const body = await request.json();
      analysisId = body.analysisId;
      actualHigh = Number(body.actualHigh);
      actualLow = Number(body.actualLow);
      actualClose = Number(body.actualClose);
      feedback = body.feedback || '';
    }

    if (!analysisId || !actualHigh || !actualLow || !actualClose) {
      return NextResponse.json(
        { error: '请填写完整的复盘数据' },
        { status: 400 }
      );
    }

    // 获取原始分析
    const analysis = await getAnalysisById(analysisId);
    if (!analysis) {
      return NextResponse.json(
        { error: '未找到对应的分析记录' },
        { status: 404 }
      );
    }

    // 计算准确率（简单算法：根据预测方向和实际走势）
    let accuracy = 0;
    const prediction = analysis.aiAnalysis;
    const actualMove = actualClose - (actualHigh + actualLow) / 2;

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

    // 创建复盘记录
    const review: Review = {
      id: `review_${Date.now()}`,
      analysisId,
      actualHigh: Number(actualHigh),
      actualLow: Number(actualLow),
      actualClose: Number(actualClose),
      accuracy,
      feedback: feedback || '',
      reviewedAt: new Date().toISOString(),
    };

    await saveReview(review);

    return NextResponse.json({
      success: true,
      data: review,
    });
  } catch (error: any) {
    console.error('创建复盘失败:', error);
    return NextResponse.json(
      { error: error.message || '创建复盘失败' },
      { status: 500 }
    );
  }
}
