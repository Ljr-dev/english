"use client";

import { useCallback, useState } from "react";

type PendingLesson = {
  id: string;
  title: string;
  level: string;
  levelName: string;
  status: string;
  error: string | null;
  words: string[];
};

export type AdminData = {
  configured: boolean;
  stats: { ready: number; pending: number; failed: number; totalTokens: number };
  pending: PendingLesson[];
};

export function AdminPanel({ initialData }: { initialData: AdminData }) {
  const [data, setData] = useState<AdminData>(initialData);
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/generate");
    if (response.ok) setData((await response.json()) as AdminData);
  }, []);

  async function generate() {
    if (selected.length === 0 || busy) return;
    setBusy(true);
    setMessage("Gerando frases com a DeepSeek...");

    try {
      const response = await fetch("/api/admin/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonIds: selected }),
      });
      const result = (await response.json()) as {
        generated?: number;
        failed?: number;
        error?: string;
      };

      setMessage(
        result.error ??
          `Concluído: ${result.generated} geradas, ${result.failed} falharam.`,
      );
      setSelected([]);
      await reload();
    } catch {
      setMessage("Erro ao gerar as frases.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Frases prontas" value={data.stats.ready} />
        <Stat label="Pendentes" value={data.stats.pending} />
        <Stat label="Falharam" value={data.stats.failed} />
        <Stat label="Tokens usados" value={data.stats.totalTokens} />
      </section>

      {!data.configured && (
        <div className="rounded-xl border border-danger bg-danger-soft p-4 text-sm">
          <strong className="text-danger">DEEPSEEK_API_KEY não configurada.</strong>{" "}
          Defina a variável de ambiente no servidor para poder gerar frases.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={busy || selected.length === 0 || !data.configured}
          onClick={() => void generate()}
          className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {busy
            ? "Gerando..."
            : `Gerar ${selected.length} frase(s) selecionada(s)`}
        </button>
        <button
          type="button"
          disabled={busy || data.pending.length === 0}
          onClick={() =>
            setSelected(data.pending.slice(0, 10).map((lesson) => lesson.id))
          }
          className="rounded-xl border border-border px-5 py-2.5 font-medium transition hover:border-brand disabled:opacity-50"
        >
          Selecionar 10 primeiras
        </button>
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-soft text-xs uppercase tracking-wide text-brand">
            <tr>
              <th className="px-4 py-3"> </th>
              <th className="px-4 py-3">Lição</th>
              <th className="px-4 py-3">Nível</th>
              <th className="px-4 py-3">Palavras</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {data.pending.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  Todas as lições já têm frase gerada. 🎉
                </td>
              </tr>
            )}
            {data.pending.map((lesson) => (
              <tr key={lesson.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(lesson.id)}
                    onChange={(event) =>
                      setSelected((prev) =>
                        event.target.checked
                          ? [...prev, lesson.id]
                          : prev.filter((id) => id !== lesson.id),
                      )
                    }
                  />
                </td>
                <td className="px-4 py-3 font-medium">{lesson.title}</td>
                <td className="px-4 py-3 text-muted">
                  {lesson.level} — {lesson.levelName}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {lesson.words.join(", ")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs ${
                      lesson.status === "FAILED"
                        ? "bg-danger-soft text-danger"
                        : "bg-brand-soft text-brand"
                    }`}
                  >
                    {lesson.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
