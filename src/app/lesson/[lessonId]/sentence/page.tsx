import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLessonForUser } from "@/lib/queries";
import { AppHeader } from "@/components/app-header";
import { SentenceRunner } from "@/components/sentence-runner";

export default async function SentencePage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { lessonId } = await params;
  const lesson = await getLessonForUser(lessonId, session.user.id);
  if (!lesson) notFound();

  const sentence = lesson.sentence;

  return (
    <>
      <AppHeader
        name={session.user.name}
        image={session.user.image}
        isAdmin={session.user.role === "ADMIN"}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href={`/lesson/${lesson.id}`}
          className="mb-4 inline-block text-sm text-muted transition hover:text-brand sm:mb-6"
        >
          ← Voltar para a lição
        </Link>

        <div className="mb-4 sm:mb-6">
          <p className="text-sm font-medium text-brand">{lesson.level.code}</p>
          <h1 className="text-xl font-bold sm:text-2xl">
            Frase de consolidação
          </h1>
          <p className="mt-1 text-sm text-muted">
            Esta frase usa as {lesson.words.length} palavras que você acabou de
            dominar.
          </p>
        </div>

        {["READY", "MANUAL"].includes(sentence?.status ?? "") &&
        sentence?.sentenceEn ? (
          <SentenceRunner
            lessonId={lesson.id}
            sentenceEn={sentence.sentenceEn}
            options={lesson.sentenceOptions}
          />
        ) : (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
            <p className="mb-2 text-lg font-semibold">
              Frase ainda não disponível
            </p>
            <p className="text-sm text-muted">
              A frase desta lição ainda não foi cadastrada. Ela aparecerá
              automaticamente assim que estiver pronta — seu progresso está
              salvo.
            </p>
            <Link
              href="/dashboard"
              className="mt-6 inline-flex rounded-xl border border-border px-5 py-2 font-medium transition hover:border-brand"
            >
              Voltar para a trilha
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
