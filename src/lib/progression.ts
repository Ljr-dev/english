/**
 * Motor de progressão do curso.
 *
 * Regra central pedida pelo usuário: o aluno NÃO avança enquanto não acertar.
 * - Uma palavra só é considerada "dominada" após `MASTERY_TARGET` acertos.
 * - A lição só libera a frase de consolidação quando TODAS as palavras
 *   atingirem o domínio mínimo.
 * - O nível só libera a próxima lição quando a lição atual estiver concluída.
 *
 * O quiz é sempre de múltipla escolha: o aluno escolhe a alternativa, nunca
 * digita a resposta.
 */

/** Acertos consecutivos necessários para dominar uma palavra. */
export const MASTERY_TARGET = 2;

/** Acertos consecutivos necessários para liberar a frase da lição. */
export const LESSON_MASTERY_TARGET = MASTERY_TARGET;

export type WordWithProgress = {
  id: string;
  english: string;
  portuguese: string;
  partOfSpeech: string | null;
  exampleEn: string | null;
  examplePt: string | null;
  masteryLevel: number;
  correctCount: number;
  wrongCount: number;
};

/** Uma palavra está dominada quando atingiu os acertos consecutivos exigidos. */
export function isWordMastered(masteryLevel: number): boolean {
  return masteryLevel >= MASTERY_TARGET;
}

/** Calcula o novo estado de progresso após uma resposta. */
export function applyAnswer(
  current: { masteryLevel: number; correctCount: number; wrongCount: number },
  isCorrect: boolean,
): { masteryLevel: number; correctCount: number; wrongCount: number } {
  if (isCorrect) {
    return {
      masteryLevel: Math.min(current.masteryLevel + 1, MASTERY_TARGET),
      correctCount: current.correctCount + 1,
      wrongCount: current.wrongCount,
    };
  }

  // Errou: volta ao início do domínio daquela palavra — não evolui.
  return {
    masteryLevel: 0,
    correctCount: current.correctCount,
    wrongCount: current.wrongCount + 1,
  };
}

/** Progresso agregado de uma lição. */
export type LessonProgress = {
  total: number;
  mastered: number;
  percent: number;
  isComplete: boolean;
};

export function computeLessonProgress(
  words: { masteryLevel: number }[],
): LessonProgress {
  const total = words.length;
  const mastered = words.filter((w) => isWordMastered(w.masteryLevel)).length;
  const percent = total === 0 ? 0 : Math.round((mastered / total) * 100);

  return {
    total,
    mastered,
    percent,
    isComplete: total > 0 && mastered === total,
  };
}

/**
 * Calcula o XP ganho numa resposta.
 * Acertos valem mais; palavras mais difíceis (níveis altos) valem mais.
 */
export function computeXp(
  isCorrect: boolean,
  levelOrder: number,
  masteryLevel: number,
): number {
  if (!isCorrect) return 0;
  const base = 10 + levelOrder * 2;
  const bonus = masteryLevel === 0 ? 5 : 0;
  return base + bonus;
}

/** Converte XP total em um rótulo de fluência exibido ao usuário. */
export function fluencyLabel(xp: number): string {
  if (xp < 200) return "Iniciante";
  if (xp < 600) return "Básico";
  if (xp < 1400) return "Intermediário";
  if (xp < 2600) return "Intermediário Avançado";
  if (xp < 4200) return "Avançado";
  return "Fluente";
}
