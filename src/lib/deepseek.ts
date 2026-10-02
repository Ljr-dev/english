/**
 * Cliente da DeepSeek.
 *
 * IMPORTANTE: a chave da API é usada SOMENTE por rotas de admin.
 * Todo o conteúdo gerado é persistido no banco (SentenceCache) e
 * reaproveitado por todos os usuários — ninguém além do admin
 * consome créditos da API.
 */

const DEFAULT_BASE_URL = "https://api.deepseek.com";
const DEFAULT_MODEL = "deepseek-chat";

export type GeneratedSentence = {
  sentenceEn: string;
  sentencePt: string;
  tokensUsed: number | null;
  model: string;
};

export class DeepSeekNotConfiguredError extends Error {
  constructor() {
    super(
      "DEEPSEEK_API_KEY não configurada. Defina a variável de ambiente para gerar frases.",
    );
    this.name = "DeepSeekNotConfiguredError";
  }
}

export function isDeepSeekConfigured(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

type ChatCompletionResponse = {
  choices?: { message?: { content?: string } }[];
  usage?: { total_tokens?: number };
};

/**
 * Pede à DeepSeek uma única frase em inglês que use TODAS as palavras
 * informadas, junto com sua tradução em português.
 */
export async function generateSentence(
  words: { english: string; portuguese: string }[],
  levelName: string,
): Promise<GeneratedSentence> {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) throw new DeepSeekNotConfiguredError();

  const baseUrl = process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE_URL;
  const model = process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;

  const wordList = words
    .map((w) => `- ${w.english} (${w.portuguese})`)
    .join("\n");

  const prompt = `Você é um professor de inglês criando material para um aluno brasileiro de nível ${levelName}.

Crie UMA única frase em inglês que use TODAS as palavras abaixo de forma natural e coerente:

${wordList}

Regras obrigatórias:
1. A frase deve conter TODAS as palavras listadas.
2. A frase deve ser natural, não uma lista de palavras.
3. O nível de dificuldade deve ser adequado para ${levelName}.
4. Forneça a tradução em português do Brasil.

Responda APENAS com um JSON válido, sem markdown, neste formato exato:
{"sentenceEn": "frase em inglês", "sentencePt": "tradução em português"}`;

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content:
            "Você gera frases de estudo de inglês e responde sempre em JSON válido.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 1.0,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `DeepSeek respondeu ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  const data = (await response.json()) as ChatCompletionResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek retornou uma resposta vazia.");

  let parsed: { sentenceEn?: string; sentencePt?: string };
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      `Não foi possível interpretar a resposta da DeepSeek: ${content.slice(0, 200)}`,
    );
  }

  if (!parsed.sentenceEn?.trim() || !parsed.sentencePt?.trim()) {
    throw new Error("A DeepSeek não retornou a frase e a tradução esperadas.");
  }

  return {
    sentenceEn: parsed.sentenceEn.trim(),
    sentencePt: parsed.sentencePt.trim(),
    tokensUsed: data.usage?.total_tokens ?? null,
    model,
  };
}
