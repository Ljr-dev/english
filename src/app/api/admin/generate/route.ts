import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateSentenceForLesson,
  getSentenceStats,
  listPendingSentences,
} from "@/lib/sentences";
import { isDeepSeekConfigured } from "@/lib/deepseek";

const bodySchema = z.object({
  lessonIds: z.array(z.string().min(1)).min(1).max(20),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado", status: 401 };
  if (session.user.role !== "ADMIN") {
    return { error: "Acesso restrito ao administrador", status: 403 };
  }
  return { userId: session.user.id };
}

/** Lista as lições pendentes e as estatísticas de uso da API. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const [pending, stats] = await Promise.all([
    listPendingSentences(),
    getSentenceStats(),
  ]);

  return NextResponse.json({
    configured: isDeepSeekConfigured(),
    stats,
    pending: pending.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      level: lesson.level.code,
      levelName: lesson.level.name,
      status: lesson.sentence?.status ?? "PENDING",
      error: lesson.sentence?.error ?? null,
      words: lesson.lessonWords.map((lw) => lw.word.english),
    })),
  });
}

/** Gera as frases de uma lista de lições usando a chave DeepSeek do servidor. */
export async function POST(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  if (!isDeepSeekConfigured()) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY não configurada no servidor." },
      { status: 400 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const results = [];
  for (const lessonId of parsed.data.lessonIds) {
    results.push(await generateSentenceForLesson(lessonId, guard.userId));
  }

  // Registra a geração no histórico de tentativas do admin
  await prisma.quizAttempt.create({
    data: {
      userId: guard.userId,
      wordId: (
        await prisma.lessonWord.findFirstOrThrow({
          where: { lessonId: parsed.data.lessonIds[0] },
          select: { wordId: true },
        })
      ).wordId,
      mode: "SENTENCE",
      answer: `ADMIN_GENERATE:${parsed.data.lessonIds.join(",")}`,
      isCorrect: results.every((r) => r.ok),
    },
  });

  return NextResponse.json({
    generated: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
  });
}
