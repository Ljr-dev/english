import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getLessonForUser } from "@/lib/queries";
import { AppHeader } from "@/components/app-header";
import { QuizRunner } from "@/components/quiz-runner";

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { lessonId } = await params;
  const lesson = await getLessonForUser(lessonId, session.user.id);
  if (!lesson) notFound();

  return (
    <>
      <AppHeader
        name={session.user.name}
        image={session.user.image}
        isAdmin={session.user.role === "ADMIN"}
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/dashboard"
          className="mb-4 inline-block text-sm text-muted transition hover:text-brand sm:mb-6"
        >
          ← Voltar para a trilha
        </Link>

        <div className="mb-4 sm:mb-6">
          <p className="text-sm font-medium text-brand">{lesson.level.code}</p>
          <h1 className="text-xl font-bold sm:text-2xl">{lesson.title}</h1>
        </div>

        <QuizRunner
          lessonId={lesson.id}
          words={lesson.words}
          quizOptions={lesson.quizOptions}
          hasSentence={["READY", "MANUAL"].includes(
            lesson.sentence?.status ?? "",
          )}
        />
      </main>
    </>
  );
}
