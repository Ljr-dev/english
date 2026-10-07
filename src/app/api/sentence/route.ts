import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAnswerCorrectWithTolerance } from "@/lib/answer-check";
import { computeLessonProgress } from "@/lib/progression";

const bodySchema = z.object({
  lessonId: z.string().min(1),
  answer: z.string().max(2000),
});

/**
 * Valida a tradução da frase de consolidação.
 * A frase vem SEMPRE do banco — nenhuma API externa é chamada nesta rota.
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

  const { lessonId, answer } = parsed.data;

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      sentence: {
        select: { status: true, sentenceEn: true, sentencePt: true },
      },
      lessonWords: { select: { wordId: true } },
    },
  });

  if (!lesson) {
    return NextResponse.json({ error: "Lição não encontrada" }, { status: 404 });
  }

  const sentence = lesson.sentence;
  if (
    !sentence ||
    !["READY", "MANUAL"].includes(sentence.status) ||
    !sentence.sentencePt ||
    !sentence.sentenceEn
  ) {
    return NextResponse.json(
      { error: "A frase desta lição ainda não foi cadastrada." },
      { status: 409 },
    );
  }

  const isCorrect = isAnswerCorrectWithTolerance(answer, sentence.sentencePt);

  const progressRows = await prisma.userProgress.findMany({
    where: {
      userId: session.user.id,
      wordId: { in: lesson.lessonWords.map((lw) => lw.wordId) },
    },
    select: { masteryLevel: true },
  });

  const progress = computeLessonProgress(progressRows);

  await prisma.quizAttempt.create({
    data: {
      userId: session.user.id,
      wordId: lesson.lessonWords[0].wordId,
      mode: "SENTENCE",
      answer: answer.slice(0, 2000),
      isCorrect,
    },
  });

  return NextResponse.json({
    isCorrect,
    sentenceEn: sentence.sentenceEn,
    sentencePt: sentence.sentencePt,
    lessonComplete: progress.isComplete,
  });
}
