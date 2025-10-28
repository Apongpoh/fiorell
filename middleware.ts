import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Handle CORS for API routes
  if (request.nextUrl.pathname.startsWith("/api/")) {
    // Handle preflight requests
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }

    // Add CORS headers to all API responses
    const response = NextResponse.next();
    response.headers.set("Access-Control-Allow-Origin", "*");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");

    return response;
  }

  // Protect authenticated app routes
  const protectedPaths = [/^\/matches(\/.*)?$/, /^\/chat(\/.*)?$/, /^\/dashboard$/, /^\/profile(\/.*)?$/, /^\/settings(\/.*)?$/];
  const isProtected = protectedPaths.some((re) =>
    re.test(request.nextUrl.pathname)
  );
  if (isProtected) {
    // Check for token in Authorization header (which frontend should send)
    const authHeader = request.headers.get("authorization");
    const hasToken = authHeader && authHeader.startsWith("Bearer ");
    
    // Also check for token in cookie as fallback
    const tokenCookie = request.cookies.get("fiorell_auth_token") || request.cookies.get("auth_token");
    
    if (!hasToken && (!tokenCookie || !tokenCookie.value)) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on API routes (for CORS) and selected app routes (for auth)
  matcher: ["/api/:path*", "/matches/:path*", "/chat/:path*", "/dashboard", "/profile/:path*", "/settings/:path*"],
};
