import { PrismaClient, Role, ProjectStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function main() {
  console.log("Seeding database...");

  // Clean existing data
  await prisma.notificationTemplate.deleteMany();
  await prisma.paymentNotification.deleteMany();
  await prisma.creatorCompensation.deleteMany();
  await prisma.creatorProfile.deleteMany();
  await prisma.companySettings.deleteMany();
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
  // Creator Compensation (クリエイター & ディレクター)
  // ============================================================
  await prisma.creatorCompensation.createMany({
    data: [
      {
        userId: creator1.id,
        type: "PER_VIDEO",
        perVideoRate: 5000,
        isFixedMonthly: false,
      },
      {
        userId: creator2.id,
        type: "PER_VIDEO",
        perVideoRate: 8000,
        isFixedMonthly: false,
      },
      {
        userId: creator3.id,
        type: "CUSTOM",
        customAmount: 50000,
        customNote: "月額固定報酬",
        isFixedMonthly: true,
      },
      {
        userId: director1.id,
        type: "PER_VIDEO",
        perVideoRate: 3000,
        isFixedMonthly: false,
      },
      // director2 は報酬未設定 (ダブルチェック確認用)
    ],
  });

  console.log("Compensation created");

  // ============================================================
  // Creator Profiles (事業者情報)
  // ============================================================
  await prisma.creatorProfile.createMany({
    data: [
      {
        userId: creator1.id,
        entityType: "INDIVIDUAL",
        businessName: "田中映像制作",
        postalCode: "150-0001",
        address: "東京都渋谷区神宮前1-2-3",
        invoiceNumber: "T1234567890123",
        bankName: "三菱UFJ銀行",
        bankBranch: "渋谷支店",
        bankAccountType: "普通",
        bankAccountNumber: "1234567",
        bankAccountHolder: "タナカ タロウ",
      },
      {
        userId: creator2.id,
        entityType: "CORPORATION",
        businessName: "株式会社ヤマダクリエイティブ",
        postalCode: "160-0022",
        address: "東京都新宿区新宿3-4-5",
        invoiceNumber: "T9876543210987",
        bankName: "みずほ銀行",
        bankBranch: "新宿支店",
        bankAccountType: "普通",
        bankAccountNumber: "7654321",
        bankAccountHolder: "カ）ヤマダクリエイティブ",
      },
      // creator3 はプロフィール未設定 (ダブルチェック確認用)
      {
        userId: director1.id,
        entityType: "INDIVIDUAL",
        businessName: "佐藤映像企画",
        postalCode: "106-0032",
        address: "東京都港区六本木5-6-7",
        bankName: "りそな銀行",
        bankBranch: "六本木支店",
        bankAccountType: "普通",
        bankAccountNumber: "9876543",
        bankAccountHolder: "サトウ ジロウ",
      },
      // director2 はプロフィール未設定 (ダブルチェック確認用)
    ],
  });

  console.log("Profiles created");

  // ============================================================
  // Company Settings
  // ============================================================
  await prisma.companySettings.create({
    data: {
      companyName: "株式会社LMスタジオ",
      postalCode: "100-0001",
      address: "東京都千代田区千代田1-1-1",
      tel: "03-1234-5678",
      email: "info@lm-studio.example.com",
      invoiceNumber: "T0000000000001",
    },
  });

  console.log("Company settings created");

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

  const project3 = await prisma.project.create({
    data: {
      projectCode: "PRJ-003",
      name: "企業PR動画",
      description: "コーポレートサイト用PR動画制作",
      deadline: new Date("2026-06-30"),
      status: ProjectStatus.ACTIVE,
      createdBy: admin.id,
    },
  });

  await prisma.projectDirector.createMany({
    data: [
      { projectId: project1.id, userId: director1.id },
      { projectId: project1.id, userId: director2.id },
      { projectId: project2.id, userId: director1.id },
      { projectId: project3.id, userId: director2.id },
    ],
  });

  console.log("Projects created");

  // ============================================================
  // Videos — COMPLETED + various statuses
  // Version 1 dates spread across 2026-01, 2026-02, 2025-12
  // ============================================================
  const directors = [director1, director2];
  let videoSeq = 1;

  // --- COMPLETED videos: creator1, director1, 2026-01 (3本) ---
  const completedVideos: { videoId: string; v1Date: Date }[] = [];

  const completedDefs: {
    title: string;
    project: typeof project1;
    creator: typeof creator1;
    director: typeof director1;
    v1Date: Date;
  }[] = [
    // 2026-01: creator1 × 3, creator2 × 2
    {
      title: "春セール告知動画",
      project: project1,
      creator: creator1,
      director: director1,
      v1Date: new Date("2026-01-10T10:00:00Z"),
    },
    {
      title: "新商品ティザー映像",
      project: project1,
      creator: creator1,
      director: director1,
      v1Date: new Date("2026-01-15T10:00:00Z"),
    },
    {
      title: "ブランドストーリー #3",
      project: project1,
      creator: creator1,
      director: director2,
      v1Date: new Date("2026-01-20T10:00:00Z"),
    },
    {
      title: "商品レビュー動画 A",
      project: project2,
      creator: creator2,
      director: director1,
      v1Date: new Date("2026-01-12T10:00:00Z"),
    },
    {
      title: "How-to ガイド #1",
      project: project2,
      creator: creator2,
      director: director1,
      v1Date: new Date("2026-01-25T10:00:00Z"),
    },
    // 2026-02: creator1 × 2, creator2 × 1, creator3 × 1
    {
      title: "キャンペーンCM 30秒版",
      project: project1,
      creator: creator1,
      director: director1,
      v1Date: new Date("2026-02-05T10:00:00Z"),
    },
    {
      title: "スタッフ紹介動画",
      project: project3,
      creator: creator1,
      director: director2,
      v1Date: new Date("2026-02-12T10:00:00Z"),
    },
    {
      title: "お客様の声インタビュー",
      project: project2,
      creator: creator2,
      director: director1,
      v1Date: new Date("2026-02-08T10:00:00Z"),
    },
    {
      title: "企業PR本編",
      project: project3,
      creator: creator3,
      director: director2,
      v1Date: new Date("2026-02-18T10:00:00Z"),
    },
    // 2025-12: creator1 × 2
    {
      title: "年末キャンペーン告知",
      project: project1,
      creator: creator1,
      director: director1,
      v1Date: new Date("2025-12-05T10:00:00Z"),
    },
    {
      title: "冬セール動画",
      project: project2,
      creator: creator1,
      director: director2,
      v1Date: new Date("2025-12-20T10:00:00Z"),
    },
  ];

  for (const def of completedDefs) {
    const video = await prisma.video.create({
      data: {
        videoCode: `VID-${String(videoSeq++).padStart(3, "0")}`,
        projectId: def.project.id,
        title: def.title,
        creatorId: def.creator.id,
        directorId: def.director.id,
        status: "COMPLETED",
        deadline: new Date("2026-03-31"),
      },
    });
    completedVideos.push({ videoId: video.id, v1Date: def.v1Date });
  }

  // --- DRAFT videos (5本) ---
  const draftTitles = [
    "Instagram リール用素材",
    "TikTok プロモ動画",
    "サービス紹介 60秒版",
    "コラボ企画動画 #2",
    "季節限定プロモ動画",
  ];

  for (let i = 0; i < 5; i++) {
    const proj = i < 3 ? project1 : project2;
    await prisma.video.create({
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
  }

  // --- REVISION_REQUESTED videos (4本) ---
  const revisionTitles = [
    "採用ページ用動画",
    "サービス紹介ロング版",
    "コラボ企画動画 #3",
    "新春キャンペーン告知",
  ];

  const revisionVideos = [];
  for (let i = 0; i < 4; i++) {
    const proj = i < 2 ? project2 : project3;
    const video = await prisma.video.create({
      data: {
        videoCode: `VID-${String(videoSeq++).padStart(3, "0")}`,
        projectId: proj.id,
        title: revisionTitles[i],
        creatorId: i < 2 ? creator1.id : creator2.id,
        directorId: directors[i % 2].id,
        status: "REVISION_REQUESTED",
        deadline: new Date("2026-03-20"),
      },
    });
    revisionVideos.push(video);
  }

  console.log(
    `Videos created (${completedDefs.length} COMPLETED + 5 DRAFT + 4 REVISION_REQUESTED)`
  );

  // ============================================================
  // Versions — v1 for COMPLETED videos (with specific dates)
  // ============================================================
  for (const cv of completedVideos) {
    await prisma.version.create({
      data: {
        videoId: cv.videoId,
        versionNumber: 1,
        fileName: `video_v1.mp4`,
        fileSize: BigInt(1024 * 1024 * 50),
        mimeType: "video/mp4",
        googleDriveUrl: `https://drive.google.com/file/d/sample/view`,
        uploadedBy: creator1.id,
        createdAt: cv.v1Date,
      },
    });
  }

  // v1 for REVISION_REQUESTED videos (current month)
  for (const video of revisionVideos) {
    await prisma.version.create({
      data: {
        videoId: video.id,
        versionNumber: 1,
        fileName: `${video.videoCode}_v1.mp4`,
        fileSize: BigInt(1024 * 1024 * 60),
        mimeType: "video/mp4",
        googleDriveUrl: `https://drive.google.com/file/d/sample/view`,
        uploadedBy: creator1.id,
      },
    });
  }

  console.log("Versions created");

  // ============================================================
  // Reference URLs — for revision videos
  // ============================================================
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
  // Feedbacks — revision videos
  // ============================================================
  const feedbackComments = [
    [
      {
        comment:
          "冒頭の5秒が長すぎるので、3秒以内にまとめてください。",
        ts: 5,
      },
      {
        comment:
          "BGMの音量が大きすぎます。ナレーションが聞き取りにくいので調整をお願いします。",
        ts: 30,
      },
    ],
    [
      {
        comment:
          "テロップのフォントサイズが小さいです。スマホ表示を考慮して大きめにしてください。",
        ts: 12,
      },
    ],
    [
      {
        comment:
          "商品のクローズアップが足りません。0:15〜0:20あたりで商品を大きく映してください。",
        ts: 15,
      },
      {
        comment:
          "エンディングのCTAボタンのデザインを変更してください。",
        ts: 58,
      },
    ],
    [
      {
        comment:
          "カラーグレーディングが暗すぎます。全体的に明るく調整してください。",
        ts: null,
      },
    ],
  ];

  const revisionVersions = await prisma.version.findMany({
    where: { videoId: { in: revisionVideos.map((v) => v.id) } },
    orderBy: { createdAt: "asc" },
  });

  for (let i = 0; i < revisionVideos.length; i++) {
    const version = revisionVersions.find(
      (v) => v.videoId === revisionVideos[i].id
    );
    if (!version) continue;
    for (const fb of feedbackComments[i]) {
      await prisma.feedback.create({
        data: {
          versionId: version.id,
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
  console.log("");
  console.log("=== 支払通知書テストデータ ===");
  console.log("報酬設定あり: creator1(¥5,000/本), creator2(¥8,000/本), creator3(¥50,000/月固定), director1(¥3,000/本)");
  console.log("報酬未設定:   director2 (ダブルチェック確認用)");
  console.log("プロフィール未設定: creator3, director2 (ダブルチェック確認用)");
  console.log("");
  console.log("COMPLETED動画:");
  console.log("  2025-12: creator1×2");
  console.log("  2026-01: creator1×3, creator2×2 / director1×4, director2×1");
  console.log("  2026-02: creator1×2, creator2×1, creator3×1 / director1×2, director2×2");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
