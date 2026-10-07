"use client";

import { useCallback, useMemo, useState } from "react";

export type AdminLesson = {
  id: string;
  title: string;
  level: string;
  levelName: string;
  orderInLevel: number;
  status: string;
  sentenceEn: string | null;
  sentencePt: string | null;
  updatedAt: string | null;
  words: string[];
};

export type AdminStats = {
  ready: number;
  pending: number;
  manual: number;
  total: number;
};

export type AdminData = {
  stats: AdminStats;
  lessons: AdminLesson[];
};

type Draft = { sentenceEn: string; sentencePt: string };

const STATUS_LABEL: Record<string, string> = {
  READY: "pronta",
  MANUAL: "manual",
  PENDING: "pendente",
};

export function AdminPanel({ initialData }: { initialData: AdminData }) {
  const [data, setData] = useState<AdminData>(initialData);
  const [filter, setFilter] = useState<"all" | "pending">("pending");
  const [openId, setOpenId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>({ sentenceEn: "", sentencePt: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const response = await fetch("/api/admin/sentences");
    if (response.ok) setData((await response.json()) as AdminData);
  }, []);

  const lessons = useMemo(
    () =>
      filter === "pending"
        ? data.lessons.filter((lesson) => lesson.status === "PENDING")
        : data.lessons,
    [data.lessons, filter],
  );

  function openEditor(lesson: AdminLesson) {
    setOpenId(lesson.id);
    setDraft({
      sentenceEn: lesson.sentenceEn ?? "",
      sentencePt: lesson.sentencePt ?? "",
    });
    setMessage(null);
  }

  async function save(lesson: AdminLesson) {
    if (busy) return;
    if (!draft.sentenceEn.trim() || !draft.sentencePt.trim()) {
      setMessage("Preencha a frase em inglês e a tradução.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/admin/sentences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id, ...draft }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Erro ao salvar");

      setMessage(`Frase de "${lesson.title}" salva.`);
      setOpenId(null);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  async function clear(lesson: AdminLesson) {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/sentences", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lessonId: lesson.id }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Erro ao remover");

      setMessage(`Frase de "${lesson.title}" removida.`);
      setOpenId(null);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro ao remover.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Frases prontas" value={data.stats.ready} />
        <Stat label="Cadastradas à mão" value={data.stats.manual} />
        <Stat label="Pendentes" value={data.stats.pending} />
        <Stat label="Total de lições" value={data.stats.total} />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <FilterButton
            active={filter === "pending"}
            onClick={() => setFilter("pending")}
          >
            Pendentes ({data.stats.pending})
          </FilterButton>
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
          >
            Todas ({data.stats.total})
          </FilterButton>
        </div>
        {message && <span className="text-sm text-muted">{message}</span>}
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-brand-soft text-xs uppercase tracking-wide text-brand">
            <tr>
              <th className="px-4 py-3">Lição</th>
              <th className="px-4 py-3">Nível</th>
              <th className="px-4 py-3">Palavras</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"> </th>
            </tr>
          </thead>
          <tbody>
            {lessons.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  {filter === "pending"
                    ? "Todas as lições já têm frase cadastrada. 🎉"
                    : "Nenhuma lição encontrada."}
                </td>
              </tr>
            )}

            {lessons.map((lesson) => (
              <tr key={lesson.id} className="border-t border-border align-top">
                <td className="px-4 py-3 font-medium">{lesson.title}</td>
                <td className="px-4 py-3 text-muted">
                  {lesson.level} — {lesson.levelName}
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {lesson.words.join(", ")}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={lesson.status} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() =>
                      openId === lesson.id ? setOpenId(null) : openEditor(lesson)
                    }
                    className="rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-brand"
                  >
                    {openId === lesson.id
                      ? "Fechar"
                      : lesson.sentenceEn
                        ? "Editar frase"
                        : "Cadastrar frase"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {openId &&
        (() => {
          const lesson = data.lessons.find((item) => item.id === openId);
          if (!lesson) return null;

          return (
            <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-1 text-lg font-semibold">
                {lesson.title}{" "}
                <span className="text-sm font-normal text-muted">
                  ({lesson.level} — {lesson.levelName})
                </span>
              </h2>
              <p className="mb-4 text-sm text-muted">
                A frase deve usar todas as {lesson.words.length} palavras:{" "}
                <em>{lesson.words.join(", ")}</em>
              </p>

              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">
                Frase em inglês
              </label>
              <textarea
                value={draft.sentenceEn}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    sentenceEn: event.target.value,
                  }))
                }
                rows={3}
                disabled={busy}
                className="mb-4 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-brand disabled:opacity-60"
              />

              <label className="mb-1 block text-xs uppercase tracking-wide text-muted">
                Tradução esperada (português)
              </label>
              <textarea
                value={draft.sentencePt}
                onChange={(event) =>
                  setDraft((prev) => ({
                    ...prev,
                    sentencePt: event.target.value,
                  }))
                }
                rows={3}
                disabled={busy}
                className="mb-4 w-full rounded-xl border border-border bg-background px-4 py-3 outline-none transition focus:border-brand disabled:opacity-60"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save(lesson)}
                  className="rounded-xl bg-brand px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                >
                  {busy ? "Salvando..." : "Salvar frase"}
                </button>
                {lesson.sentenceEn && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void clear(lesson)}
                    className="rounded-xl border border-danger px-5 py-2.5 font-medium text-danger transition hover:bg-danger-soft disabled:opacity-50"
                  >
                    Remover frase
                  </button>
                )}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpenId(null)}
                  className="rounded-xl border border-border px-5 py-2.5 font-medium transition hover:border-brand disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </section>
          );
        })()}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const classes =
    status === "PENDING"
      ? "bg-danger-soft text-danger"
      : "bg-brand-soft text-brand";

  return (
    <span className={`rounded-md px-2 py-0.5 text-xs ${classes}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm transition ${
        active
          ? "border-brand text-brand"
          : "border-border text-muted hover:border-brand"
      }`}
    >
      {children}
    </button>
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
