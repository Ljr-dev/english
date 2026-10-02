import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { AdminPanel } from "@/components/admin-panel";
import { UsersPanel } from "@/components/users-panel";
import { AdminTabs } from "@/components/admin-tabs";
import { getSentenceStats, listPendingSentences } from "@/lib/sentences";
import { isDeepSeekConfigured } from "@/lib/deepseek";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [pending, stats] = await Promise.all([
    listPendingSentences(),
    getSentenceStats(),
  ]);

  const initialData = {
    configured: isDeepSeekConfigured(),
    stats,
    pending: pending.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      level: lesson.level.code,
      levelName: lesson.level.name,
      status: lesson.sentence?.status ?? "PENDING",
      error: lesson.sentence?.error ?? null,
      words: lesson.lessonWords.map((lw) => lw.word.english),
    })),
  };

  return (
    <>
      <AppHeader name={session.user.name} image={session.user.image} isAdmin />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="mb-1 text-2xl font-bold">Painel do administrador</h1>
        <p className="mb-8 text-sm text-muted">
          Cadastre usuários e gere as frases de consolidação com a DeepSeek. Cada
          frase é salva no banco e reaproveitada por todos os usuários — a API é
          consumida apenas aqui.
        </p>

        <AdminTabs
          sentences={<AdminPanel initialData={initialData} />}
          users={<UsersPanel />}
        />
      </main>
    </>
  );
}
