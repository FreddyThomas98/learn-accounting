import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedDatabase(client: PrismaClient = prisma) {
  const course = await client.course.upsert({
    where: { slug: 'financial-accounting' },
    update: {
      title: 'Financial Accounting',
      description:
        'Foundational undergraduate Financial Accounting course for First-Year B.Com students, using Indian Rupee business transactions and the Traditional Approach.',
      level: 'First-Year B.Com (Beginner)',
    },
    create: {
      slug: 'financial-accounting',
      title: 'Financial Accounting',
      description:
        'Foundational undergraduate Financial Accounting course for First-Year B.Com students, using Indian Rupee business transactions and the Traditional Approach.',
      level: 'First-Year B.Com (Beginner)',
    },
  });

  const chapter = await client.chapter.upsert({
    where: { slug: 'journal-entries' },
    update: {
      courseId: course.id,
      title: 'Chapter 1: Journal Entries',
      description:
        'Master the Book of Original Entry, Personal/Real/Nominal accounts, the Three Golden Rules, the Modern Accounting Equation, worked examples, 5 graded exercises, and a 10-question assessment.',
      displayOrder: 1,
    },
    create: {
      courseId: course.id,
      slug: 'journal-entries',
      title: 'Chapter 1: Journal Entries',
      description:
        'Master the Book of Original Entry, Personal/Real/Nominal accounts, the Three Golden Rules, the Modern Accounting Equation, worked examples, 5 graded exercises, and a 10-question assessment.',
      displayOrder: 1,
    },
  });

  // Development-only demo student (NEVER seeded in production)
  const isProduction = process.env.NODE_ENV === 'production';
  const shouldSeedDemo = process.env.SEED_DEMO_USER === 'true';

  let demoCreated = false;
  if (!isProduction && shouldSeedDemo) {
    const demoEmail = 'student.demo@learnaccounting.local';
    const passwordHash = await bcrypt.hash('BComStudent@2026', 12);

    await client.user.upsert({
      where: { email: demoEmail },
      update: {},
      create: {
        name: 'Aarav Sharma (Demo Student)',
        email: demoEmail,
        passwordHash,
        role: UserRole.STUDENT,
      },
    });
    demoCreated = true;
  }

  return { course, chapter, demoCreated };
}

if (require.main === module) {
  seedDatabase()
    .then(({ course, chapter, demoCreated }) => {
      console.log(`Seeded course: ${course.title} (${course.slug})`);
      console.log(`Seeded chapter: ${chapter.title} (${chapter.slug})`);
      if (demoCreated) {
        console.log('Seeded development demo account: student.demo@learnaccounting.local');
      } else {
        console.log('Skipped demo account (only seeded when NODE_ENV != production and SEED_DEMO_USER=true).');
      }
    })
    .catch((err) => {
      console.error('Database seed failed:', err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
