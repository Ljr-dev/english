"use client";

import { useState } from "react";
import Link from "next/link";

export function SentenceRunner({
  lessonId,
  sentenceEn,
}: {
  lessonId: string;
  sentenceEn: string;
}) {
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    isCorrect: boolean;
    sentencePt: string;
  } | null>(null);

  async function submit() {
    if (!answer.trim() || submitting || result) return;
    setSubmitting(true);
    try {
      const response = await fetch("/api/sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId, answer: answer.trim() }),
      });
      const data = (await response.json()) as {
        isCorrect: boolean;
        sentencePt: string;
        error?: string;
      };
      if (data.error) throw new Error(data.error);
      setResult({ isCorrect: data.isCorrect, sentencePt: data.sentencePt });
    } catch {
      setResult({ isCorrect: false, sentencePt: "Erro ao verificar a resposta." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <p className="mb-1 text-xs uppercase tracking-wide text-muted">
        Traduza a frase para o português
      </p>
      <p className="mb-6 text-2xl font-semibold leading-snug">{sentenceEn}</p>

      <textarea
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        disabled={Boolean(result) || submitting}
        rows={3}
        placeholder="Escreva a tradução da frase..."
        className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-brand disabled:opacity-60"
      />

      <button
        type="button"
        onClick={() => void submit()}
        disabled={Boolean(result) || submitting || !answer.trim()}
        className="mt-4 rounded-xl bg-brand px-6 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {submitting ? "Verificando..." : "Verificar tradução"}
      </button>

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
            <span className="text-muted">Tradução esperada: </span>
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
                  setAnswer("");
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
