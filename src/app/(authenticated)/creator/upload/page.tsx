import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import UploadClient from "./upload-client";

export default async function CreatorUploadPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const where =
    user.role === "CREATOR"
      ? { creatorId: user.id }
      : user.role === "DIRECTOR"
        ? { directorId: user.id }
        : {};

  // Fetch everything in parallel: projects + revision videos with full details
  const [projects, revisionVideos] = await Promise.all([
    prisma.project.findMany({
      where:
        user.role === "DIRECTOR"
          ? { directors: { some: { userId: user.id } } }
          : { status: "ACTIVE" },
      select: { id: true, projectCode: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.video.findMany({
      where: { ...where, status: "REVISION_REQUESTED" },
      select: {
        id: true,
        videoCode: true,
        title: true,
        status: true,
        project: { select: { id: true, projectCode: true, name: true } },
        director: { select: { id: true, name: true } },
        _count: { select: { versions: true } },
        // Include detail data so selecting a video requires zero API calls
        versions: {
          orderBy: { versionNumber: "desc" as const },
          take: 1,
          select: {
            versionNumber: true,
            fileName: true,
            googleDriveUrl: true,
          },
        },
        feedbacks: {
          orderBy: { createdAt: "desc" as const },
          take: 20,
          select: {
            comment: true,
            videoTimestamp: true,
            user: { select: { name: true, role: true } },
            version: { select: { versionNumber: true } },
          },
        },
        referenceUrls: {
          orderBy: { sortOrder: "asc" as const },
          select: { url: true, platform: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  // Transform: extract latestVersion from versions array for client convenience
  const revisionData = revisionVideos.map(
    ({ versions, feedbacks, referenceUrls, ...video }) => ({
      ...video,
      detail: {
        latestVersion: versions[0] || null,
        feedbacks,
        referenceUrls,
      },
    })
  );

  return (
    <UploadClient
      initialProjects={projects}
      initialRevisionVideos={revisionData}
    />
  );
}
