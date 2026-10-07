import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppHeader } from "@/components/app-header";
import { AdminPanel } from "@/components/admin-panel";
import { UsersPanel } from "@/components/users-panel";
import { AdminTabs } from "@/components/admin-tabs";
import { getSentenceStats, listSentencesForAdmin } from "@/lib/sentences";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const [lessons, stats] = await Promise.all([
    listSentencesForAdmin(),
    getSentenceStats(),
  ]);

  const initialData = {
    stats,
    lessons: lessons.map((lesson) => ({
      id: lesson.id,
      title: lesson.title,
      level: lesson.level.code,
      levelName: lesson.level.name,
      orderInLevel: lesson.orderInLevel,
      status: lesson.sentence?.status ?? "PENDING",
      sentenceEn: lesson.sentence?.sentenceEn ?? null,
      sentencePt: lesson.sentence?.sentencePt ?? null,
      updatedAt: lesson.sentence?.updatedAt?.toISOString() ?? null,
      words: lesson.lessonWords.map((lw) => lw.word.english),
    })),
  };

  return (
    <>
      <AppHeader name={session.user.name} image={session.user.image} isAdmin />

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="mb-1 text-2xl font-bold">Painel do administrador</h1>
        <p className="mb-8 text-sm text-muted">
          Cadastre usuários e escreva as frases de consolidação de cada lição.
          Cada frase é salva no banco e reaproveitada por todos os usuários —
          nenhuma API de IA é consumida.
        </p>

        <AdminTabs
          sentences={<AdminPanel initialData={initialData} />}
          users={<UsersPanel />}
        />
      </main>
    </>
  );
}
