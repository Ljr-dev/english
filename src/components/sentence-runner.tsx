"use client";

import { useState } from "react";
import Link from "next/link";

export function SentenceRunner({
  lessonId,
  sentenceEn,
  options,
}: {
  lessonId: string;
  sentenceEn: string;
  options: string[];
}) {
  const [submitting, setSubmitting] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    sentencePt: string;
  } | null>(null);

  async function submit(choice: string) {
    if (submitting || result) return;
    setChosen(choice);
    setSubmitting(true);
    try {
      const response = await fetch("/api/sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, answer: choice }),
      });
      const data = (await response.json()) as {
        isCorrect: boolean;
        sentencePt: string;
        error?: string;
      };
      if (data.error) throw new Error(data.error);
      setResult({ isCorrect: data.isCorrect, sentencePt: data.sentencePt });
    } catch {
      setResult({
        isCorrect: false,
        sentencePt: "Erro ao verificar a resposta.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function optionClass(option: string): string {
    if (!result) {
      return "border-border hover:border-brand disabled:opacity-60";
    }
    if (option === result.sentencePt) {
      return "border-success bg-success-soft text-success";
    }
    if (option === chosen) {
      return "border-danger bg-danger-soft text-danger";
    }
    return "border-border opacity-50";
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <p className="mb-1 text-xs uppercase tracking-wide text-muted">
        Qual é a tradução correta da frase?
      </p>
      <p className="mb-6 text-2xl font-semibold leading-snug">{sentenceEn}</p>

      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={Boolean(result) || submitting}
            onClick={() => void submit(option)}
            className={`rounded-xl border px-4 py-3 text-left transition ${optionClass(option)}`}
          >
            {option}
          </button>
        ))}
      </div>

      {result && (
        <div
          className={`mt-6 rounded-xl border p-4 ${
            result.isCorrect
              ? "border-success bg-success-soft"
              : "border-danger bg-danger-soft"
          }`}
        >
          <p
            className={`font-semibold ${
              result.isCorrect ? "text-success" : "text-danger"
            }`}
          >
            {result.isCorrect
              ? "Excelente! Você entendeu a frase. 🎉"
              : "Quase! Compare com a tradução esperada. ❌"}
          </p>
          <p className="mt-2 text-sm">
            <span className="text-muted">Tradução correta: </span>
            <strong>{result.sentencePt}</strong>
          </p>
          <div className="mt-4 flex gap-3">
            <Link
              href="/dashboard"
              className="rounded-xl bg-brand px-5 py-2 font-medium text-white transition hover:opacity-90"
            >
              Voltar para a trilha
            </Link>
            {!result.isCorrect && (
              <button
                type="button"
                onClick={() => {
                  setResult(null);
                  setChosen(null);
                }}
                className="rounded-xl border border-border px-5 py-2 font-medium transition hover:border-brand"
              >
                Tentar de novo
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
