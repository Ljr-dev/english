import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// O proxy roda no edge: sem Prisma e sem adapter.
// Com Credentials a sessão é JWT, validada aqui mesmo pelo middleware.
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const { pathname } = request.nextUrl;

  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth");

  if (isPublic) return;

  if (!request.auth?.user) {
    const url = new URL("/login", request.nextUrl.origin);
    url.searchParams.set("callbackUrl", request.nextUrl.href);
    return Response.redirect(url);
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
