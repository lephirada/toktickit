import { getPrisma } from "../src/prisma.js";

const categories = [
  "Account and Access",
  "Hardware",
  "Software",
  "Network",
];

const relatedSystems = [
  { name: "Corporate Laptop", categoryName: "Hardware" },
  { name: "Campus Wi-Fi", categoryName: "Network" },
  { name: "VPN", categoryName: "Network" },
  { name: "Email", categoryName: "Account and Access" },
  { name: "LEB2 App", categoryName: "Software" },
  { name: "Grade Submission App", categoryName: "Software" },
];

const requesters = [
  {
    fullName: "Sarah Connor",
    email: "sarah.connor@toktickit.com",
    department: "Engineering",
    isActive: true,
  },
  {
    fullName: "John Doe",
    email: "john.doe@toktickit.com",
    department: "Finance",
    isActive: true,
  },
  {
    fullName: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.com",
    department: "Engineering",
    isActive: true,
  },
  {
    fullName: "Michael Brown",
    email: "michael.brown@toktickit.com",
    department: "Marketing",
    isActive: true,
  },
  {
    fullName: "Kyle Reese",
    email: "kyle.reese@toktickit.com",
    department: "Operations",
    isActive: false,
  },
];

async function main() {
  const prisma = getPrisma();

  // 1. Seed Categories idempotently
  const categoryMap = new Map<string, number>();
  for (const name of categories) {
    const record = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryMap.set(name, record.id);
  }
  console.log("Successfully seeded categories:", categories.join(", "));

  // 2. Seed Related Systems idempotently
  for (const sys of relatedSystems) {
    const categoryId = categoryMap.get(sys.categoryName);
    if (!categoryId) {
      throw new Error(`Category not found for system ${sys.name}: ${sys.categoryName}`);
    }
    await prisma.relatedSystem.upsert({
      where: {
        name_categoryId: {
          name: sys.name,
          categoryId,
        },
      },
      update: {},
      create: {
        name: sys.name,
        categoryId,
      },
    });
  }
  console.log("Successfully seeded related systems:", relatedSystems.map((s) => s.name).join(", "));

  // 3. Seed Requester Users idempotently
  for (const req of requesters) {
    await prisma.requesterUser.upsert({
      where: { email: req.email },
      update: {
        fullName: req.fullName,
        department: req.department,
        isActive: req.isActive,
      },
      create: {
        email: req.email,
        fullName: req.fullName,
        department: req.department,
        isActive: req.isActive,
      },
    });
  }
  console.log("Successfully seeded requester users:", requesters.map((r) => r.fullName).join(", "));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
