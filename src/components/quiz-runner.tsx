"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { isWordMastered, type WordWithProgress } from "@/lib/progression";

type Mode = "EN_TO_PT" | "PT_TO_EN" | "MULTIPLE_CHOICE";

type Feedback = {
  isCorrect: boolean;
  expected: string;
} | null;

export function QuizRunner({
  lessonId,
  words: initialWords,
  lessonComplete,
  hasSentence,
}: {
  lessonId: string;
  words: WordWithProgress[];
  lessonComplete: boolean;
  hasSentence: boolean;
}) {
  const [words, setWords] = useState(initialWords);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      initialWords.findIndex((w) => w.masteryLevel === 0),
    ),
  );
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const [xp, setXp] = useState(0);

  const word = words[index];

  const masteredCount = useMemo(
    () => words.filter((w) => isWordMastered(w.masteryLevel)).length,
    [words],
  );
  const allMastered = masteredCount === words.length;

  /** Alterna EN→PT / PT→EN e usa múltipla escolha como reforço inicial. */
  const mode: Mode = useMemo(() => {
    if (!word) return "EN_TO_PT";
    if (word.masteryLevel === 0 && (index + word.english.length) % 3 === 0) {
      return "MULTIPLE_CHOICE";
    }
    return (index + word.masteryLevel) % 2 === 0 ? "EN_TO_PT" : "PT_TO_EN";
  }, [word, index]);

  const options = useMemo(() => {
    if (mode !== "MULTIPLE_CHOICE" || !word) return [];
    // Múltipla escolha é sempre EN→PT: pergunta em inglês, opções em português.
    const pool = words
      .filter((w) => w.id !== word.id)
      .map((w) => w.portuguese);
    const distractors = pool.slice(0, 3);
    return [...distractors, word.portuguese].sort(
      (a, b) => a.localeCompare(b, "pt-BR"),
    );
  }, [mode, word, words]);

  const goNext = useCallback(
    (fromIndex: number, currentWords: WordWithProgress[]) => {
      const nextPending = currentWords.findIndex(
        (w, i) => i > fromIndex && w.masteryLevel === 0,
      );
      if (nextPending !== -1) {
        setIndex(nextPending);
        return;
      }
      const firstPending = currentWords.findIndex((w) => w.masteryLevel === 0);
      setIndex(firstPending === -1 ? fromIndex : firstPending);
    },
    [],
  );

  const submit = useCallback(
    async (value: string) => {
      if (!word || submitting || feedback) return;
      const trimmed = value.trim();
      if (!trimmed) return;

      setSubmitting(true);
      try {
        const response = await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wordId: word.id, mode, answer: trimmed }),
        });

        if (!response.ok) throw new Error("Falha ao registrar resposta");
        const data = (await response.json()) as {
          isCorrect: boolean;
          expected: string;
          masteryLevel: number;
          xp: number;
        };

        setFeedback({ isCorrect: data.isCorrect, expected: data.expected });
        if (data.isCorrect) setXp((prev) => prev + data.xp);

        setWords((prev) =>
          prev.map((w) =>
            w.id === word.id ? { ...w, masteryLevel: data.masteryLevel } : w,
          ),
        );
      } catch {
        setFeedback({ isCorrect: false, expected: "Erro de conexão" });
      } finally {
        setSubmitting(false);
      }
    },
    [word, mode, submitting, feedback],
  );

  const advance = useCallback(() => {
    setFeedback(null);
    setAnswer("");
    goNext(index, words);
  }, [goNext, index, words]);

  if (!word) {
    return <p className="text-muted">Esta lição não tem palavras.</p>;
  }

  if (allMastered && lessonComplete && hasSentence) {
    return (
      <div className="rounded-2xl border border-success bg-success-soft p-8 text-center">
        <p className="mb-2 text-2xl font-bold text-success">
          Lição concluída! 🎉
        </p>
        <p className="mb-6 text-sm text-muted">
          Você dominou as {words.length} palavras. Agora traduza a frase que usa
          todas elas.
        </p>
        <Link
          href={`/lesson/${lessonId}/sentence`}
          className="inline-flex rounded-xl bg-brand px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          Ir para a frase
        </Link>
      </div>
    );
  }

  const prompt =
    mode === "PT_TO_EN" ? word.portuguese : word.english;
  const promptLabel =
    mode === "EN_TO_PT"
      ? "Traduza para o português"
      : mode === "PT_TO_EN"
        ? "Traduza para o inglês"
        : "Escolha a tradução correta";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="mb-2 flex items-center justify-between text-sm text-muted">
          <span>
            {masteredCount} de {words.length} palavras dominadas
          </span>
          <span>{xp > 0 ? `+${xp} XP nesta sessão` : ""}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(masteredCount / words.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">
          {promptLabel}
        </p>
        <p className="mb-6 text-3xl font-bold">{prompt}</p>

        {mode === "MULTIPLE_CHOICE" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {options.map((option) => (
              <button
                key={option}
                type="button"
                disabled={Boolean(feedback) || submitting}
                onClick={() => void submit(option)}
                className="rounded-xl border border-border px-4 py-3 text-left transition hover:border-brand disabled:opacity-60"
              >
                {option}
              </button>
            ))}
          </div>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void submit(answer);
            }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              disabled={Boolean(feedback) || submitting}
              autoFocus
              autoComplete="off"
              placeholder="Digite a tradução..."
              className="flex-1 rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-brand disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={Boolean(feedback) || submitting || !answer.trim()}
              className="rounded-xl bg-brand px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "Verificando..." : "Responder"}
            </button>
          </form>
        )}

        {feedback && (
          <div
            className={`mt-6 rounded-xl border p-4 ${
              feedback.isCorrect
                ? "border-success bg-success-soft"
                : "border-danger bg-danger-soft"
            }`}
          >
            <p
              className={`font-semibold ${
                feedback.isCorrect ? "text-success" : "text-danger"
              }`}
            >
              {feedback.isCorrect
                ? "Correto! Você evoluiu. ✅"
                : "Ainda não. Esta palavra volta a aparecer. ❌"}
            </p>
            <p className="mt-1 text-sm text-muted">
              Resposta correta: <strong>{feedback.expected}</strong>
            </p>
            {word.exampleEn && (
              <p className="mt-2 text-sm text-muted">
                Exemplo: <em>{word.exampleEn}</em> — {word.examplePt}
              </p>
            )}
            <button
              type="button"
              onClick={advance}
              className="mt-4 rounded-xl bg-brand px-5 py-2 font-medium text-white transition hover:opacity-90"
            >
              Continuar
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {words.map((w, i) => (
          <button
            key={w.id}
            type="button"
            onClick={() => {
              setFeedback(null);
              setAnswer("");
              setIndex(i);
            }}
            title={w.english}
            className={`h-2 w-8 rounded-full transition ${
              isWordMastered(w.masteryLevel)
                ? "bg-success"
                : i === index
                  ? "bg-brand"
                  : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
