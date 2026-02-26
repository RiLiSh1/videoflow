import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import type { VideoStatus } from "@prisma/client";
import { ProgressClient } from "./_components/progress-client";

async function getProgressData() {
  const [videos, directors, creators] = await Promise.all([
    prisma.video.findMany({
      include: {
        project: { select: { id: true, projectCode: true, name: true } },
        creator: { select: { id: true, name: true } },
        director: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "DIRECTOR", isActive: true },
      select: {
        id: true,
        name: true,
        directedVideos: {
          select: { id: true, status: true, updatedAt: true },
        },
      },
    }),
    prisma.user.findMany({
      where: { role: "CREATOR", isActive: true },
      select: {
        id: true,
        name: true,
        createdVideos: {
          select: { id: true, status: true, updatedAt: true },
        },
      },
    }),
  ]);

  return { videos, directors, creators };
}

export default async function AdminProgressPage() {
  const { videos, directors, creators } = await getProgressData();

  // Summary
  const total = videos.length;
  const pendingReview = videos.filter((v) =>
    ["SUBMITTED", "REVISED"].includes(v.status)
  ).length;
  const inReview = videos.filter((v) =>
    ["IN_REVIEW", "REVISION_REQUESTED"].includes(v.status)
  ).length;
  const awaitingAdmin = videos.filter(
    (v) => v.status === "FINAL_REVIEW"
  ).length;
  const completed = videos.filter((v) => v.status === "COMPLETED").length;

  const summaryCards = [
    {
      label: "総動画数",
      value: total,
      iconKey: "Film",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      urgent: false,
    },
    {
      label: "レビュー待ち",
      value: pendingReview,
      iconKey: "Clock",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
      urgent: pendingReview > 0,
    },
    {
      label: "レビュー中",
      value: inReview,
      iconKey: "AlertTriangle",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      urgent: false,
    },
    {
      label: "最終確認待ち",
      value: awaitingAdmin,
      iconKey: "UserCheck",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      urgent: awaitingAdmin > 0,
    },
    {
      label: "完了",
      value: completed,
      iconKey: "CheckCircle2",
      color: "text-green-600",
      bgColor: "bg-green-50",
      urgent: false,
    },
  ];

  // Director stats
  const directorStats = directors.map((d) => {
    const vids = d.directedVideos;
    const latestUpdate =
      vids.length > 0
        ? vids.reduce((latest, v) =>
            v.updatedAt > latest.updatedAt ? v : latest
          ).updatedAt
        : null;
    return {
      id: d.id,
      name: d.name,
      totalAssigned: vids.length,
      waitingReview: vids.filter((v) =>
        ["SUBMITTED", "REVISED"].includes(v.status)
      ).length,
      reviewing: vids.filter((v) => v.status === "IN_REVIEW").length,
      done: vids.filter((v) =>
        ["COMPLETED", "FINAL_REVIEW", "APPROVED"].includes(v.status)
      ).length,
      revisionRequested: vids.filter(
        (v) => v.status === "REVISION_REQUESTED"
      ).length,
      latestUpdate: latestUpdate ? latestUpdate.toISOString() : null,
    };
  });

  // Creator stats
  const creatorStats = creators.map((c) => {
    const vids = c.createdVideos;
    const latestUpdate =
      vids.length > 0
        ? vids.reduce((latest, v) =>
            v.updatedAt > latest.updatedAt ? v : latest
          ).updatedAt
        : null;
    return {
      id: c.id,
      name: c.name,
      totalVideos: vids.length,
      draft: vids.filter((v) => v.status === "DRAFT").length,
      submitted: vids.filter((v) => v.status === "SUBMITTED").length,
      inProgress: vids.filter((v) =>
        ["IN_REVIEW", "REVISION_REQUESTED", "REVISED"].includes(v.status)
      ).length,
      completed: vids.filter((v) =>
        ["COMPLETED", "FINAL_REVIEW", "APPROVED"].includes(v.status)
      ).length,
      latestUpdate: latestUpdate ? latestUpdate.toISOString() : null,
    };
  });

  // Serialize videos for client
  const videoRows = videos.map((v) => ({
    id: v.id,
    videoCode: v.videoCode,
    title: v.title,
    status: v.status,
    updatedAt: v.updatedAt.toISOString(),
    projectName: v.project.name,
    projectCode: v.project.projectCode,
    creatorName: v.creator.name,
    directorName: v.director?.name || null,
  }));

  // Project stats
  const projectMap = new Map<
    string,
    {
      id: string;
      code: string;
      name: string;
      totalVideos: number;
      statusCounts: Partial<Record<VideoStatus, number>>;
    }
  >();
  for (const video of videos) {
    const key = video.project.id;
    if (!projectMap.has(key)) {
      projectMap.set(key, {
        id: video.project.id,
        code: video.project.projectCode,
        name: video.project.name,
        totalVideos: 0,
        statusCounts: {},
      });
    }
    const entry = projectMap.get(key)!;
    entry.totalVideos++;
    entry.statusCounts[video.status] =
      (entry.statusCounts[video.status] || 0) + 1;
  }

  const projects = Array.from(projectMap.values())
    .sort((a, b) => a.code.localeCompare(b.code))
    .map((p) => {
      const completedVideos =
        (p.statusCounts["COMPLETED"] || 0) +
        (p.statusCounts["FINAL_REVIEW"] || 0);
      const pct =
        p.totalVideos > 0
          ? Math.round((completedVideos / p.totalVideos) * 100)
          : 0;
      return {
        id: p.id,
        code: p.code,
        name: p.name,
        totalVideos: p.totalVideos,
        completedVideos,
        pct,
        statusCounts: p.statusCounts,
      };
    });

  return (
    <PageContainer title="進捗管理">
      <ProgressClient
        summaryCards={summaryCards}
        directorStats={directorStats}
        creatorStats={creatorStats}
        videos={videoRows}
        projects={projects}
      />
    </PageContainer>
  );
}
