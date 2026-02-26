import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { ProjectsClient } from "./_components/projects-client";

async function getProjects() {
  const projects = await prisma.project.findMany({
    include: {
      creator: { select: { id: true, name: true } },
      directors: {
        include: { user: { select: { id: true, name: true } } },
      },
      _count: { select: { videos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return projects.map((p) => ({
    ...p,
    deadline: p.deadline ? p.deadline.toISOString() : null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));
}

async function getDirectors() {
  const directors = await prisma.user.findMany({
    where: { role: { in: ["DIRECTOR", "ADMIN"] }, isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
  return directors;
}

export default async function AdminProjectsPage() {
  const [projects, directors] = await Promise.all([
    getProjects(),
    getDirectors(),
  ]);

  return (
    <PageContainer title="案件管理">
      <ProjectsClient projects={projects} availableDirectors={directors} />
    </PageContainer>
  );
}
