import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import {
  clearSentenceForLesson,
  getSentenceStats,
  listSentencesForAdmin,
  saveSentenceForLesson,
} from "@/lib/sentences";

const putSchema = z.object({
  lessonId: z.string().min(1),
  sentenceEn: z.string().trim().min(1).max(1000),
  sentencePt: z.string().trim().min(1).max(1000),
});

const deleteSchema = z.object({ lessonId: z.string().min(1) });

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) return { error: "Não autenticado", status: 401 };
  if (session.user.role !== "ADMIN") {
    return { error: "Acesso restrito ao administrador", status: 403 };
  }
  return { userId: session.user.id };
}

/** Lista as lições com a frase cadastrada e as estatísticas. */
export async function GET() {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const [lessons, stats] = await Promise.all([
    listSentencesForAdmin(),
    getSentenceStats(),
  ]);

  return NextResponse.json({
    stats,
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      level: lesson.level.code,
      levelName: lesson.level.name,
      orderInLevel: lesson.orderInLevel,
      status: lesson.sentence?.status ?? "PENDING",
      sentenceEn: lesson.sentence?.sentenceEn ?? null,
      sentencePt: lesson.sentence?.sentencePt ?? null,
      updatedAt: lesson.sentence?.updatedAt ?? null,
      words: lesson.lessonWords.map((lw) => lw.word.english),
    })),
  });
}

/** Cadastra ou atualiza a frase de uma lição. */
export async function PUT(request: Request) {
  const guard = await requireAdmin();
  if ("error" in guard) {
    return NextResponse.json({ error: guard.error }, { status: guard.status });
  }

  const json = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos: informe a frase em inglês e a tradução." },
      { status: 400 },
    );
  }

  const result = await saveSentenceForLesson(
    parsed.data.lessonId,
    parsed.data.sentenceEn,
    parsed.data.sentencePt,
  );

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

/** Remove a frase de uma lição (volta para a lista de pendentes). */
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

  const result = await clearSentenceForLesson(parsed.data.lessonId);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
