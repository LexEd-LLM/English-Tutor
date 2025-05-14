import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Các route không cần auth
const publicRoutes = [
  "/",
  "/admin/login",
  "/api/admin/auth"
];

const protectedUserRoutes = [
  "/quiz",
  "/results",
  "/lesson",
  "/courses",
  "/quiz-history", 
  "/learn",
  "/shop",
  "/leaderboard"
];

const isProtectedUserRoute = (path: string) =>
  protectedUserRoutes.some(route => path.startsWith(route));

// Các route admin
const adminRoutes = [
  "/admin",
  "/admin/users"
];

function isAdminRoute(path: string) {
  return adminRoutes.some(route => path.startsWith(route));
}

function isPublicRoute(path: string) {
  return publicRoutes.some(route => path.startsWith(route));
}

// Middleware chính
export default authMiddleware({
  publicRoutes: [
    ...publicRoutes,
    ...adminRoutes, // Thêm admin routes vào publicRoutes của Clerk
    "/api/admin/(.*)", // Cho phép tất cả API admin routes
  ],
  beforeAuth: (req) => {
    const { pathname } = req.nextUrl;

    // Redirect từ /explanation sang /quiz
    if (pathname.startsWith('/explanation')) {
      const url = req.nextUrl.clone();
      url.pathname = '/quiz';
      return NextResponse.redirect(url);
    }

    // Nếu là admin route, kiểm tra custom auth
    if (isAdminRoute(pathname) && !isPublicRoute(pathname)) {
      const token = req.cookies.get("admin_token")?.value;

      if (!token) {
        return NextResponse.redirect(new URL("/admin/login", req.url));
      }
    }

    return NextResponse.next();
  },
  afterAuth: (auth, req) => {
    // Xử lý sau khi Clerk auth hoàn tất
    const { pathname } = req.nextUrl;
    
    // Redirect về "/" nếu chưa đăng nhập và truy cập route cần bảo vệ
    if (!auth.userId && isProtectedUserRoute(pathname)) {
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Nếu chưa đăng nhập và không phải public route, redirect tới /admin/login
    if (!auth.userId && !isPublicRoute(pathname)) {
      const isAdmin = isAdminRoute(pathname);
      return NextResponse.redirect(new URL(isAdmin ? "/admin/login" : "/", req.url));
    }

    return NextResponse.next();
  },
});

export const config = {
  matcher: [
    "/((?!.+\\.[\\w]+$|_next).*)",
    "/(api|trpc)(.*)",
  ],
}; 