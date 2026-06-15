import { prisma } from '@ecommerce-hr/db';
import { askMentor } from '@ecommerce-hr/ai';

export async function getModules(page: number, limit: number, publishedOnly = true) {
  const skip = (page - 1) * limit;
  const where = publishedOnly ? { isPublished: true } : {};

  const [modules, total] = await Promise.all([
    prisma.academyModule.findMany({
      where,
      skip,
      take: limit,
      orderBy: { order: 'asc' },
    }),
    prisma.academyModule.count({ where }),
  ]);

  return { modules, total };
}

export async function getModuleById(id: string) {
  return prisma.academyModule.findUnique({
    where: { id },
    include: { exams: true },
  });
}

export async function getModuleBySlug(slug: string) {
  return prisma.academyModule.findUnique({
    where: { slug },
    include: { exams: true },
  });
}

export async function enrollMember(memberId: string, moduleId: string) {
  return prisma.academyEnrollment.upsert({
    where: { memberId_moduleId: { memberId, moduleId } },
    create: { memberId, moduleId, progress: 0 },
    update: {},
    include: { module: true },
  });
}

export async function updateProgress(memberId: string, moduleId: string, progress: number) {
  const data: Record<string, unknown> = { progress };
  if (progress === 100) {
    data.completedAt = new Date();
  }

  return prisma.academyEnrollment.update({
    where: { memberId_moduleId: { memberId, moduleId } },
    data,
    include: { module: true },
  });
}

export async function getEnrollments(memberId: string) {
  return prisma.academyEnrollment.findMany({
    where: { memberId },
    include: { module: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getExamById(examId: string) {
  return prisma.academyExam.findUnique({
    where: { id: examId },
    include: { module: true },
  });
}

export async function submitExam(
  memberId: string,
  examId: string,
  answers: Record<string, string | number | boolean>,
) {
  const exam = await prisma.academyExam.findUnique({ where: { id: examId } });
  if (!exam) throw new Error('Exam not found');

  const questions = exam.questions as { id: string; correctAnswer: string | number | boolean }[];
  let correct = 0;
  for (const q of questions) {
    if (answers[q.id] !== undefined && String(answers[q.id]) === String(q.correctAnswer)) {
      correct++;
    }
  }
  const score = Math.round((correct / questions.length) * 100);
  const passed = score >= exam.passingScore;

  if (passed) {
    const certificate = await prisma.academyCertificate.create({
      data: {
        examId,
        memberId,
        score,
        certificateUrl: `/certificates/${examId}-${memberId}`,
      },
      include: { exam: { include: { module: true } } },
    });
    return { score, passed, certificate };
  }

  return { score, passed, certificate: null };
}

export async function getCertificates(memberId: string) {
  return prisma.academyCertificate.findMany({
    where: { memberId },
    include: { exam: { include: { module: true } } },
    orderBy: { issuedAt: 'desc' },
  });
}

export async function mentorChat(
  question: string,
  moduleId?: string,
) {
  let moduleContext: { title: string; description: string; content?: unknown } | undefined;

  if (moduleId) {
    const mod = await prisma.academyModule.findUnique({ where: { id: moduleId } });
    if (mod) {
      moduleContext = { title: mod.title, description: mod.description, content: mod.content };
    }
  }

  return askMentor(question, moduleContext);
}
