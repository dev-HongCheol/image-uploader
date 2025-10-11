import { NextRequest } from "next/server";
import { updateSession } from "./utils/supabase/middleware";

/**
 * Next.js Middleware
 * - Supabase 세션 업데이트 및 인증 체크
 * - Edge Runtime에서 실행됨
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (API routes use Node.js runtime)
     */
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
