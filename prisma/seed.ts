import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaMssql } from "@prisma/adapter-mssql";
import { LEVELS, WORDS_PER_LESSON } from "./data/words";
import { seedAdmin } from "./seed-admin";

const adapter = new PrismaMssql(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Populando níveis e palavras...\n");

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
}

main()
  .catch((e) => {
    console.error("❌ Erro no seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
