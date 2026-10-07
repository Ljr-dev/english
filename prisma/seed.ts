import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { LEVELS, WORDS_PER_LESSON } from "./data/words";
import { MANUAL_SENTENCES } from "./data/sentences";
import { seedAdmin } from "./seed-admin";

const adapter = new PrismaMssql(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

function manualSentenceFor(levelCode: string, orderInLevel: number) {
  return MANUAL_SENTENCES.find(
    (sentence) =>
      sentence.levelCode === levelCode && sentence.orderInLevel === orderInLevel,
  );
}

async function main() {
  console.log("🌱 Populando níveis e palavras...\n");

  let manualCount = 0;

  console.log("👤 Administrador:");
  await seedAdmin(prisma);
  console.log("");

  for (const level of LEVELS) {
    await prisma.level.upsert({
      where: { id: level.id },
      update: {
        code: level.code,
        name: level.name,
        description: level.description,
        order: level.order,
      },
      create: {
        id: level.id,
        code: level.code,
        name: level.name,
        description: level.description,
        order: level.order,
      },
    });

    // Palavras do nível
    for (const word of level.words) {
      await prisma.word.upsert({
        where: { english: word.english },
        update: {
          portuguese: word.portuguese,
          partOfSpeech: word.partOfSpeech,
          exampleEn: word.exampleEn,
          examplePt: word.examplePt,
          levelId: level.id,
        },
        create: {
          english: word.english,
          portuguese: word.portuguese,
          partOfSpeech: word.partOfSpeech,
          exampleEn: word.exampleEn,
          examplePt: word.examplePt,
          levelId: level.id,
        },
      });
    }

    // Lições de N palavras
    const lessonCount = Math.ceil(level.words.length / WORDS_PER_LESSON);
    for (let i = 0; i < lessonCount; i++) {
      const orderInLevel = i + 1;
      const chunk = level.words.slice(
        i * WORDS_PER_LESSON,
        (i + 1) * WORDS_PER_LESSON,
      );

      const lesson = await prisma.lesson.upsert({
        where: {
          levelId_orderInLevel: { levelId: level.id, orderInLevel },
        },
        update: {
          title: `Lição ${orderInLevel} — ${level.name}`,
        },
        create: {
          levelId: level.id,
          orderInLevel,
          title: `Lição ${orderInLevel} — ${level.name}`,
        },
      });

      for (let p = 0; p < chunk.length; p++) {
        const word = await prisma.word.findUnique({
          where: { english: chunk[p].english },
          select: { id: true },
        });
        if (!word) continue;

        await prisma.lessonWord.upsert({
          where: {
            lessonId_wordId: { lessonId: lesson.id, wordId: word.id },
          },
          update: { position: p + 1 },
          create: { lessonId: lesson.id, wordId: word.id, position: p + 1 },
        });
      }

      // Garante que existe uma linha de cache (PENDING) para a lição
      await prisma.sentenceCache.upsert({
        where: { lessonId: lesson.id },
        update: {},
        create: { lessonId: lesson.id, status: "PENDING" },
      });

      // Frases escritas manualmente (prisma/data/sentences.ts).
      // Só aplica quando a lição ainda NÃO tem frase pronta, para não
      // sobrescrever o que o admin cadastrou/ajustou pelo painel.
      const manual = manualSentenceFor(level.code, orderInLevel);
      if (manual) {
        const cache = await prisma.sentenceCache.findUnique({
          where: { lessonId: lesson.id },
          select: { status: true },
        });

        if (cache?.status !== "READY" && cache?.status !== "MANUAL") {
          await prisma.sentenceCache.update({
            where: { lessonId: lesson.id },
            data: {
              sentenceEn: manual.sentenceEn,
              sentencePt: manual.sentencePt,
              expectedPt: manual.sentencePt,
              status: "MANUAL",
            },
          });

          await prisma.manualSentence.upsert({
            where: { lessonId: lesson.id },
            update: {
              sentenceEn: manual.sentenceEn,
              sentencePt: manual.sentencePt,
            },
            create: {
              lessonId: lesson.id,
              sentenceEn: manual.sentenceEn,
              sentencePt: manual.sentencePt,
            },
          });

          manualCount++;
        }
      }
    }

    console.log(
      `  ✅ ${level.code} ${level.name}: ${level.words.length} palavras, ${lessonCount} lições`,
    );
  }

  const [levels, words, lessons] = await Promise.all([
    prisma.level.count(),
    prisma.word.count(),
    prisma.lesson.count(),
  ]);

  console.log(
    `\n🎉 Concluído: ${levels} níveis, ${words} palavras, ${lessons} lições.`,
  );
  console.log(
    `📝 Frases manuais aplicadas agora: ${manualCount} (as já cadastradas foram preservadas).`,
  );
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
