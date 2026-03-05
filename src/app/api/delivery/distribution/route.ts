import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, isSessionUser } from "@/lib/auth/require-auth";

/**
 * GET: 月次配分データ取得
 * クライアント別の過不足状況 + 在庫情報
 */
export async function GET(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const { searchParams } = new URL(request.url);
  const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);
  const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  const [clients, schedules, unusedStocks] = await Promise.all([
    prisma.deliveryClient.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, monthlyDeliveryCount: true },
    }),
    prisma.deliverySchedule.findMany({
      where: {
        weekStart: { gte: monthStart, lte: monthEnd },
      },
      include: {
        client: { select: { id: true, name: true } },
        videoStock: { select: { id: true, title: true } },
      },
      orderBy: { weekStart: "asc" },
    }),
    prisma.videoStock.findMany({
      where: { isUsed: false, deliverySchedules: { none: {} } },
      select: {
        id: true,
        title: true,
        deliveryScope: true,
        clientId: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // クライアント別集計
  const clientSummary = clients.map((client) => {
    const cs = schedules.filter((s) => s.clientId === client.id);
    const sent = cs.filter((s) => s.status === "SENT").length;
    const scheduled = cs.filter((s) => ["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(s.status)).length;
    const target = client.monthlyDeliveryCount;
    const shortage = Math.max(0, target - sent - scheduled);

    // この店舗専用の未使用ストック
    const clientStocks = unusedStocks.filter(
      (s) => s.deliveryScope === "SELECTED_STORES" && s.clientId === client.id
    );

    return {
      client,
      target,
      sent,
      scheduled,
      shortage,
      clientStockCount: clientStocks.length,
    };
  });

  // 全店舗用ストック
  const allStoresStocks = unusedStocks.filter((s) => s.deliveryScope === "ALL_STORES");
  // 未割当ストック（scopeなし or clientなし）
  const unassignedStocks = unusedStocks.filter(
    (s) => !s.deliveryScope || (s.deliveryScope === "SELECTED_STORES" && !s.clientId)
  );

  // 週別集計
  const weekMap = new Map<string, typeof schedules>();
  for (const s of schedules) {
    const weekKey = new Date(s.weekStart).toISOString().split("T")[0];
    if (!weekMap.has(weekKey)) weekMap.set(weekKey, []);
    weekMap.get(weekKey)!.push(s);
  }

  const weekSummary = Array.from(weekMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, items]) => ({
      week,
      schedules: items.map((s) => ({
        id: s.id,
        clientName: s.client.name,
        videoTitle: s.videoStock.title,
        status: s.status,
      })),
    }));

  return NextResponse.json({
    success: true,
    data: {
      year,
      month,
      clientSummary,
      weekSummary,
      stockPool: {
        allStores: allStoresStocks,
        unassigned: unassignedStocks,
        total: unusedStocks.length,
      },
    },
  });
}

/**
 * POST: 自動振り分け
 * 不足しているクライアントに在庫を自動で割り当て、DRAFTスケジュールを作成
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuth(["ADMIN"]);
  if (!isSessionUser(auth)) return auth;

  const body = await request.json();
  const { year, month } = body as { year: number; month: number };

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // データ取得
  const [clients, schedules, unusedStocks] = await Promise.all([
    prisma.deliveryClient.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, monthlyDeliveryCount: true },
    }),
    prisma.deliverySchedule.findMany({
      where: { weekStart: { gte: monthStart, lte: monthEnd } },
      select: { clientId: true, status: true },
    }),
    prisma.videoStock.findMany({
      where: { isUsed: false, deliverySchedules: { none: {} } },
      select: { id: true, title: true, deliveryScope: true, clientId: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  // 月の週一覧（毎週月曜）
  const weeks: Date[] = [];
  const d = new Date(monthStart);
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  d.setDate(d.getDate() + diff);
  while (d <= monthEnd) {
    weeks.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  if (weeks.length === 0) {
    weeks.push(monthStart);
  }

  // クライアントごとの不足数を算出
  type ClientNeed = { clientId: string; shortage: number; weeklyTarget: number };
  const needs: ClientNeed[] = [];

  for (const client of clients) {
    const cs = schedules.filter((s) => s.clientId === client.id);
    const existing = cs.filter((s) => s.status !== "FAILED").length;
    const shortage = Math.max(0, client.monthlyDeliveryCount - existing);
    if (shortage > 0) {
      needs.push({
        clientId: client.id,
        shortage,
        weeklyTarget: Math.max(1, Math.round(client.monthlyDeliveryCount / weeks.length)),
      });
    }
  }

  if (needs.length === 0) {
    return NextResponse.json({
      success: true,
      data: { created: 0, message: "全クライアントの配分が充足しています" },
    });
  }

  // 週ごとの既存スケジュール数
  const weekClientCount = new Map<string, Map<string, number>>();
  const allSchedules = await prisma.deliverySchedule.findMany({
    where: { weekStart: { gte: monthStart, lte: monthEnd } },
    select: { clientId: true, weekStart: true },
  });
  for (const s of allSchedules) {
    const wk = s.weekStart.toISOString().split("T")[0];
    if (!weekClientCount.has(wk)) weekClientCount.set(wk, new Map());
    const wmap = weekClientCount.get(wk)!;
    wmap.set(s.clientId, (wmap.get(s.clientId) || 0) + 1);
  }

  // ストック振り分け
  const assignments: { clientId: string; videoStockId: string; weekStart: string }[] = [];
  const usedStockIds = new Set<string>();

  // 1. 店舗選択ストックを該当クライアントに優先配置
  for (const need of needs) {
    const clientStocks = unusedStocks.filter(
      (s) => s.deliveryScope === "SELECTED_STORES" && s.clientId === need.clientId && !usedStockIds.has(s.id)
    );
    for (const stock of clientStocks) {
      if (need.shortage <= 0) break;
      const week = findBestWeek(weeks, need.clientId, need.weeklyTarget, weekClientCount);
      if (!week) break;
      assignments.push({ clientId: need.clientId, videoStockId: stock.id, weekStart: week });
      usedStockIds.add(stock.id);
      need.shortage--;
      // weekClientCountを更新
      const wk = week;
      if (!weekClientCount.has(wk)) weekClientCount.set(wk, new Map());
      const wmap = weekClientCount.get(wk)!;
      wmap.set(need.clientId, (wmap.get(need.clientId) || 0) + 1);
    }
  }

  // 2. 全店舗用ストックを不足数が多い順に配置
  const sortedNeeds = [...needs].sort((a, b) => b.shortage - a.shortage);
  const allStoresStocks = unusedStocks.filter(
    (s) => s.deliveryScope === "ALL_STORES" && !usedStockIds.has(s.id)
  );

  let stockIdx = 0;
  let distributed = true;
  while (distributed) {
    distributed = false;
    for (const need of sortedNeeds) {
      if (need.shortage <= 0 || stockIdx >= allStoresStocks.length) continue;
      const stock = allStoresStocks[stockIdx];
      if (usedStockIds.has(stock.id)) { stockIdx++; continue; }
      const week = findBestWeek(weeks, need.clientId, need.weeklyTarget, weekClientCount);
      if (!week) continue;
      assignments.push({ clientId: need.clientId, videoStockId: stock.id, weekStart: week });
      usedStockIds.add(stock.id);
      need.shortage--;
      stockIdx++;
      if (!weekClientCount.has(week)) weekClientCount.set(week, new Map());
      const wmap = weekClientCount.get(week)!;
      wmap.set(need.clientId, (wmap.get(need.clientId) || 0) + 1);
      distributed = true;
    }
  }

  // 3. 未割当ストックも使う
  const unassignedStocks = unusedStocks.filter(
    (s) => (!s.deliveryScope || (s.deliveryScope === "SELECTED_STORES" && !s.clientId)) && !usedStockIds.has(s.id)
  );
  let uIdx = 0;
  distributed = true;
  while (distributed) {
    distributed = false;
    for (const need of sortedNeeds) {
      if (need.shortage <= 0 || uIdx >= unassignedStocks.length) continue;
      const stock = unassignedStocks[uIdx];
      const week = findBestWeek(weeks, need.clientId, need.weeklyTarget, weekClientCount);
      if (!week) continue;
      assignments.push({ clientId: need.clientId, videoStockId: stock.id, weekStart: week });
      usedStockIds.add(stock.id);
      need.shortage--;
      uIdx++;
      if (!weekClientCount.has(week)) weekClientCount.set(week, new Map());
      const wmap = weekClientCount.get(week)!;
      wmap.set(need.clientId, (wmap.get(need.clientId) || 0) + 1);
      distributed = true;
    }
  }

  if (assignments.length === 0) {
    return NextResponse.json({
      success: true,
      data: { created: 0, message: "割り当て可能なストックがありません" },
    });
  }

  // トランザクションでスケジュール作成
  const created = await prisma.$transaction(async (tx) => {
    const results = [];
    for (const a of assignments) {
      const schedule = await tx.deliverySchedule.create({
        data: {
          clientId: a.clientId,
          videoStockId: a.videoStockId,
          weekStart: new Date(a.weekStart),
        },
      });
      await tx.deliveryChangeLog.create({
        data: {
          scheduleId: schedule.id,
          action: "CREATE",
          actorId: auth.id,
          detail: { ...a, autoDistribute: true },
        },
      });
      results.push(schedule);
    }
    return results;
  });

  const remainingShortage = sortedNeeds.reduce((sum, n) => sum + n.shortage, 0);

  return NextResponse.json({
    success: true,
    data: {
      created: created.length,
      remainingShortage,
      message: remainingShortage > 0
        ? `${created.length}件作成しました（${remainingShortage}本不足）`
        : `${created.length}件作成しました（全て充足）`,
    },
  });
}

/** 最も空いている週を返す */
function findBestWeek(
  weeks: Date[],
  clientId: string,
  weeklyTarget: number,
  weekClientCount: Map<string, Map<string, number>>
): string | null {
  let best: string | null = null;
  let bestCount = Infinity;

  for (const w of weeks) {
    const wk = w.toISOString().split("T")[0];
    const wmap = weekClientCount.get(wk);
    const count = wmap?.get(clientId) || 0;
    if (count < weeklyTarget && count < bestCount) {
      bestCount = count;
      best = wk;
    }
  }

  // 全週がtargetを超えていても、最小の週に入れる
  if (!best) {
    for (const w of weeks) {
      const wk = w.toISOString().split("T")[0];
      const wmap = weekClientCount.get(wk);
      const count = wmap?.get(clientId) || 0;
      if (count < bestCount) {
        bestCount = count;
        best = wk;
      }
    }
  }

  return best;
}
