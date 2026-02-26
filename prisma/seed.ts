import { PrismaClient, Role, ProjectStatus } from "@prisma/client";
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
  // Projects
  // ============================================================
  const project1 = await prisma.project.create({
    data: {
      projectCode: "PRJ-001",
      name: "春キャンペーン動画",
      description: "2026年春のプロモーション用動画制作案件",
      deadline: new Date("2026-04-30"),
      status: ProjectStatus.ACTIVE,
      createdBy: admin.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      projectCode: "PRJ-002",
      name: "商品紹介シリーズ",
      description: "ECサイト向け商品紹介動画シリーズ",
      deadline: new Date("2026-05-31"),
      status: ProjectStatus.ACTIVE,
      createdBy: admin.id,
    },
  });

  await prisma.projectDirector.createMany({
    data: [
      { projectId: project1.id, userId: director1.id },
      { projectId: project1.id, userId: director2.id },
      { projectId: project2.id, userId: director1.id },
    ],
  });

  console.log("Projects created");

  // ============================================================
  // Videos — 5 DRAFT + 5 REVISION_REQUESTED = 10 total
  // All assigned to creator1 for demo
  // ============================================================
  const directors = [director1, director2];

  const draftTitles = [
    "春セール告知動画",
    "新商品ティザー映像",
    "ブランドストーリー #3",
    "Instagram リール用素材",
    "TikTok プロモ動画",
  ];

  const revisionTitles = [
    "商品レビュー動画 A",
    "How-to ガイド #1",
    "キャンペーンCM 30秒版",
    "スタッフ紹介動画",
    "お客様の声インタビュー",
  ];

  // --- DRAFT videos (project1: 3, project2: 2) ---
  let videoSeq = 1;
  const draftVideos = [];
  for (let i = 0; i < 5; i++) {
    const proj = i < 3 ? project1 : project2;
    const video = await prisma.video.create({
      data: {
        videoCode: `VID-${String(videoSeq++).padStart(3, "0")}`,
        projectId: proj.id,
        title: draftTitles[i],
        creatorId: creator1.id,
        directorId: directors[i % 2].id,
        status: "DRAFT",
        deadline: new Date("2026-04-15"),
      },
    });
    draftVideos.push(video);
  }

  // --- REVISION_REQUESTED videos (project1: 2, project2: 3) ---
  const revisionVideos = [];
  for (let i = 0; i < 5; i++) {
    const proj = i < 2 ? project1 : project2;
    const video = await prisma.video.create({
      data: {
        videoCode: `VID-${String(videoSeq++).padStart(3, "0")}`,
        projectId: proj.id,
        title: revisionTitles[i],
        creatorId: creator1.id,
        directorId: directors[i % 2].id,
        status: "REVISION_REQUESTED",
        deadline: new Date("2026-03-20"),
      },
    });
    revisionVideos.push(video);
  }

  console.log("Videos created (10 total: 5 DRAFT + 5 REVISION_REQUESTED)");

  // ============================================================
  // Reference URLs — for revision videos
  // ============================================================
  const platforms = ["Instagram", "TikTok", "YouTube"];
  for (const video of revisionVideos) {
    await prisma.referenceUrl.createMany({
      data: [
        {
          videoId: video.id,
          url: `https://www.instagram.com/reel/sample_${video.videoCode}`,
          platform: "Instagram",
          sortOrder: 0,
        },
        {
          videoId: video.id,
          url: `https://www.tiktok.com/@sample/video/${video.videoCode}`,
          platform: "TikTok",
          sortOrder: 1,
        },
      ],
    });
  }

  console.log("Reference URLs created");

  // ============================================================
  // Versions — v1 for each revision video
  // ============================================================
  const versions = [];
  for (let i = 0; i < revisionVideos.length; i++) {
    const v = await prisma.version.create({
      data: {
        videoId: revisionVideos[i].id,
        versionNumber: 1,
        fileName: `${revisionVideos[i].videoCode}_v1.mp4`,
        fileSize: BigInt(1024 * 1024 * (40 + i * 15)),
        mimeType: "video/mp4",
        googleDriveUrl: `https://drive.google.com/file/d/sample_${i + 1}/view`,
        uploadedBy: creator1.id,
      },
    });
    versions.push(v);
  }

  console.log("Versions created");

  // ============================================================
  // Feedbacks — revision videos have director feedback
  // ============================================================
  const feedbackComments = [
    [
      { comment: "冒頭の5秒が長すぎるので、3秒以内にまとめてください。ロゴのアニメーションはもう少しスムーズに。", ts: 5 },
      { comment: "BGMの音量が大きすぎます。ナレーションが聞き取りにくいので調整をお願いします。", ts: 30 },
    ],
    [
      { comment: "テロップのフォントサイズが小さいです。スマホ表示を考慮して大きめにしてください。", ts: 12 },
      { comment: "エンディングのCTAボタンのデザインを変更してください。ブランドカラーに合わせてください。", ts: 58 },
      { comment: "全体的にテンポが遅いです。カット間のトランジションを短くしてください。", ts: null },
    ],
    [
      { comment: "商品のクローズアップが足りません。0:15〜0:20あたりで商品を大きく映してください。", ts: 15 },
    ],
    [
      { comment: "ナレーションのトーンがブランドイメージと合っていません。もう少し明るい雰囲気でお願いします。", ts: null },
      { comment: "最後のロゴ表示が短すぎます。2秒以上表示してください。", ts: 45 },
    ],
    [
      { comment: "インタビュー部分の字幕にタイポがあります。「製品」→「商品」に統一してください。", ts: 22 },
      { comment: "カラーグレーディングが暗すぎます。全体的に明るく調整してください。", ts: null },
      { comment: "BGMの選曲を変更してください。もう少し落ち着いた雰囲気のものを。", ts: 8 },
    ],
  ];

  for (let i = 0; i < revisionVideos.length; i++) {
    for (const fb of feedbackComments[i]) {
      await prisma.feedback.create({
        data: {
          versionId: versions[i].id,
          videoId: revisionVideos[i].id,
          userId: directors[i % 2].id,
          comment: fb.comment,
          videoTimestamp: fb.ts,
          actionType: "REVISION_REQUESTED",
        },
      });
    }
  }

  console.log("Feedbacks created");

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
  console.log("");
  console.log("=== ログイン情報 ===");
  console.log("管理者:       admin / admin123");
  console.log("ディレクター: director1 / director123");
  console.log("クリエイター: creator1 / creator123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
