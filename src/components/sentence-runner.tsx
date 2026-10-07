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
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-8">
      <p className="mb-1 text-xs uppercase tracking-wide text-muted">
        Qual é a tradução correta da frase?
      </p>
      <p className="mb-3 text-lg font-semibold leading-snug sm:mb-6 sm:text-2xl">
        {sentenceEn}
      </p>

      <div className="flex flex-col gap-2 sm:gap-3">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            disabled={Boolean(result) || submitting}
            onClick={() => void submit(option)}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm leading-snug transition sm:px-4 sm:py-3 sm:text-base ${optionClass(option)}`}
          >
            {option}
          </button>
        ))}
      </div>

      {result && (
        <div
          className={`mt-4 rounded-xl border p-4 sm:mt-6 ${
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
        </div>
      )}

      {/*
        Ações fixas no rodapé no celular: aparecem sem precisar rolar a tela.
      */}
      {result && (
        <div className="sticky bottom-0 z-10 -mx-4 mt-4 flex flex-wrap gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:mt-6 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <Link
            href="/dashboard"
            className="flex-1 rounded-xl bg-brand px-5 py-2.5 text-center font-medium text-white transition hover:opacity-90 sm:flex-none"
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
              className="flex-1 rounded-xl border border-border px-5 py-2.5 font-medium transition hover:border-brand sm:flex-none"
            >
              Tentar de novo
            </button>
          )}
        </div>
      )}
    </div>
  );
}
