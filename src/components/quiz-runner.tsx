"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { isWordMastered, type WordWithProgress } from "@/lib/progression";

type Mode = "EN_TO_PT" | "PT_TO_EN";

type Options = { enToPt: string[]; ptToEn: string[] };

type Feedback = {
  isCorrect: boolean;
  expected: string;
  chosen: string;
} | null;

export function QuizRunner({
  lessonId,
  words: initialWords,
  quizOptions,
  hasSentence,
}: {
  lessonId: string;
  words: WordWithProgress[];
  quizOptions: Record<string, Options>;
  hasSentence: boolean;
}) {
  const [words, setWords] = useState(initialWords);
  // Espelho síncrono de `words`: o avanço acontece no mesmo clique da
  // resposta, antes de o React re-renderizar com o novo masteryLevel.
  const wordsRef = useRef(initialWords);
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      initialWords.findIndex((w) => w.masteryLevel === 0),
    ),
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [submitting, setSubmitting] = useState(false);
  const [xp, setXp] = useState(0);
  const router = useRouter();

  const word = words[index];

  const masteredCount = useMemo(
    () => words.filter((w) => isWordMastered(w.masteryLevel)).length,
    [words],
  );
  const allMastered = masteredCount === words.length;

  // Ao dominar a última palavra, segue direto para a frase de consolidação
  // em vez de esperar mais um toque em "Continuar".
  // `allMastered` é derivado do estado local, então reflete o progresso
  // conquistado nesta sessão (o prop `lessonComplete` vem do render inicial
  // do servidor e fica defasado).
  const lessonDone = allMastered && hasSentence;

  useEffect(() => {
    if (!lessonDone) return;
    const timer = setTimeout(
      () => router.push(`/lesson/${lessonId}/sentence`),
      1200,
    );
    return () => clearTimeout(timer);
  }, [lessonDone, lessonId, router]);

  /**
   * Alterna entre reconhecer (EN→PT) e produzir (PT→EN) a cada acerto,
   * para a mesma palavra ser cobrada nos dois sentidos.
   */
  const mode: Mode = useMemo(() => {
    if (!word) return "EN_TO_PT";
    return (index + word.masteryLevel) % 2 === 0 ? "EN_TO_PT" : "PT_TO_EN";
  }, [word, index]);

  const options = useMemo(() => {
    if (!word) return [];
    const perWord = quizOptions[word.id];
    if (!perWord) return [];
    return mode === "PT_TO_EN" ? perWord.ptToEn : perWord.enToPt;
  }, [word, quizOptions, mode]);

  const goNext = useCallback(
    (fromIndex: number, currentWords: WordWithProgress[]) => {
      // Avança para a próxima palavra ainda não dominada (masteryLevel < alvo),
      // considerando também as que acertou uma vez mas ainda não dominou.
      const isPending = (w: WordWithProgress) => !isWordMastered(w.masteryLevel);

      const nextPending = currentWords.findIndex(
        (w, i) => i > fromIndex && isPending(w),
      );
      if (nextPending !== -1) {
        setIndex(nextPending);
        return;
      }
      const firstPending = currentWords.findIndex(isPending);
      setIndex(firstPending === -1 ? fromIndex : firstPending);
    },
    [],
  );

  const submit = useCallback(
    async (choice: string) => {
      if (!word || submitting || feedback) return;

      setSubmitting(true);
      try {
        const response = await fetch("/api/quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wordId: word.id, mode, answer: choice }),
        });

        if (!response.ok) throw new Error("Falha ao registrar resposta");
        const data = (await response.json()) as {
          isCorrect: boolean;
          expected: string;
          masteryLevel: number;
          xp: number;
        };

        setFeedback({
          isCorrect: data.isCorrect,
          expected: data.expected,
          chosen: choice,
        });
        if (data.isCorrect) setXp((prev) => prev + data.xp);

        // Guarda a lista já atualizada: o avanço precisa enxergar o novo
        // masteryLevel no mesmo clique, sem depender do estado do React.
        const updated = words.map((w) =>
          w.id === word.id ? { ...w, masteryLevel: data.masteryLevel } : w,
        );
        setWords(updated);
        wordsRef.current = updated;
      } catch {
        setFeedback({
          isCorrect: false,
          expected: "Erro de conexão",
          chosen: choice,
        });
      } finally {
        setSubmitting(false);
      }
    },
    [word, mode, submitting, feedback, words],
  );

  const advance = useCallback(() => {
    setFeedback(null);
    goNext(index, wordsRef.current);
  }, [goNext, index]);

  if (!word) {
    return <p className="text-muted">Esta lição não tem palavras.</p>;
  }

  if (allMastered && hasSentence) {
    return (
      <div className="rounded-2xl border border-success bg-success-soft p-8 text-center">
        <p className="mb-2 text-2xl font-bold text-success">
          Lição concluída! 🎉
        </p>
        <p className="mb-6 text-sm text-muted">
          Você dominou as {words.length} palavras. Indo para a frase de
          consolidação...
        </p>
        <Link
          href={`/lesson/${lessonId}/sentence`}
          className="inline-flex rounded-xl bg-brand px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          Ir para a frase agora
        </Link>
      </div>
    );
  }

  const prompt = mode === "PT_TO_EN" ? word.portuguese : word.english;
  const promptLabel =
    mode === "EN_TO_PT"
      ? "Qual é a tradução correta?"
      : "Qual é a palavra em inglês?";

  function optionClass(option: string): string {
    if (!feedback) {
      return "border-border hover:border-brand disabled:opacity-60";
    }
    if (option === feedback.expected) {
      return "border-success bg-success-soft text-success";
    }
    if (option === feedback.chosen) {
      return "border-danger bg-danger-soft text-danger";
    }
    return "border-border opacity-50";
  }

  return (
    <div className="flex flex-col gap-4">
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

      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">
          {promptLabel}
        </p>
        <p className="mb-4 text-2xl font-bold sm:mb-6 sm:text-3xl">{prompt}</p>

        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              disabled={Boolean(feedback) || submitting}
              onClick={() => void submit(option)}
              className={`rounded-xl border px-4 py-3 text-left transition ${optionClass(option)}`}
            >
              {option}
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`mt-4 rounded-xl border p-4 sm:mt-6 ${
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
              <p className="mt-2 hidden text-sm text-muted sm:block">
                Exemplo: <em>{word.exampleEn}</em> — {word.examplePt}
              </p>
            )}
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

      {/*
        Barra de ação fixa no rodapé: o botão "Continuar" fica sempre
        alcançável no celular, sem precisar rolar a tela.
      */}
      {feedback && !lessonDone && (
        <div className="sticky bottom-0 z-10 -mx-6 border-t border-border bg-card/95 px-6 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <button
            type="button"
            onClick={advance}
            className="w-full rounded-xl bg-brand px-5 py-3 font-medium text-white transition hover:opacity-90 sm:w-auto"
          >
            Continuar
          </button>
        </div>
      )}
    </div>
  );
}
