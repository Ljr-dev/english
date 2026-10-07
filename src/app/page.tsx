import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const steps = [
    {
      title: "1. Quiz de múltipla escolha",
      text: "Veja a palavra em inglês (ou em português) e toque na tradução correta. Sem digitar nada.",
    },
    {
      title: "2. Só avança acertando",
      text: "Cada palavra precisa ser dominada. Enquanto você não acertar, a lição não avança.",
    },
    {
      title: "3. Frase de consolidação",
      text: "Com as 10 palavras dominadas, você escolhe a tradução da frase que usa todas elas.",
    },    {
      title: "4. Do iniciante ao fluente",
      text: "A1, A2, B1, B2, C1 e C2. Cada nível abre quando o anterior é concluído.",
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-6 py-16">
      <section className="flex flex-col items-center gap-6 text-center">
        <span className="rounded-full bg-brand-soft px-4 py-1 text-sm font-medium text-brand">
          Vocabulário essencial em inglês
        </span>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          Aprenda as palavras que você{" "}
          <span className="text-brand">ainda não sabe</span> — sem pular etapa.
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Um quiz de múltipla escolha que insiste nas palavras difíceis até você
          acertar, e que só libera a próxima lição quando o conteúdo estiver
          realmente dominado.
        </p>
        <div className="w-full max-w-sm pt-2">
          <Link
            href="/login"
            className="inline-flex w-full justify-center rounded-xl bg-brand px-6 py-3 font-medium text-white transition hover:opacity-90"
          >
            Começar agora
          </Link>
        </div>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        {steps.map((step) => (
          <div
            key={step.title}
            className="rounded-2xl border border-border bg-card p-6 shadow-sm"
          >
            <h2 className="mb-2 font-semibold">{step.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{step.text}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <h2 className="mb-2 text-xl font-semibold">
          6 níveis · 240 palavras · 24 lições
        </h2>
        <p className="mb-6 text-muted">
          Pronto para começar? Entre com seu e-mail e senha e faça a primeira
          lição agora.
        </p>
        <Link
          href="/login"
          className="inline-flex rounded-xl bg-brand px-6 py-3 font-medium text-white transition hover:opacity-90"
        >
          Entrar
        </Link>
      </section>
    </main>
  );
}
