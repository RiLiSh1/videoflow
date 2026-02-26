import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import UploadClient from "./upload-client";

export default async function CreatorUploadPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  // Fetch projects + revision videos in parallel, server-side (no API round-trip)
  const where =
    user.role === "CREATOR"
      ? { creatorId: user.id }
      : user.role === "DIRECTOR"
        ? { directorId: user.id }
        : {};

  const [projects, revisionVideos] = await Promise.all([
    prisma.project.findMany({
      where:
        user.role === "CREATOR"
          ? { videos: { some: { creatorId: user.id } } }
          : user.role === "DIRECTOR"
            ? { directors: { some: { userId: user.id } } }
            : {},
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
      },
      orderBy: { updatedAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <UploadClient
      initialProjects={projects}
      initialRevisionVideos={revisionVideos}
    />
  );
}
