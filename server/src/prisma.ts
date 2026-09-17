import { PrismaClient } from "@prisma/client";

// Lazy singleton: the client is created on first use, not at import time.
// This keeps route modules and tests that don't touch the DB (e.g. /api/health)
// free of database side effects.
let client: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!client) {
    const rawClient = new PrismaClient();

    // Backward-compatibility delegate for legacy scripts (such as CI verify seeded records)
    // that query prisma.requesterUser
    (rawClient as any).requesterUser = {
      count: (args?: any) => {
        const where = { ...args?.where, role: "REQUESTER" };
        return rawClient.user.count({ ...args, where });
      },
      findMany: (args?: any) => {
        const where = { ...args?.where, role: "REQUESTER" };
        return rawClient.user.findMany({ ...args, where });
      },
      findUnique: (args: any) => rawClient.user.findUnique(args),
      findFirst: (args?: any) => {
        const where = { ...args?.where, role: "REQUESTER" };
        return rawClient.user.findFirst({ ...args, where });
      },
      findFirstOrThrow: (args?: any) => {
        const where = { ...args?.where, role: "REQUESTER" };
        return rawClient.user.findFirstOrThrow({ ...args, where });
      },
    };

    client = rawClient;
  }
  return client;
}
