import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'auth_token';
const AUTH_TOKEN_VALUE = 'authenticated_20251230';

// 不需要认证的路径
const PUBLIC_PATHS = ['/login', '/api/auth/login'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 检查是否是公开路径
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));

  // 检查是否是静态资源
  const isStaticAsset = pathname.startsWith('/_next') ||
                        pathname.startsWith('/uploads') ||
                        pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp)$/);

  if (isPublicPath || isStaticAsset) {
    return NextResponse.next();
  }

  // 检查认证cookie
  const authToken = request.cookies.get(AUTH_COOKIE_NAME);

  if (!authToken || authToken.value !== AUTH_TOKEN_VALUE) {
    // 对于API请求，返回401错误而不是重定向
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: '未授权，请先登录' },
        { status: 401 }
      );
    }

    // 对于页面请求，重定向到登录页
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 已认证，继续
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * 匹配所有路径除了:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
