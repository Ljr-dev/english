import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Instância principal do NextAuth no servidor.
 *
 * Com o provider Credentials a sessão é JWT — não usamos mais o
 * PrismaAdapter nem a tabela `sessions`. O usuário é validado no
 * callback `authorize` (ver auth.config.ts).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
});

