import { createRequire } from "module";
import { execSync } from "child_process";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("../../../server/node_modules/@prisma/client");

export const DEFAULT_USER_PASSWORD_HASH = "$2b$10$Darja.Q6FT2ivIiXVxb0V.S96Mw20uhnhV.UkhZVw7Jm91AWU5h4q"; // Password123!
export const DEFAULT_ADMIN_PASSWORD_HASH = "$2b$10$hhvJQ/PscgLmJlO7QmjIAeunskBAUnUZt/4.hMQ0FOeGWMmxMww7K"; // Admin123!

let prismaInstance: any = null;

export function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      datasources: {
        db: {
          url:
            process.env.DATABASE_URL ||
            "postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public",
        },
      },
    });
  }
  return prismaInstance;
}

export async function resetDatabase() {
  execSync("npm --prefix server run db:seed", { stdio: "ignore" });
}

export async function ensureSeedData() {
  const prisma = getPrisma();
  const ticketCount = await prisma.ticket.count();
  if (ticketCount === 0) {
    execSync("npm --prefix server run prisma:seed", { stdio: "ignore" });
  }
}

export async function resetAuthUsers() {
  await ensureSeedData();
  const prisma = getPrisma();
  // Clean up any test users created by admin user-management tests
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: "e2e_test_",
      },
    },
  });

  // Restore Sarah Connor password and mustChangePassword
  await prisma.user.update({
    where: { email: "sarah.connor@toktickit.com" },
    data: {
      passwordHash: DEFAULT_USER_PASSWORD_HASH,
      mustChangePassword: true,
      isActive: true,
    },
  });

  // Ensure Admin is active and password known
  await prisma.user.update({
    where: { email: "admin@toktickit.com" },
    data: {
      passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
      mustChangePassword: false,
      isActive: true,
      role: "ADMINISTRATOR",
    },
  });

  // Ensure David Lee (IT Staff) is active
  await prisma.user.update({
    where: { email: "david.lee@toktickit.com" },
    data: {
      passwordHash: DEFAULT_USER_PASSWORD_HASH,
      mustChangePassword: false,
      isActive: true,
      role: "IT_STAFF",
    },
  });

  // Ensure Jennifer Anderson (Requester) is active
  await prisma.user.update({
    where: { email: "jennifer.anderson@toktickit.com" },
    data: {
      passwordHash: DEFAULT_USER_PASSWORD_HASH,
      mustChangePassword: false,
      isActive: true,
      role: "REQUESTER",
    },
  });
}
