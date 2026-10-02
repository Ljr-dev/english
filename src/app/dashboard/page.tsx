import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTrail, getUserStats } from "@/lib/queries";
import { AppHeader } from "@/components/app-header";
import { fluencyLabel } from "@/lib/progression";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [trail, stats] = await Promise.all([
    getTrail(session.user.id),
    getUserStats(session.user.id),
  ]);

  const xp = stats.mastered * 20 + stats.attempts * 2;

  return (
    <>
      <AppHeader
        name={session.user.name}
        image={session.user.image}
        isAdmin={session.user.role === "ADMIN"}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <section className="mb-10 grid gap-4 sm:grid-cols-4">
          <StatCard label="Fluência" value={fluencyLabel(xp)} />
          <StatCard label="Palavras dominadas" value={`${stats.mastered}/${stats.totalWords}`} />
          <StatCard label="Precisão" value={`${stats.accuracy}%`} />
          <StatCard label="Respostas" value={String(stats.attempts)} />
        </section>

        <h2 className="mb-4 text-xl font-semibold">Sua trilha</h2>

        <div className="flex flex-col gap-6">
          {trail.map((level) => (
            <section
              key={level.id}
              className={`rounded-2xl border border-border bg-card p-6 shadow-sm ${
                level.isUnlocked ? "" : "opacity-60"
              }`}
            >
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-semibold">
                    <span className="rounded-md bg-brand-soft px-2 py-0.5 text-sm font-bold text-brand">
                      {level.code}
                    </span>
                    {level.name}
                    {level.isComplete && (
                      <span className="text-sm font-normal text-success">
                        ✓ concluído
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{level.description}</p>
                </div>
                {!level.isUnlocked && (
                  <span className="rounded-lg border border-border px-3 py-1 text-xs text-muted">
                    🔒 Conclua o nível anterior
                  </span>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {level.lessons.map((lesson) => {
                  const clickable = level.isUnlocked;
                  const body = (
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 transition hover:border-brand">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{lesson.title}</p>
                        <p className="text-xs text-muted">
                          {lesson.masteredWords}/{lesson.totalWords} palavras
                          dominadas
                          {lesson.hasSentence ? " · frase pronta" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold text-brand">
                        {lesson.percent}%
                      </span>
                    </div>
                  );

                  return clickable ? (
                    <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                      {body}
                    </Link>
                  ) : (
                    <div key={lesson.id} className="cursor-not-allowed">
                      {body}
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
