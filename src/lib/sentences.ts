import { prisma } from "@/lib/prisma";
import {
  generateSentence,
  isDeepSeekConfigured,
} from "@/lib/deepseek";

/**
 * Serviço de frases de consolidação com cache.
 *
 * Fluxo (exatamente como definido pelo usuário):
 *  1. O usuário termina as palavras de uma lição.
 *  2. O sistema procura a frase daquela lição no banco.
 *  3. Se existir (READY) → entrega na hora, sem gastar API.
 *  4. Se não existir → fica como PENDING até o admin gerar pelo painel.
 */

export type SentenceState =
  | { status: "READY"; sentenceEn: string; sentencePt: string }
  | { status: "PENDING" }
  | { status: "FAILED"; error: string | null };

/** Busca a frase cacheada de uma lição. Nunca chama a API. */
export async function getCachedSentence(
  lessonId: string,
): Promise<SentenceState> {
  const cached = await prisma.sentenceCache.findUnique({
    where: { lessonId },
    select: {
      status: true,
      sentenceEn: true,
      sentencePt: true,
      error: true,
    },
  });

  if (!cached) return { status: "PENDING" };

  if (
    cached.status === "READY" &&
    cached.sentenceEn &&
    cached.sentencePt
  ) {
    return {
      status: "READY",
      sentenceEn: cached.sentenceEn,
      sentencePt: cached.sentencePt,
    };
  }

  if (cached.status === "FAILED") {
    return { status: "FAILED", error: cached.error };
  }

  return { status: "PENDING" };
}

/** Lista lições que ainda não têm frase gerada (para o painel de admin). */
export async function listPendingSentences(limit = 50) {
  return prisma.lesson.findMany({
    where: {
      OR: [
        { sentence: { is: null } },
        { sentence: { status: { in: ["PENDING", "FAILED"] } } },
      ],
    },
    select: {
      id: true,
      title: true,
      orderInLevel: true,
      level: { select: { code: true, name: true, order: true } },
      sentence: { select: { status: true, error: true } },
      lessonWords: {
        orderBy: { position: "asc" },
        select: { word: { select: { english: true, portuguese: true } } },
      },
    },
    orderBy: [{ level: { order: "asc" } }, { orderInLevel: "asc" }],
    take: limit,
  });
}

export type GenerateResult =
  | { ok: true; lessonId: string; sentenceEn: string; sentencePt: string }
  | { ok: false; lessonId: string; error: string };

/**
 * Gera (via DeepSeek) e persiste a frase de uma lição.
 * Deve ser chamada apenas por rotas de admin.
 */
export async function generateSentenceForLesson(
  lessonId: string,
  adminUserId: string,
): Promise<GenerateResult> {
  if (!isDeepSeekConfigured()) {
    return {
      ok: false,
      lessonId,
      error: "DEEPSEEK_API_KEY não configurada no servidor.",
    };
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      level: { select: { name: true, code: true } },
      lessonWords: {
        orderBy: { position: "asc" },
        select: { word: { select: { english: true, portuguese: true } } },
      },
    },
  });

  if (!lesson) {
    return { ok: false, lessonId, error: "Lição não encontrada." };
  }

  const words = lesson.lessonWords.map((lw) => lw.word);
  if (words.length === 0) {
    return { ok: false, lessonId, error: "Lição sem palavras." };
  }

  // Marca como GENERATING para evitar trabalho duplicado concorrente
  await prisma.sentenceCache.upsert({
    where: { lessonId },
    update: { status: "GENERATING", error: null },
    create: { lessonId, status: "GENERATING" },
  });

  try {
    const generated = await generateSentence(
      words,
      `${lesson.level.code} (${lesson.level.name})`,
    );

    await prisma.sentenceCache.update({
      where: { lessonId },
      data: {
        sentenceEn: generated.sentenceEn,
        sentencePt: generated.sentencePt,
        expectedPt: generated.sentencePt,
        status: "READY",
        error: null,
        model: generated.model,
        tokensUsed: generated.tokensUsed,
        generatedById: adminUserId,
        generatedAt: new Date(),
      },
    });

    return {
      ok: true,
      lessonId,
      sentenceEn: generated.sentenceEn,
      sentencePt: generated.sentencePt,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";

    await prisma.sentenceCache.update({
      where: { lessonId },
      data: { status: "FAILED", error: message.slice(0, 900) },
    });

    return { ok: false, lessonId, error: message };
  }
}

/** Estatísticas de uso da API para o painel de admin. */
export async function getSentenceStats() {
  const [ready, pending, failed, tokens] = await Promise.all([
    prisma.sentenceCache.count({ where: { status: "READY" } }),
    prisma.sentenceCache.count({ where: { status: { in: ["PENDING", "GENERATING"] } } }),
    prisma.sentenceCache.count({ where: { status: "FAILED" } }),
    prisma.sentenceCache.aggregate({
      _sum: { tokensUsed: true },
      where: { status: "READY" },
    }),
  ]);

  return {
    ready,
    pending,
    failed,
    totalTokens: tokens._sum.tokensUsed ?? 0,
  };
}
