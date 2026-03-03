import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { PageContainer } from "@/components/layout/page-container";
import type { VideoStatus } from "@prisma/client";
import { ProgressClient } from "./_components/progress-client";

const getProgressData = unstable_cache(
  async () => {
    // Single query: fetch all videos with minimal relations
    const videos = await prisma.video.findMany({
      select: {
        id: true,
        videoCode: true,
        title: true,
        status: true,
        updatedAt: true,
        project: { select: { id: true, projectCode: true, name: true } },
        creator: { select: { id: true, name: true } },
        director: { select: { id: true, name: true } },
        versions: {
          where: { versionNumber: 1 },
          select: { createdAt: true },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    // Summary counts — single pass
    let pendingReview = 0;
    let inReview = 0;
    let awaitingAdmin = 0;
    let completed = 0;

    // Maps for director/creator/project stats — built in single pass
    const directorMap = new Map<
      string,
      {
        name: string;
        total: number;
        waiting: number;
        reviewing: number;
        done: number;
        revision: number;
        latest: Date | null;
      }
    >();
    const creatorMap = new Map<
      string,
      {
        name: string;
        total: number;
        draft: number;
        submitted: number;
        inProgress: number;
        completed: number;
        latest: Date | null;
      }
    >();
    const projectMap = new Map<
      string,
      {
        code: string;
        name: string;
        total: number;
        statusCounts: Partial<Record<VideoStatus, number>>;
      }
    >();

    const videoRows: {
      id: string;
      videoCode: string;
      title: string;
      status: VideoStatus;
      updatedAt: string;
      projectName: string;
      projectCode: string;
      creatorName: string;
      directorName: string | null;
      firstUploadDate: string | null;
    }[] = [];

    for (const v of videos) {
      const s = v.status;

      // Summary
      if (s === "SUBMITTED" || s === "REVISED") pendingReview++;
      else if (s === "IN_REVIEW" || s === "REVISION_REQUESTED") inReview++;
      else if (s === "FINAL_REVIEW") awaitingAdmin++;
      else if (s === "COMPLETED") completed++;

      // Director stats
      if (v.director) {
        let ds = directorMap.get(v.director.id);
        if (!ds) {
          ds = {
            name: v.director.name,
            total: 0,
            waiting: 0,
            reviewing: 0,
            done: 0,
            revision: 0,
            latest: null,
          };
          directorMap.set(v.director.id, ds);
        }
        ds.total++;
        if (s === "SUBMITTED" || s === "REVISED") ds.waiting++;
        else if (s === "IN_REVIEW") ds.reviewing++;
        else if (s === "COMPLETED" || s === "FINAL_REVIEW" || s === "APPROVED")
          ds.done++;
        else if (s === "REVISION_REQUESTED") ds.revision++;
        if (!ds.latest || v.updatedAt > ds.latest) ds.latest = v.updatedAt;
      }

      // Creator stats
      {
        let cs = creatorMap.get(v.creator.id);
        if (!cs) {
          cs = {
            name: v.creator.name,
            total: 0,
            draft: 0,
            submitted: 0,
            inProgress: 0,
            completed: 0,
            latest: null,
          };
          creatorMap.set(v.creator.id, cs);
        }
        cs.total++;
        if (s === "DRAFT") cs.draft++;
        else if (s === "SUBMITTED") cs.submitted++;
        else if (
          s === "IN_REVIEW" ||
          s === "REVISION_REQUESTED" ||
          s === "REVISED"
        )
          cs.inProgress++;
        else if (s === "COMPLETED" || s === "FINAL_REVIEW" || s === "APPROVED")
          cs.completed++;
        if (!cs.latest || v.updatedAt > cs.latest) cs.latest = v.updatedAt;
      }

      // Project stats
      {
        let ps = projectMap.get(v.project.id);
        if (!ps) {
          ps = {
            code: v.project.projectCode,
            name: v.project.name,
            total: 0,
            statusCounts: {},
          };
          projectMap.set(v.project.id, ps);
        }
        ps.total++;
        ps.statusCounts[s] = (ps.statusCounts[s] || 0) + 1;
      }

      // Serialized video row
      videoRows.push({
        id: v.id,
        videoCode: v.videoCode,
        title: v.title,
        status: s,
        updatedAt: v.updatedAt.toISOString(),
        projectName: v.project.name,
        projectCode: v.project.projectCode,
        creatorName: v.creator.name,
        directorName: v.director?.name || null,
      });
    }

    const total = videos.length;

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

    const directorStats = Array.from(directorMap.entries()).map(
      ([id, d]) => ({
        id,
        name: d.name,
        totalAssigned: d.total,
        waitingReview: d.waiting,
        reviewing: d.reviewing,
        done: d.done,
        revisionRequested: d.revision,
        latestUpdate: d.latest ? d.latest.toISOString() : null,
      })
    );

    const creatorStats = Array.from(creatorMap.entries()).map(([id, c]) => ({
      id,
      name: c.name,
      totalVideos: c.total,
      draft: c.draft,
      submitted: c.submitted,
      inProgress: c.inProgress,
      completed: c.completed,
      latestUpdate: c.latest ? c.latest.toISOString() : null,
    }));

    const projects = Array.from(projectMap.entries())
      .map(([id, p]) => {
        const completedVideos =
          (p.statusCounts["COMPLETED"] || 0) +
          (p.statusCounts["FINAL_REVIEW"] || 0);
        const pct =
          p.total > 0
            ? Math.round((completedVideos / p.total) * 100)
            : 0;
        return {
          id,
          code: p.code,
          name: p.name,
          totalVideos: p.total,
          completedVideos,
          pct,
          statusCounts: p.statusCounts,
        };
      })
      .sort((a, b) => a.code.localeCompare(b.code));

    return {
      summaryCards,
      directorStats,
      creatorStats,
      videoRows,
      projects,
    };
  },
  ["admin-progress"],
  { revalidate: 30 }
);

export default async function AdminProgressPage() {
  const { summaryCards, directorStats, creatorStats, videoRows, projects } =
    await getProgressData();

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
