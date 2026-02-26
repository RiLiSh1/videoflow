import { PrismaClient, Role, VideoStatus, ProjectStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.notification.deleteMany();
  await prisma.feedback.deleteMany();
  await prisma.version.deleteMany();
  await prisma.referenceUrl.deleteMany();
  await prisma.video.deleteMany();
  await prisma.projectDirector.deleteMany();
  await prisma.project.deleteMany();
  await prisma.googleDriveSetting.deleteMany();
  await prisma.user.deleteMany();

  // ============================================================
  // Users
  // ============================================================
  const admin = await prisma.user.create({
    data: {
      loginId: "admin",
      passwordHash: await hashPassword("admin123"),
      name: "管理者太郎",
      email: "admin@example.com",
      role: Role.ADMIN,
      isActive: true,
    },
  });

  const director1 = await prisma.user.create({
    data: {
      loginId: "director1",
      passwordHash: await hashPassword("director123"),
      name: "佐藤ディレクター",
      email: "director1@example.com",
      role: Role.DIRECTOR,
      chatworkId: "director1_cw",
      isActive: true,
    },
  });

  const director2 = await prisma.user.create({
    data: {
      loginId: "director2",
      passwordHash: await hashPassword("director123"),
      name: "鈴木ディレクター",
      email: "director2@example.com",
      role: Role.DIRECTOR,
      chatworkId: "director2_cw",
      isActive: true,
    },
  });

  const creator1 = await prisma.user.create({
    data: {
      loginId: "creator1",
      passwordHash: await hashPassword("creator123"),
      name: "田中クリエイター",
      email: "creator1@example.com",
      role: Role.CREATOR,
      chatworkId: "creator1_cw",
      isActive: true,
    },
  });

  const creator2 = await prisma.user.create({
    data: {
      loginId: "creator2",
      passwordHash: await hashPassword("creator123"),
      name: "山田クリエイター",
      email: "creator2@example.com",
      role: Role.CREATOR,
      isActive: true,
    },
  });

  const creator3 = await prisma.user.create({
    data: {
      loginId: "creator3",
      passwordHash: await hashPassword("creator123"),
      name: "伊藤クリエイター",
      email: "creator3@example.com",
      role: Role.CREATOR,
      isActive: true,
    },
  });

  console.log("Users created");

  // ============================================================
  // Project
  // ============================================================
  const project = await prisma.project.create({
    data: {
      projectCode: "PRJ-001",
      name: "サンプル動画案件",
      description: "テスト用のサンプル案件です。全ステータスの動画が含まれています。",
      deadline: new Date("2026-03-31"),
      status: ProjectStatus.ACTIVE,
      createdBy: admin.id,
    },
  });

  // Assign directors to project
  await prisma.projectDirector.createMany({
    data: [
      { projectId: project.id, userId: director1.id },
      { projectId: project.id, userId: director2.id },
    ],
  });

  console.log("Project created");

  // ============================================================
  // Videos (one per status)
  // ============================================================
  const statuses: VideoStatus[] = [
    "DRAFT",
    "SUBMITTED",
    "IN_REVIEW",
    "REVISION_REQUESTED",
    "REVISED",
    "APPROVED",
    "FINAL_REVIEW",
    "COMPLETED",
  ];

  const creators = [creator1, creator2, creator3];
  const directors = [director1, director2];

  const videos = [];
  for (let i = 0; i < statuses.length; i++) {
    const video = await prisma.video.create({
      data: {
        videoCode: `VID-${String(i + 1).padStart(3, "0")}`,
        projectId: project.id,
        title: `サンプル動画 ${i + 1} (${statuses[i]})`,
        creatorId: creators[i % creators.length].id,
        directorId: directors[i % directors.length].id,
        status: statuses[i],
        deadline: new Date("2026-03-15"),
      },
    });
    videos.push(video);
  }

  console.log("Videos created");

  // ============================================================
  // Reference URLs (for first 3 videos)
  // ============================================================
  for (let i = 0; i < 3; i++) {
    await prisma.referenceUrl.createMany({
      data: [
        {
          videoId: videos[i].id,
          url: `https://www.youtube.com/watch?v=sample${i + 1}`,
          platform: "YouTube",
          sortOrder: 0,
        },
        {
          videoId: videos[i].id,
          url: `https://vimeo.com/sample${i + 1}`,
          platform: "Vimeo",
          sortOrder: 1,
        },
      ],
    });
  }

  console.log("Reference URLs created");

  // ============================================================
  // Versions (for submitted+ videos)
  // ============================================================
  for (let i = 1; i < videos.length; i++) {
    await prisma.version.create({
      data: {
        videoId: videos[i].id,
        versionNumber: 1,
        fileName: `video_${i + 1}_v1.mp4`,
        fileSize: BigInt(1024 * 1024 * (50 + i * 10)),
        mimeType: "video/mp4",
        googleDriveFileId: `gdrive_file_${i + 1}_v1`,
        googleDriveUrl: `https://drive.google.com/file/d/sample${i + 1}/view`,
        uploadedBy: creators[i % creators.length].id,
      },
    });

    // Add v2 for revised/approved+ videos
    if (i >= 4) {
      await prisma.version.create({
        data: {
          videoId: videos[i].id,
          versionNumber: 2,
          fileName: `video_${i + 1}_v2.mp4`,
          fileSize: BigInt(1024 * 1024 * (55 + i * 10)),
          mimeType: "video/mp4",
          googleDriveFileId: `gdrive_file_${i + 1}_v2`,
          googleDriveUrl: `https://drive.google.com/file/d/sample${i + 1}_v2/view`,
          uploadedBy: creators[i % creators.length].id,
        },
      });
    }
  }

  console.log("Versions created");

  // ============================================================
  // Google Drive Settings
  // ============================================================
  await prisma.googleDriveSetting.create({
    data: {
      name: "メイン共有ドライブ",
      driveId: "sample_drive_id",
      rootFolderId: "sample_root_folder_id",
      isActive: true,
    },
  });

  console.log("Google Drive settings created");
  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
