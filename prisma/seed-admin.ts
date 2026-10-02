/**
 * Garante que o administrador inicial exista.
 *
 * Roda junto com o `db:seed` e cria o usuário definido por ADMIN_EMAIL /
 * ADMIN_PASSWORD (padrão: leandrojoserocha@hotmail.com / 123456).
 * É idempotente: se o usuário já existir, apenas garante o papel ADMIN.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { hashPassword } from "../src/lib/password";

const DEFAULT_ADMIN_EMAIL = "leandrojoserocha@hotmail.com";
const DEFAULT_ADMIN_PASSWORD = "123456";

export async function seedAdmin(prisma: PrismaClient): Promise<void> {
  const email = (
    process.env.ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL
  ).toLowerCase();
  const password = process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;

  const passwordHash = await hashPassword(password);

  await prisma.user.upsert({
    where: { email },
    update: { role: "ADMIN", active: true, passwordHash },
    create: {
      email,
      name: "Administrador",
      passwordHash,
      role: "ADMIN",
      active: true,
    },
  });

  console.log(`  ✅ Admin: ${email}`);
}

// Permite rodar este arquivo isolado: tsx prisma/seed-admin.ts
if (process.argv[1]?.includes("seed-admin")) {
  const adapter = new PrismaMssql(process.env.DATABASE_URL!);
  const prisma = new PrismaClient({ adapter });
  seedAdmin(prisma)
    .catch((error) => {
      console.error("❌ Erro ao criar admin:", error);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
