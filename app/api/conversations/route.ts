import { NextResponse } from 'next/server';
import { getConversations, deleteConversation } from '@/lib/storage';

export async function GET() {
  try {
    const conversations = await getConversations();

    // 按更新时间倒序排列
    const sortedConversations = conversations.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json({
      success: true,
      data: sortedConversations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '获取对话列表失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: '缺少对话ID' },
        { status: 400 }
      );
    }

    await deleteConversation(id);

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || '删除对话失败' },
      { status: 500 }
    );
  }
}
