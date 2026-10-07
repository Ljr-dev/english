import { prisma } from "@/lib/prisma";

/**
 * Serviço das frases de consolidação.
 *
 * Fluxo:
 *  1. O usuário termina as palavras de uma lição.
 *  2. O sistema procura a frase daquela lição no banco.
 *  3. Se existir (READY ou MANUAL) → entrega na hora.
 *  4. Se não existir → fica como PENDING até o admin cadastrar pelo painel.
 *
 * Nenhuma API externa é chamada: as frases são conteúdo editorial.
 */

/** Status de cache que contam como frase disponível para o aluno. */
const READY_STATUSES = ["READY", "MANUAL"];

export type SentenceState =
  | { status: "READY"; sentenceEn: string; sentencePt: string }
  | { status: "PENDING" };

/** Busca a frase cadastrada de uma lição. Nunca chama API externa. */
export async function getCachedSentence(
  lessonId: string,
): Promise<SentenceState> {
  const cached = await prisma.sentenceCache.findUnique({
    where: { lessonId },
    select: {
      status: true,
      sentenceEn: true,
      sentencePt: true,
    },
  });

  if (
    cached &&
    READY_STATUSES.includes(cached.status) &&
    cached.sentenceEn &&
    cached.sentencePt
  ) {
    return {
      status: "READY",
      sentenceEn: cached.sentenceEn,
      sentencePt: cached.sentencePt,
    };
  }

  return { status: "PENDING" };
}

/** Lista as lições para o painel do admin, com a frase atual de cada uma. */
export async function listSentencesForAdmin(limit = 100) {
  return prisma.lesson.findMany({
    select: {
      id: true,
      title: true,
      orderInLevel: true,
      level: { select: { code: true, name: true, order: true } },
      sentence: {
        select: {
          status: true,
          sentenceEn: true,
          sentencePt: true,
          updatedAt: true,
        },
      },
      lessonWords: {
        orderBy: { position: "asc" },
        select: { word: { select: { english: true, portuguese: true } } },
      },
    },
    orderBy: [{ level: { order: "asc" } }, { orderInLevel: "asc" }],
    take: limit,
  });
}

/** Estatísticas das frases para o painel de admin. */
export async function getSentenceStats() {
  const [ready, pending, manual] = await Promise.all([
    prisma.sentenceCache.count({ where: { status: "READY" } }),
    prisma.sentenceCache.count({ where: { status: "PENDING" } }),
    prisma.sentenceCache.count({ where: { status: "MANUAL" } }),
  ]);

  return { ready, pending, manual, total: ready + pending + manual };
}

export type SaveSentenceResult =
  | { ok: true; lessonId: string }
  | { ok: false; error: string };

/**
 * Cadastra (ou atualiza) a frase de uma lição.
 * Deve ser chamada apenas por rotas de admin.
 */
export async function saveSentenceForLesson(
  lessonId: string,
  sentenceEn: string,
  sentencePt: string,
): Promise<SaveSentenceResult> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true },
  });

  if (!lesson) return { ok: false, error: "Lição não encontrada." };

  const en = sentenceEn.trim();
  const pt = sentencePt.trim();
  if (!en || !pt) {
    return { ok: false, error: "Informe a frase em inglês e a tradução." };
  }

  const data = {
    sentenceEn: en,
    sentencePt: pt,
    expectedPt: pt,
    status: "MANUAL",
  };

  await prisma.sentenceCache.upsert({
    where: { lessonId },
    update: data,
    create: { lessonId, ...data },
  });

  await prisma.manualSentence.upsert({
    where: { lessonId },
    update: { sentenceEn: en, sentencePt: pt },
    create: { lessonId, sentenceEn: en, sentencePt: pt },
  });

  return { ok: true, lessonId };
}

/** Remove a frase de uma lição, devolvendo-a para a fila de pendências. */
export async function clearSentenceForLesson(
  lessonId: string,
): Promise<SaveSentenceResult> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true },
  });

  if (!lesson) return { ok: false, error: "Lição não encontrada." };

  await prisma.sentenceCache.update({
    where: { lessonId },
    data: {
      sentenceEn: null,
      sentencePt: null,
      expectedPt: null,
      status: "PENDING",
    },
  });

  await prisma.manualSentence.deleteMany({ where: { lessonId } });

  return { ok: true, lessonId };
}
