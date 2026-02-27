"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { Role, CompensationType } from "@prisma/client";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleBadge } from "@/components/domain/role-badge";
import { formatDate } from "@/lib/utils/format-date";
import { Pencil, UserX, Plus, Banknote, Building2 } from "lucide-react";
import { UserCreateDialog } from "./user-create-dialog";
import { UserEditDialog } from "./user-edit-dialog";
import { UserDeactivateDialog } from "./user-deactivate-dialog";
import { UserCompensationDialog } from "./user-compensation-dialog";
import { UserProfileDialog } from "./user-profile-dialog";

export interface UserRow {
  id: string;
  loginId: string;
  name: string;
  email: string | null;
  role: Role;
  chatworkId: string | null;
  isActive: boolean;
  createdAt: string;
  compensation: {
    type: CompensationType;
    perVideoRate: number | null;
    customAmount: number | null;
    customNote: string | null;
    isFixedMonthly: boolean;
  } | null;
  profile: {
    entityType: string;
  } | null;
}

interface UsersClientProps {
  users: UserRow[];
}

export function UsersClient({ users }: UsersClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<UserRow | null>(null);
  const [compensationUser, setCompensationUser] = useState<UserRow | null>(
    null
  );
  const [profileUser, setProfileUser] = useState<UserRow | null>(null);

  const columns: ColumnDef<UserRow, unknown>[] = [
    {
      accessorKey: "loginId",
      header: "ログインID",
      cell: ({ row }) => (
        <span className="font-medium text-gray-900">
          {row.original.loginId}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "名前",
    },
    {
      accessorKey: "role",
      header: "ロール",
      cell: ({ row }) => <RoleBadge role={row.original.role} />,
    },
    {
      accessorKey: "email",
      header: "メール",
      cell: ({ row }) => row.original.email || "-",
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
      header: "作成日",
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
    {
      id: "actions",
      header: "操作",
      enableSorting: false,
      cell: ({ row }) => {
        const isPayable =
          row.original.role === "CREATOR" || row.original.role === "DIRECTOR";
        return (
          <div className="flex items-center gap-2">
            {isPayable && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCompensationUser(row.original)}
                  title="報酬設定"
                >
                  <Banknote className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setProfileUser(row.original)}
                  title="事業者情報"
                >
                  <Building2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditUser(row.original)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            {row.original.isActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeactivateUser(row.original)}
              >
                <UserX className="h-4 w-4 text-red-500" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const handleSuccess = () => {
    router.refresh();
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          新規ユーザー
        </Button>
      </div>

      <DataTable
        data={users}
        columns={columns}
        searchPlaceholder="ユーザー名、ログインIDで検索..."
        searchColumn="name"
      />

      <UserCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={handleSuccess}
      />

      {editUser && (
        <UserEditDialog
          open={!!editUser}
          onClose={() => setEditUser(null)}
          onSuccess={handleSuccess}
          user={editUser}
        />
      )}

      {deactivateUser && (
        <UserDeactivateDialog
          open={!!deactivateUser}
          onClose={() => setDeactivateUser(null)}
          onSuccess={handleSuccess}
          user={deactivateUser}
        />
      )}

      {compensationUser && (
        <UserCompensationDialog
          open={!!compensationUser}
          onClose={() => setCompensationUser(null)}
          onSuccess={() => {
            setCompensationUser(null);
            handleSuccess();
          }}
          user={compensationUser}
        />
      )}

      {profileUser && (
        <UserProfileDialog
          open={!!profileUser}
          onClose={() => setProfileUser(null)}
          onSuccess={() => {
            setProfileUser(null);
            handleSuccess();
          }}
          userId={profileUser.id}
          userName={profileUser.name}
        />
      )}
    </>
  );
}
