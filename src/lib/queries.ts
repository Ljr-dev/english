import { prisma } from "@/lib/prisma";
import {
  computeLessonProgress,
  isWordMastered,
  type WordWithProgress,
} from "@/lib/progression";

/** Trilha completa: níveis → lições, com progresso do usuário e desbloqueio. */
export async function getTrail(userId: string) {
  const levels = await prisma.level.findMany({
    orderBy: { order: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      order: true,
      lessons: {
        orderBy: { orderInLevel: "asc" },
        select: {
          id: true,
          title: true,
          orderInLevel: true,
          sentence: { select: { status: true } },
          lessonWords: { select: { wordId: true } },
        },
      },
    },
  });

  const progressRows = await prisma.userProgress.findMany({
    where: { userId },
    select: { wordId: true, masteryLevel: true },
  });
  const masteryByWord = new Map(
    progressRows.map((p) => [p.wordId, p.masteryLevel]),
  );

  let previousLevelComplete = true;

  return levels.map((level) => {
    const lessons = level.lessons.map((lesson) => {
      const wordIds = lesson.lessonWords.map((lw) => lw.wordId);
      const progress = computeLessonProgress(
        wordIds.map((id) => ({
          masteryLevel: masteryByWord.get(id) ?? 0,
        })),
      );

      return {
        id: lesson.id,
        title: lesson.title,
        orderInLevel: lesson.orderInLevel,
        totalWords: wordIds.length,
        masteredWords: progress.mastered,
        percent: progress.percent,
        isComplete: progress.isComplete,
        hasSentence: ["READY", "MANUAL"].includes(lesson.sentence?.status ?? ""),
      };
    });

    const levelComplete =
      lessons.length > 0 && lessons.every((l) => l.isComplete);

    // Desbloqueio sequencial: o nível só abre quando o anterior termina.
    const isUnlocked = previousLevelComplete;
    previousLevelComplete = previousLevelComplete && levelComplete;

    return {
      id: level.id,
      code: level.code,
      name: level.name,
      description: level.description,
      order: level.order,
      isUnlocked,
      isComplete: levelComplete,
      lessons,
    };
  });
}

/** Carrega uma lição com as palavras e o progresso do usuário. */
export async function getLessonForUser(lessonId: string, userId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      title: true,
      orderInLevel: true,
      level: { select: { id: true, code: true, name: true, order: true } },
      sentence: {
        select: { status: true, sentenceEn: true, sentencePt: true },
      },
      lessonWords: {
        orderBy: { position: "asc" },
        select: {
          word: {
            select: {
              id: true,
              english: true,
              portuguese: true,
              partOfSpeech: true,
              exampleEn: true,
              examplePt: true,
            },
          },
        },
      },
    },
  });

  if (!lesson) return null;

  const progressRows = await prisma.userProgress.findMany({
    where: {
      userId,
      wordId: { in: lesson.lessonWords.map((lw) => lw.word.id) },
    },
    select: { wordId: true, masteryLevel: true },
  });
  const masteryByWord = new Map(
    progressRows.map((p) => [p.wordId, p.masteryLevel]),
  );

  const words: WordWithProgress[] = lesson.lessonWords.map((lw) => ({
    ...lw.word,
    masteryLevel: masteryByWord.get(lw.word.id) ?? 0,
    correctCount: 0,
    wrongCount: 0,
  }));

  const progress = computeLessonProgress(words);

  return {
    id: lesson.id,
    title: lesson.title,
    orderInLevel: lesson.orderInLevel,
    level: lesson.level,
    words,
    progress,
    sentence: lesson.sentence,
  };
}

/** Estatísticas do painel do aluno. */
export async function getUserStats(userId: string) {
  const [progress, attempts, totalWords] = await Promise.all([
    prisma.userProgress.findMany({
      where: { userId },
      select: { masteryLevel: true, correctCount: true, wrongCount: true },
    }),
    prisma.quizAttempt.count({ where: { userId } }),
    prisma.word.count(),
  ]);

  const mastered = progress.filter((p) => isWordMastered(p.masteryLevel)).length;
  const correct = progress.reduce((sum, p) => sum + p.correctCount, 0);
  const wrong = progress.reduce((sum, p) => sum + p.wrongCount, 0);
  const total = correct + wrong;

  return {
    mastered,
    totalWords,
    attempts,
    accuracy: total === 0 ? 0 : Math.round((correct / total) * 100),
    percentOfCourse:
      totalWords === 0 ? 0 : Math.round((mastered / totalWords) * 100),
  };
}
