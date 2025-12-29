import { NextResponse } from 'next/server';
import { getAnalyses } from '@/lib/storage';

export async function GET() {
  try {
    const analyses = await getAnalyses();

    // 按时间倒序排列
    const sortedAnalyses = analyses.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: sortedAnalyses,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取历史记录失败' },
      { status: 500 }
    );
  }
}
