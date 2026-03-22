import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip login page itself
  if (pathname === "/admin/login") {
    // If already logged in, redirect to admin dashboard
    const token = request.cookies.get("admin_token")?.value;
    if (token) {
      // Basic check - full verification happens server-side
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && payload.exp > now) {
            return NextResponse.redirect(new URL("/admin", request.url));
          }
        }
      } catch {
        // Invalid token, let them access login page
      }
    }
    return NextResponse.next();
  }

  // Protect all /admin routes
  if (pathname.startsWith("/admin")) {
    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    // Basic JWT structure validation (full verification in API routes)
    try {
      const parts = token.split(".");
      if (parts.length !== 3) {
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        // Token expired
        const response = NextResponse.redirect(new URL("/admin/login", request.url));
        response.cookies.set("admin_token", "", { maxAge: 0, path: "/" });
        return response;
      }
    } catch {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
