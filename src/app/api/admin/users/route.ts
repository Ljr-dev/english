import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado", status: 401 };
  if (session.user.role !== "ADMIN") {
    return { error: "Acesso restrito ao administrador", status: 403 };
  }
  return { userId: session.user.id };
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(6).max(200),
  role: z.enum(["USER", "ADMIN"]).default("USER"),
});

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(120).optional(),
  password: z.string().min(6).max(200).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  active: z.boolean().optional(),
});

const deleteSchema = z.object({ id: z.string().min(1) });

/** Lista todos os usuários (sem expor o hash da senha). */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      createdAt: true,
      _count: { select: { attempts: true } },
    },
  });

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      attempts: user._count.attempts,
    })),
  });
}

/** Cria um novo usuário com senha. */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const json = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos. Verifique e-mail e senha (mín. 6 caracteres)." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe um usuário com este e-mail." },
      { status: 409 },
    );
  }

  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name ?? email.split("@")[0],
      passwordHash: await hashPassword(parsed.data.password),
      role: parsed.data.role,
      active: true,
    },
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}

/** Atualiza nome, senha, papel ou status de um usuário. */
export async function PATCH(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const json = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { id, password, ...rest } = parsed.data;

  // Evita que o admin se rebaixe/desative e perca o acesso.
  if (id === guard.userId) {
    if (rest.role === "USER" || rest.active === false) {
      return NextResponse.json(
        { error: "Você não pode remover o próprio acesso de administrador." },
        { status: 400 },
      );
    }
  }

  const data: Record<string, unknown> = { ...rest };
  if (password) data.passwordHash = await hashPassword(password);

  const user = await prisma.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true },
  });

  return NextResponse.json({ user });
}

/** Remove um usuário (e, em cascata, seus dados de progresso). */
export async function DELETE(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const json = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  if (parsed.data.id === guard.userId) {
    return NextResponse.json(
      { error: "Você não pode excluir a própria conta." },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id: parsed.data.id } });

  return NextResponse.json({ ok: true });
}
