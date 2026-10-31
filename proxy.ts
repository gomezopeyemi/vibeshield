import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CONFIGURED } from "@/lib/supabase/env";
import { DEMO_ALLOWED } from "@/lib/config";
import { updateSession } from "@/lib/supabase/proxy";
import { isProtectedPath } from "@/lib/auth/routes";

/* Optimistic gate + session refresh. Authoritative checks live in lib/auth/session.ts. */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!AUTH_CONFIGURED) {
    // Demo deployments run on a labelled fixture session; anything else fails closed.
    if (DEMO_ALLOWED || !isProtectedPath(pathname)) return NextResponse.next();
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { response, userId } = await updateSession(request);
  if (userId || !isProtectedPath(pathname)) return response;

  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  const redirect = NextResponse.redirect(login);
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  redirect.headers.set("cache-control", "private, no-store");
  return redirect;
}

export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
