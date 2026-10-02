/**
 * Cria ou atualiza um usuário do sistema.
 *
 * Uso:
 *   npm run db:user -- --email leandro@exemplo.com --password 123456 --name "Leandro" --admin
 *
 * Sem `--password`, uma senha aleatória é gerada e exibida no terminal.
 * Sem `--admin`, o papel é USER. Use `--no-active` para desativar o usuário.
 */
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { hashPassword } from "./password";

const adapter = new PrismaMssql(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

function readArg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function main() {
  const email = readArg("--email")?.toLowerCase().trim();
  if (!email) {
    console.error("❌ Informe o e-mail: npm run db:user -- --email x@y.com");
    process.exit(1);
  }

  const providedPassword = readArg("--password");
  const password = providedPassword ?? randomBytes(9).toString("base64url");
  const name = readArg("--name") ?? email.split("@")[0];
  const role = hasFlag("--admin") ? "ADMIN" : "USER";
  const active = !hasFlag("--no-active");

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role, active },
    create: { email, name, passwordHash, role, active },
    select: { id: true, email: true, name: true, role: true, active: true },
  });

  console.log("✅ Usuário pronto:");
  console.table([user]);
  if (!providedPassword) {
    console.log(`🔑 Senha gerada: ${password}`);
  }
}

main()
  .catch((error) => {
    console.error("❌ Erro ao criar usuário:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
