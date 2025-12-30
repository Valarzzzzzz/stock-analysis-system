import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const CORRECT_PASSWORD = '20251230';
const AUTH_COOKIE_NAME = 'auth_token';
const AUTH_TOKEN_VALUE = 'authenticated_20251230';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (password === CORRECT_PASSWORD) {
      // 设置认证cookie
      const cookieStore = await cookies();
      cookieStore.set(AUTH_COOKIE_NAME, AUTH_TOKEN_VALUE, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7天
        path: '/',
      });

      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { success: false, error: '密码错误' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('登录失败:', error);
    return NextResponse.json(
      { success: false, error: '登录失败' },
      { status: 500 }
    );
  }
}
