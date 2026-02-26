import { prisma } from "@/lib/db";
import { PageContainer } from "@/components/layout/page-container";
import { UsersClient } from "./_components/users-client";

async function getUsers() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      loginId: true,
      name: true,
      email: true,
      role: true,
      chatworkId: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
  }));
}

export default async function AdminUsersPage() {
  const users = await getUsers();

  return (
    <PageContainer title="ユーザー管理">
      <UsersClient users={users} />
    </PageContainer>
  );
}
