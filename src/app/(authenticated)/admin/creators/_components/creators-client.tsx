"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { CompensationType, EntityType } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format-date";
import { ENTITY_TYPE_LABELS } from "@/lib/constants/entity-type";
import { Coins, Film, UserCog } from "lucide-react";
import { CompensationDialog } from "./compensation-dialog";
import { CreatorProfileDialog } from "./creator-profile-dialog";

export type CreatorRow = {
  id: string;
  loginId: string;
  name: string;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  videoCount: number;
  compensation: {
    type: CompensationType;
    perVideoRate: number | null;
    customAmount: number | null;
    customNote: string | null;
    isFixedMonthly: boolean;
  } | null;
  profile: {
    entityType: EntityType;
    businessName: string | null;
  } | null;
};

interface CreatorsClientProps {
  creators: CreatorRow[];
}

function formatYen(amount: number | null | undefined): string {
  if (amount == null) return "-";
  return `¥${amount.toLocaleString()}`;
}

function CompensationSummary({
  compensation,
}: {
  compensation: CreatorRow["compensation"];
}) {
  if (!compensation) {
    return <span className="text-gray-300">未設定</span>;
  }

  if (compensation.type === "PER_VIDEO") {
    return (
      <div className="flex items-center gap-1.5">
        <Badge className="bg-blue-100 text-blue-800">動画単価</Badge>
        <span className="text-sm font-medium text-gray-900">
          {formatYen(compensation.perVideoRate)}/本
        </span>
      </div>
    );
  }

  // CUSTOM
  return (
    <div className="flex items-center gap-1.5">
      <Badge className="bg-purple-100 text-purple-800">自分設定</Badge>
      {compensation.isFixedMonthly ? (
        <span className="text-sm font-medium text-gray-900">
          {formatYen(compensation.customAmount)}/月（固定）
        </span>
      ) : (
        <span className="text-sm font-medium text-gray-900">
          {formatYen(compensation.customAmount)}
          {compensation.customNote && (
            <span className="ml-1 text-xs text-gray-400">
              ({compensation.customNote})
            </span>
          )}
        </span>
      )}
    </div>
  );
}

export function CreatorsClient({ creators }: CreatorsClientProps) {
  const router = useRouter();
  const [editCreator, setEditCreator] = useState<CreatorRow | null>(null);
  const [profileCreator, setProfileCreator] = useState<CreatorRow | null>(null);

  const columns: ColumnDef<CreatorRow, unknown>[] = [
    {
      accessorKey: "name",
      header: "クリエイター名",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-gray-900">{row.original.name}</p>
          <p className="text-xs text-gray-400">{row.original.loginId}</p>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "メール",
      cell: ({ row }) => (
        <span className="text-gray-600">
          {row.original.email || "-"}
        </span>
      ),
    },
    {
      id: "entityType",
      header: "区分",
      cell: ({ row }) => {
        const profile = row.original.profile;
        if (!profile) return <span className="text-gray-300">未設定</span>;
        return profile.entityType === "INDIVIDUAL" ? (
          <Badge className="bg-orange-100 text-orange-800">
            {ENTITY_TYPE_LABELS[profile.entityType]}
          </Badge>
        ) : (
          <Badge className="bg-teal-100 text-teal-800">
            {ENTITY_TYPE_LABELS[profile.entityType]}
          </Badge>
        );
      },
    },
    {
      accessorKey: "videoCount",
      header: "動画数",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <Film className="h-3.5 w-3.5 text-gray-400" />
          <span className="font-medium text-gray-700">
            {row.original.videoCount}
          </span>
        </div>
      ),
    },
    {
      id: "compensation",
      header: "報酬設計",
      cell: ({ row }) => (
        <CompensationSummary compensation={row.original.compensation} />
      ),
    },
    {
      accessorKey: "isActive",
      header: "ステータス",
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge className="bg-green-100 text-green-800">有効</Badge>
        ) : (
          <Badge className="bg-gray-100 text-gray-800">無効</Badge>
        ),
    },
    {
      accessorKey: "createdAt",
      header: "登録日",
      cell: ({ row }) => (
        <span className="text-xs text-gray-400">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setProfileCreator(row.original)}
          >
            <UserCog className="mr-1.5 h-3.5 w-3.5" />
            事業者情報
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setEditCreator(row.original)}
          >
            <Coins className="mr-1.5 h-3.5 w-3.5" />
            報酬設定
          </Button>
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        data={creators}
        columns={columns}
        searchPlaceholder="クリエイター名で検索..."
        searchColumn="name"
      />

      {editCreator && (
        <CompensationDialog
          open={!!editCreator}
          onClose={() => setEditCreator(null)}
          onSuccess={() => {
            setEditCreator(null);
            router.refresh();
          }}
          creator={editCreator}
        />
      )}
    </>
  );
}
