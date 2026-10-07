import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyAnswer, computeXp, MASTERY_TARGET } from "@/lib/progression";

const bodySchema = z.object({
  wordId: z.string().min(1),
  // "EN_TO_PT" = pergunta em inglês; "PT_TO_EN" = pergunta em português.
  mode: z.enum(["EN_TO_PT", "PT_TO_EN"]),
  // Alternativa escolhida pelo aluno. O quiz é sempre de múltipla escolha.
  answer: z.string().trim().min(1).max(200),
});

/**
 * Registra uma tentativa de resposta.
 * A progressão é travada: errar zera o domínio daquela palavra.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const { wordId, mode, answer } = parsed.data;

  const word = await prisma.word.findUnique({
    where: { id: wordId },
    select: {
      id: true,
      english: true,
      portuguese: true,
      level: { select: { order: true } },
    },
  });

  if (!word) {
    return NextResponse.json(
      { error: "Palavra não encontrada" },
      { status: 404 },
    );
  }

  // O esperado é sempre o texto cadastrado no banco e a alternativa escolhida
  // vem exatamente dessa lista: a comparação é direta, sem tolerância.
  const expected = mode === "PT_TO_EN" ? word.english : word.portuguese;
  const isCorrect = answer === expected;

  const existing = await prisma.userProgress.findUnique({
    where: { userId_wordId: { userId: session.user.id, wordId } },
  });

  const current = existing ?? {
    masteryLevel: 0,
    correctCount: 0,
    wrongCount: 0,
  };

  const next = applyAnswer(current, isCorrect);
  const xp = computeXp(isCorrect, word.level.order, current.masteryLevel);

  await prisma.$transaction([
    prisma.userProgress.upsert({
      where: { userId_wordId: { userId: session.user.id, wordId } },
      update: {
        masteryLevel: next.masteryLevel,
        correctCount: next.correctCount,
        wrongCount: next.wrongCount,
        lastSeenAt: new Date(),
        nextReviewAt: new Date(
          Date.now() + (isCorrect ? 86_400_000 : 3_600_000),
        ),
      },
      create: {
        userId: session.user.id,
        wordId,
        masteryLevel: next.masteryLevel,
        correctCount: next.correctCount,
        wrongCount: next.wrongCount,
      },
    }),
    prisma.quizAttempt.create({
      data: {
        userId: session.user.id,
        wordId,
        mode: "MULTIPLE_CHOICE",
        answer: answer.slice(0, 200),
        isCorrect,
      },
    }),
  ]);

  return NextResponse.json({
    isCorrect,
    expected,
    masteryLevel: next.masteryLevel,
    isMastered: next.masteryLevel >= MASTERY_TARGET,
    xp,
  });
}
