/**
 * Montagem das questões de múltipla escolha.
 *
 * O aluno nunca digita: ele escolhe uma alternativa. A alternativa correta
 * é sempre o texto cadastrado no banco, então o servidor valida a resposta
 * comparando o texto escolhido com o esperado — sem tolerância a digitação.
 *
 * As opções são montadas por lição (não só pelas 10 palavras da lição) para
 * que os distratores sejam variados e não se repitam entre as questões.
 */

/** Quantidade de alternativas apresentadas por questão. */
export const OPTION_COUNT = 4;

/** Embaralha uma lista (Fisher-Yates). */
export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Escolhe até `count` distratores distintos do valor correto.
 * Se a fonte tiver menos opções que o necessário, devolve o que existir —
 * a questão continua válida, apenas com menos alternativas.
 */
export function buildOptions(
  correct: string,
  pool: string[],
  count = OPTION_COUNT,
): string[] {
  const seen = new Set<string>();
  const distractors: string[] = [];

  for (const candidate of shuffle(pool)) {
    const value = candidate.trim();
    if (!value || value === correct || seen.has(value)) continue;

    seen.add(value);
    distractors.push(value);
    if (distractors.length >= count - 1) break;
  }

  return shuffle([correct, ...distractors]);
}

/** Monta as opções em inglês (pergunta em português) a partir da lição. */
export function optionsForEnglish(
  correct: string,
  lessonWords: { english: string }[],
): string[] {
  return buildOptions(
    correct,
    lessonWords.map((word) => word.english),
  );
}

/** Monta as opções em português (pergunta em inglês) a partir da lição. */
export function optionsForPortuguese(
  correct: string,
  lessonWords: { portuguese: string }[],
): string[] {
  return buildOptions(
    correct,
    lessonWords.map((word) => word.portuguese),
  );
}

/**
 * Monta as opções de tradução da frase de consolidação.
 * Os distratores são as traduções das outras frases da trilha — quanto mais
 * frases cadastradas, mais variadas ficam as alternativas.
 */
export function optionsForSentence(
  correct: string,
  trailSentences: string[],
): string[] {
  return buildOptions(correct, trailSentences);
}
