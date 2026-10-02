import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

/**
 * Configuração compartilhada do NextAuth.
 * Fica separada do `auth.ts` para poder ser importada no middleware (edge),
 * que não tem acesso ao Prisma.
 *
 * O provider Credentials valida o usuário no callback `authorize`, que só
 * roda no servidor (importa Prisma dinamicamente para não vazar no edge).
 */
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authConfig = {
  providers: [
    Credentials({
      name: "Email e senha",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;

        const email = parsed.data.email.toLowerCase().trim();

        // Import dinâmico: mantém Prisma/bcrypt fora do bundle do edge.
        const [{ prisma }, { verifyPassword }] = await Promise.all([
          import("@/lib/prisma"),
          import("@/lib/password"),
        ]);

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.active) return null;

        const valid = await verifyPassword(parsed.data.password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  // Credentials exige sessão JWT (não usa a tabela `sessions`).
  session: { strategy: "jwt" },
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;

      const isPublic =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/api/auth");

      if (isPublic) return true;
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role?: string }).role ?? "USER";
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token?.id as string;
        session.user.role = (token?.role as string) ?? "USER";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

