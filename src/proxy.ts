import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/session";

const SESSION_COOKIE = "taktis_tsj_session";

const ROLE_PATHS: Record<string, string> = {
  spg: "/spg",
  tl: "/tl",
  pic: "/admin",
  admin: "/admin",
};

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const user = token ? await verifySessionToken(token) : null;

  // Exempt static manifest & PWA assets from auth redirects
  if (
    pathname.startsWith("/api/") ||
    pathname.endsWith(".webmanifest") ||
    pathname === "/sw.js" ||
    pathname.startsWith("/workbox-")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/login") {
    const isLogout = req.nextUrl.searchParams.has("logout") || req.nextUrl.searchParams.has("error");
    if (user && !isLogout) {
      return NextResponse.redirect(new URL(ROLE_PATHS[user.role] ?? "/spg", req.url));
    }
    const res = NextResponse.next();
    if (isLogout) {
      res.cookies.delete(SESSION_COOKIE);
    }
    return res;
  }

  if (!user) {
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const allowedPrefix = ROLE_PATHS[user.role];
  const onOwnHome = pathname === allowedPrefix;
  const onAllowedPrefix = allowedPrefix && pathname.startsWith(`${allowedPrefix}/`);

  if (pathname === "/" || (!onOwnHome && !onAllowedPrefix)) {
    return NextResponse.redirect(new URL(allowedPrefix, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)"],
};
