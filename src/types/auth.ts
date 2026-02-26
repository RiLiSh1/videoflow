import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  loginId: string;
  name: string;
  role: Role;
};

export type JWTPayload = {
  sub: string;
  loginId: string;
  name: string;
  role: Role;
  iat: number;
  exp: number;
};
