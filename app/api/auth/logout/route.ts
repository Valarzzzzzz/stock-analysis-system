import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const AUTH_COOKIE_NAME = 'auth_token';

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('登出失败:', error);
    return NextResponse.json(
      { success: false, error: '登出失败' },
      { status: 500 }
    );
  }
}
