import { NextRequest, NextResponse } from 'next/server';
import { analyzeStock } from '@/lib/ai';
import { saveAnalysis, saveImage } from '@/lib/storage';
import { Analysis } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const userInput = formData.get('input') as string;

    if (!image) {
      return NextResponse.json(
        { error: '请上传图片' },
        { status: 400 }
      );
    }

    // 转换图片为base64
    const arrayBuffer = await image.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');

    // 保存图片
    const imageUrl = await saveImage(buffer, image.name);

    // 调用DeepSeek API分析
    const aiAnalysis = await analyzeStock(base64Image, userInput);

    // 生成分析记录
    const analysis: Analysis = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      date: new Date().toISOString().split('T')[0],
      imageUrl,
      userInput: userInput || '',
      aiAnalysis,
      status: 'pending_review',
      createdAt: new Date().toISOString(),
    };

    // 保存到文件
    await saveAnalysis(analysis);

    return NextResponse.json({
      success: true,
      data: analysis,
    });
  } catch (error: any) {
    console.error('分析失败:', error);
    return NextResponse.json(
      { error: error.message || '分析失败，请稍后重试' },
      { status: 500 }
    );
  }
}
