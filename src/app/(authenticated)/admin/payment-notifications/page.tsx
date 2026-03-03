import { prisma } from "@/lib/db";
import { unstable_cache } from "next/cache";
import { PageContainer } from "@/components/layout/page-container";
import { calculateWithholdingTax } from "@/lib/utils/withholding-tax";
import { PaymentNotificationsClient } from "./_components/payment-notifications-client";
import type { EntityType, CompensationType, VideoStatus } from "@prisma/client";

const getPaymentData = unstable_cache(
  async () => {
    // 1. All CREATOR/DIRECTOR users with compensation + profile
    const users = await prisma.user.findMany({
      where: {
        role: { in: ["CREATOR", "DIRECTOR"] },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        role: true,
        compensation: {
          select: {
            type: true,
            perVideoRate: true,
            customAmount: true,
            customNote: true,
            isFixedMonthly: true,
          },
        },
        profile: {
          select: {
            entityType: true,
            businessName: true,
            bankName: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // 2. All videos with version 1 createdAt (初稿ベースでカウント — ステータス不問)
    const videos = await prisma.video.findMany({
      where: {
        versions: { some: { versionNumber: 1 } },
      },
      select: {
        id: true,
        creatorId: true,
        directorId: true,
        videoCode: true,
        title: true,
        status: true,
        project: { select: { name: true } },
        versions: {
          where: { versionNumber: 1 },
          select: { createdAt: true },
          take: 1,
        },
      },
    });

    // 3. Existing payment notifications (for generated status)
    const existingNotifications = await prisma.paymentNotification.findMany({
      select: {
        id: true,
        creatorId: true,
        year: true,
        month: true,
        subtotal: true,
        withholdingTax: true,
        netAmount: true,
        invoice: {
          select: {
            id: true,
            verificationStatus: true,
          },
        },
      },
    });

    // Build notification lookup: `${userId}-${year}-${month}` → notification
    const notificationMap = new Map<
      string,
      {
        id: string;
        subtotal: number;
        withholdingTax: number;
        netAmount: number;
        invoiceStatus: string | null;
        invoiceId: string | null;
      }
    >();
    for (const n of existingNotifications) {
      notificationMap.set(`${n.creatorId}-${n.year}-${n.month}`, {
        id: n.id,
        subtotal: n.subtotal,
        withholdingTax: n.withholdingTax,
        netAmount: n.netAmount,
        invoiceStatus: n.invoice?.verificationStatus ?? null,
        invoiceId: n.invoice?.id ?? null,
      });
    }

    // 4. Single pass: count videos per user per month + collect video details
    const videoCountMap = new Map<string, number>();
    type VideoDetail = {
      videoCode: string;
      title: string;
      projectName: string;
      status: VideoStatus;
      firstUploadDate: string | null;
    };
    const videoDetailsMap = new Map<string, VideoDetail[]>();
    const allMonths = new Set<string>(); // "YYYY-MM"

    for (const v of videos) {
      const v1 = v.versions[0];
      if (!v1) continue;
      const d = v1.createdAt;
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const monthKey = `${year}-${String(month).padStart(2, "0")}`;
      allMonths.add(monthKey);

      const detail: VideoDetail = {
        videoCode: v.videoCode,
        title: v.title,
        projectName: v.project.name,
        status: v.status,
        firstUploadDate: d.toISOString(),
      };

      // Count + details for creator
      if (v.creatorId) {
        const key = `${v.creatorId}-${year}-${month}`;
        videoCountMap.set(key, (videoCountMap.get(key) || 0) + 1);
        const list = videoDetailsMap.get(key) || [];
        list.push(detail);
        videoDetailsMap.set(key, list);
      }
      // Count + details for director
      if (v.directorId) {
        const key = `${v.directorId}-${year}-${month}`;
        videoCountMap.set(key, (videoCountMap.get(key) || 0) + 1);
        const list = videoDetailsMap.get(key) || [];
        list.push(detail);
        videoDetailsMap.set(key, list);
      }
    }

    // Also add current month to allMonths
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    allMonths.add(currentMonthKey);

    // 5. Build per-user, per-month payment data
    type UserPaymentRow = {
      userId: string;
      userName: string;
      role: "CREATOR" | "DIRECTOR";
      entityType: EntityType;
      hasCompensation: boolean;
      hasProfile: boolean;
      compensationType: CompensationType | null;
      perVideoRate: number | null;
      customAmount: number | null;
      isFixedMonthly: boolean;
      months: {
        year: number;
        month: number;
        videoCount: number;
        subtotal: number;
        withholdingTax: number;
        netAmount: number;
        notificationId: string | null;
        invoiceStatus: string | null;
        invoiceId: string | null;
        videos: {
          videoCode: string;
          title: string;
          projectName: string;
          status: VideoStatus;
          firstUploadDate: string | null;
        }[];
      }[];
    };

    const userPayments: UserPaymentRow[] = [];

    // Sorted months descending
    const sortedMonths = Array.from(allMonths)
      .sort()
      .reverse()
      .map((m) => {
        const [y, mo] = m.split("-");
        return { year: Number(y), month: Number(mo) };
      });

    for (const u of users) {
      const entityType =
        (u.profile?.entityType as EntityType) || "INDIVIDUAL";
      const comp = u.compensation;
      const hasComp = !!comp;
      const hasProfile = !!(u.profile?.businessName || u.profile?.bankName);

      const months: UserPaymentRow["months"] = [];

      for (const { year, month } of sortedMonths) {
        const videoCount =
          videoCountMap.get(`${u.id}-${year}-${month}`) || 0;

        // Calculate expected compensation
        let subtotal = 0;
        if (comp) {
          if (comp.type === "CUSTOM" && comp.isFixedMonthly) {
            subtotal = comp.customAmount || 0;
          } else if (comp.type === "CUSTOM") {
            subtotal = comp.customAmount || 0;
          } else {
            // PER_VIDEO
            subtotal = videoCount * (comp.perVideoRate || 0);
          }
        }

        const withholdingTax = comp
          ? calculateWithholdingTax(subtotal, entityType)
          : 0;
        const netAmount = subtotal - withholdingTax;

        // Check if notification already generated
        const existing = notificationMap.get(`${u.id}-${year}-${month}`);

        // Include months with data, or custom compensation (always has data)
        const hasData =
          videoCount > 0 ||
          (comp?.type === "CUSTOM" && (comp.customAmount || 0) > 0);

        if (hasData) {
          months.push({
            year,
            month,
            videoCount,
            subtotal,
            withholdingTax,
            netAmount,
            notificationId: existing?.id || null,
            invoiceStatus: existing?.invoiceStatus ?? null,
            invoiceId: existing?.invoiceId ?? null,
            videos: videoDetailsMap.get(`${u.id}-${year}-${month}`) || [],
          });
        }
      }

      userPayments.push({
        userId: u.id,
        userName: u.name,
        role: u.role as "CREATOR" | "DIRECTOR",
        entityType,
        hasCompensation: hasComp,
        hasProfile,
        compensationType: comp?.type || null,
        perVideoRate: comp?.perVideoRate || null,
        customAmount: comp?.customAmount || null,
        isFixedMonthly: comp?.isFixedMonthly || false,
        months,
      });
    }

    // Available years from data
    const yearSet = new Set<number>();
    Array.from(allMonths).forEach((m) => {
      yearSet.add(Number(m.split("-")[0]));
    });
    yearSet.add(new Date().getFullYear());
    const availableYears = Array.from(yearSet).sort((a, b) => b - a);

    return { userPayments, availableYears };
  },
  ["admin-payment-notifications-v2"],
  { revalidate: 30 }
);

export default async function AdminPaymentNotificationsPage() {
  const { userPayments, availableYears } = await getPaymentData();

  return (
    <PageContainer title="支払通知書">
      <PaymentNotificationsClient
        userPayments={userPayments}
        availableYears={availableYears}
      />
    </PageContainer>
  );
}
