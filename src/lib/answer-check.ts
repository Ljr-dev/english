/**
 * Normaliza texto para comparação de respostas.
 * Ignora acentos, caixa, pontuação e espaços extras.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Remove artigos e prefixos opcionais que não alteram o sentido
 * da tradução (ex.: "to eat" vs "eat", "o carro" vs "carro").
 */
function stripOptionalParts(text: string): string {
  return text
    .replace(/^(to|the|a|an|o|a|os|as|um|uma)\s+/g, "")
    .replace(/\s+(to|the|a|an|o|a|os|as|um|uma)$/g, "")
    .trim();
}

/**
 * Compara a resposta do usuário com a tradução esperada.
 * Aceita variações razoáveis (artigos, "to" em verbos, acentuação).
 */
export function isAnswerCorrect(answer: string, expected: string): boolean {
  const a = normalize(answer);
  const e = normalize(expected);

  if (!a) return false;
  if (a === e) return true;

  // "to eat" aceita "eat" e vice-versa
  if (stripOptionalParts(a) === stripOptionalParts(e)) return true;

  // Traduções com múltiplas opções separadas por "/" ou ","
  const alternatives = expected
    .split(/[/,;]/)
    .map((part) => normalize(part))
    .filter(Boolean);

  return alternatives.some(
    (alt) => alt === a || stripOptionalParts(alt) === stripOptionalParts(a),
  );
}

/** Distância de Levenshtein, usada para tolerar pequenos erros de digitação. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = curr;
  }

  return prev[b.length];
}

/**
 * Considera correto se a resposta estiver a no máximo 1 edição de distância
 * (para palavras com 4+ caracteres), tolerando erros de digitação.
 */
export function isAnswerCorrectWithTolerance(
  answer: string,
  expected: string,
): boolean {
  if (isAnswerCorrect(answer, expected)) return true;

  const a = normalize(answer);
  const e = normalize(expected);

  if (e.length < 4) return false;

  const distance = levenshtein(a, e);
  return distance <= 1;
}
