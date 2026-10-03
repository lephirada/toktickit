import { getPrisma } from "../src/prisma.js";
import { Priority, TicketStatus, UserRole } from "@prisma/client";

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

// Valid bcrypt hashes
const DEFAULT_USER_PASSWORD_HASH = "$2b$10$Darja.Q6FT2ivIiXVxb0V.S96Mw20uhnhV.UkhZVw7Jm91AWU5h4q"; // Password123!
const DEFAULT_ADMIN_PASSWORD_HASH = "$2b$10$hhvJQ/PscgLmJlO7QmjIAeunskBAUnUZt/4.hMQ0FOeGWMmxMww7K"; // Admin123!

const seedUsers = [
  // 5 Preserved Requesters (IDs 1-5)
  {
    fullName: "Sarah Connor",
    email: "sarah.connor@toktickit.com",
    department: "Engineering",
    role: UserRole.REQUESTER,
    isActive: true,
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    mustChangePassword: true, // FR-03 & E2E Step 6: forced first-login password change
  },
  {
    fullName: "John Doe",
    email: "john.doe@toktickit.com",
    department: "Finance",
    role: UserRole.REQUESTER,
    isActive: true,
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    mustChangePassword: false,
  },
  {
    fullName: "Jennifer Anderson",
    email: "jennifer.anderson@toktickit.com",
    department: "Engineering",
    role: UserRole.REQUESTER,
    isActive: true,
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    mustChangePassword: false,
  },
  {
    fullName: "Michael Brown",
    email: "michael.brown@toktickit.com",
    department: "Marketing",
    role: UserRole.REQUESTER,
    isActive: true,
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    mustChangePassword: false,
  },
  {
    fullName: "Kyle Reese",
    email: "kyle.reese@toktickit.com",
    department: "Operations",
    role: UserRole.REQUESTER,
    isActive: false, // Inactive requester
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    mustChangePassword: false,
  },

  // 4 IT Staff (IDs 6-9)
  {
    fullName: "David Lee",
    email: "david.lee@toktickit.com",
    department: "IT Support",
    role: UserRole.IT_STAFF,
    isActive: true,
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    mustChangePassword: false,
  },
  {
    fullName: "Alex Morgan",
    email: "alex.morgan@toktickit.com",
    department: "Infrastructure",
    role: UserRole.IT_STAFF,
    isActive: true,
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    mustChangePassword: false,
  },
  {
    fullName: "Chris Taylor",
    email: "chris.taylor@toktickit.com",
    department: "IT Support",
    role: UserRole.IT_STAFF,
    isActive: true,
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    mustChangePassword: false,
  },
  {
    fullName: "Kevin Patel",
    email: "kevin.patel@toktickit.com",
    department: "Helpdesk",
    role: UserRole.IT_STAFF,
    isActive: false, // Inactive IT Staff (AC-15-05 & AC-16-08 assignment guardrail)
    passwordHash: DEFAULT_USER_PASSWORD_HASH,
    mustChangePassword: false,
  },

  // 1 Administrator (ID 10)
  {
    fullName: "System Admin",
    email: "admin@toktickit.com",
    department: "IT Administration",
    role: UserRole.ADMINISTRATOR,
    isActive: true,
    passwordHash: DEFAULT_ADMIN_PASSWORD_HASH,
    mustChangePassword: true, // Reviewer Record (PR #43) & FR-03
  },
];

export async function seedDatabase() {
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

  // 3. Seed Users idempotently (AC-11-05 & AC-11-08: NEVER overwrite modified password credentials)
  const LEGACY_HASHES = [
    "$2b$10$epR.zIe6lO2vE9tK4x8GkOCsM4.W1YI2fT1J2V9q8J5B9X9b1w7y2",
    "$2b$10$ZpI3K7v2Y5n.u0e1G3h5QOKsR3.X1YI2fT1J2V9q8J5B9X9b1w7y2",
  ];

  for (const u of seedUsers) {
    const existing = await prisma.user.findUnique({ where: { email: u.email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          email: u.email,
          fullName: u.fullName,
          department: u.department,
          role: u.role,
          isActive: u.isActive,
          passwordHash: u.passwordHash,
          mustChangePassword: u.mustChangePassword,
        },
      });
    } else {
      const isLegacyHash = LEGACY_HASHES.includes(existing.passwordHash);
      await prisma.user.update({
        where: { email: u.email },
        data: {
          fullName: u.fullName,
          department: u.department,
          role: u.role,
          isActive: u.isActive,
          ...(isLegacyHash ? { passwordHash: u.passwordHash } : {}),
        },
      });
    }
  }
  console.log("Successfully seeded 10 users:", seedUsers.map((u) => u.fullName).join(", "));

  // 4. Seed Realistic Tickets for Jennifer Anderson (Pagination & Filter testing)
  const jennifer = await prisma.user.findUnique({
    where: { email: "jennifer.anderson@toktickit.com" },
  });

  if (jennifer) {
    const hwCat = categoryMap.get("Hardware");
    const netCat = categoryMap.get("Network");
    const swCat = categoryMap.get("Software");
    const accCat = categoryMap.get("Account and Access");

    // Fetch related systems
    const laptop = await prisma.relatedSystem.findFirst({ where: { name: "Corporate Laptop" } });
    const wifi = await prisma.relatedSystem.findFirst({ where: { name: "Campus Wi-Fi" } });
    const vpn = await prisma.relatedSystem.findFirst({ where: { name: "VPN" } });
    const email = await prisma.relatedSystem.findFirst({ where: { name: "Email" } });
    const leb2 = await prisma.relatedSystem.findFirst({ where: { name: "LEB2 App" } });
    const grade = await prisma.relatedSystem.findFirst({ where: { name: "Grade Submission App" } });

    const seedTickets = [
      {
        ticketNo: "TKT-2026-00001",
        summary: "MacBook Pro keyboard key sticking intermittently",
        description: "The spacebar and E key on my corporate laptop occasionally register double keypresses or fail to actuate.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.RESOLVED,
        categoryId: hwCat!,
        relatedSystemId: laptop?.id,
        createdAt: new Date("2026-02-01T09:15:00Z"),
      },
      {
        ticketNo: "TKT-2026-00002",
        summary: "Cannot connect to Campus Wi-Fi in Building 3",
        description: "My devices keep disconnecting from the eduroam / campus Wi-Fi network when moving to lecture room 302.",
        priority: Priority.P1_HIGH,
        status: TicketStatus.IN_PROGRESS,
        categoryId: netCat!,
        relatedSystemId: wifi?.id,
        createdAt: new Date("2026-02-03T10:30:00Z"),
      },
      {
        ticketNo: "TKT-2026-00003",
        summary: "VPN authentication failure with valid credentials",
        description: "FortiClient VPN client returns authentication failed error even after verifying active directory password.",
        priority: Priority.P0_URGENT,
        status: TicketStatus.NEW,
        categoryId: netCat!,
        relatedSystemId: vpn?.id,
        createdAt: new Date("2026-02-05T08:00:00Z"),
      },
      {
        ticketNo: "TKT-2026-00004",
        summary: "Corporate email quota exceeded notification",
        description: "Exchange mailbox storage warning at 98% capacity. Need temporary increase or archive assistance.",
        priority: Priority.P3_LOW,
        status: TicketStatus.CLOSED,
        categoryId: accCat!,
        relatedSystemId: email?.id,
        createdAt: new Date("2026-02-07T14:20:00Z"),
      },
      {
        ticketNo: "TKT-2026-00005",
        summary: "External monitor not detected via USB-C dock",
        description: "Dell U2720Q display shows no signal when connected through standard CalDigit USB-C docking station.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        categoryId: hwCat!,
        relatedSystemId: laptop?.id,
        createdAt: new Date("2026-02-10T11:00:00Z"),
      },
      {
        ticketNo: "TKT-2026-00006",
        summary: "LEB2 App crashes when submitting assignment PDF",
        description: "Uploading any PDF file larger than 10MB in the assignment submission portal triggers an unhandled React runtime error.",
        priority: Priority.P1_HIGH,
        status: TicketStatus.OPEN,
        categoryId: swCat!,
        relatedSystemId: leb2?.id,
        createdAt: new Date("2026-02-12T16:45:00Z"),
      },
      {
        ticketNo: "TKT-2026-00007",
        summary: "Grade Submission App session expires prematurely",
        description: "The faculty grade portal logs users out after exactly 3 minutes of idle time, losing unsaved grade entries.",
        priority: Priority.P1_HIGH,
        status: TicketStatus.WAITING_FOR_REQUESTER,
        categoryId: swCat!,
        relatedSystemId: grade?.id,
        createdAt: new Date("2026-02-14T09:00:00Z"),
      },
      {
        ticketNo: "TKT-2026-00008",
        summary: "Slow internet throughput on Library 4th floor",
        description: "Speedtest measures less than 1.5 Mbps downstream in the quiet study zone during peak afternoon hours.",
        priority: Priority.P3_LOW,
        status: TicketStatus.RESOLVED,
        categoryId: netCat!,
        relatedSystemId: wifi?.id,
        createdAt: new Date("2026-02-16T13:30:00Z"),
      },
      {
        ticketNo: "TKT-2026-00009",
        summary: "Reset 2FA token for corporate single sign-on",
        description: "Replaced personal phone and lost access to Microsoft Authenticator TOTP codes for corporate SSO login.",
        priority: Priority.P0_URGENT,
        status: TicketStatus.CLOSED,
        categoryId: accCat!,
        relatedSystemId: email?.id,
        createdAt: new Date("2026-02-18T08:30:00Z"),
      },
      {
        ticketNo: "TKT-2026-00010",
        summary: "Request license for JetBrains All Products Pack",
        description: "Software engineering course instructor requires upgraded JetBrains suite license for Spring semester projects.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.NEW,
        categoryId: swCat!,
        relatedSystemId: null,
        createdAt: new Date("2026-02-20T10:15:00Z"),
      },
      {
        ticketNo: "TKT-2026-00011",
        summary: "Laptop fan noise excessive during video calls",
        description: "Cooling fans spin up to maximum RPM immediately upon joining Zoom or Google Meet meetings.",
        priority: Priority.P3_LOW,
        status: TicketStatus.IN_PROGRESS,
        categoryId: hwCat!,
        relatedSystemId: laptop?.id,
        createdAt: new Date("2026-02-22T15:00:00Z"),
      },
      {
        ticketNo: "TKT-2026-00012",
        summary: "DNS resolution failure for internal git server",
        description: "Unable to clone or fetch from gitlab.internal.toktickit.com; nslookup reports server failure.",
        priority: Priority.P0_URGENT,
        status: TicketStatus.RESOLVED,
        categoryId: netCat!,
        relatedSystemId: null,
        createdAt: new Date("2026-02-24T09:30:00Z"),
      },
      {
        ticketNo: "TKT-2026-00013",
        summary: "Request shared mailbox access for admissions committee",
        description: "Need delegate access permissions for admissions-inquiries@toktickit.com for newly onboarded staff.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.CANCELLED,
        categoryId: accCat!,
        relatedSystemId: email?.id,
        createdAt: new Date("2026-02-25T11:20:00Z"),
      },
      {
        ticketNo: "TKT-2026-00014",
        summary: "Laptop battery drains rapidly while in sleep mode",
        description: "Battery health indicator reports 65% capacity and device drains from 100% to 10% in under 90 minutes.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        categoryId: hwCat!,
        relatedSystemId: laptop?.id,
        createdAt: new Date("2026-02-27T16:00:00Z"),
      },
      {
        ticketNo: "TKT-2026-00015",
        summary: "Grade Submission App missing semester selection option",
        description: "The dropdown for selecting Semester 2 / 2025 is absent from the instructor portal view.",
        priority: Priority.P1_HIGH,
        status: TicketStatus.RESOLVED,
        categoryId: swCat!,
        relatedSystemId: grade?.id,
        createdAt: new Date("2026-03-01T09:45:00Z"),
      },
      {
        ticketNo: "TKT-2026-00016",
        summary: "Need guest Wi-Fi access voucher for visiting lecturer",
        description: "Visiting keynote speaker requires guest network access credentials for the upcoming AI seminar.",
        priority: Priority.P3_LOW,
        status: TicketStatus.NEW,
        categoryId: netCat!,
        relatedSystemId: wifi?.id,
        createdAt: new Date("2026-03-03T10:00:00Z"),
      },
    ];

    for (const t of seedTickets) {
      await prisma.ticket.upsert({
        where: { ticketNo: t.ticketNo },
        update: {
          summary: t.summary,
          description: t.description,
          requestedPriority: t.priority,
          status: t.status,
          categoryId: t.categoryId,
          relatedSystemId: t.relatedSystemId,
          requesterId: jennifer.id,
          createdAt: t.createdAt,
        },
        create: {
          ticketNo: t.ticketNo,
          summary: t.summary,
          description: t.description,
          requestedPriority: t.priority,
          status: t.status,
          categoryId: t.categoryId,
          relatedSystemId: t.relatedSystemId,
          requesterId: jennifer.id,
          createdAt: t.createdAt,
        },
      });
    }
    console.log(`Successfully seeded ${seedTickets.length} realistic tickets for Jennifer Anderson.`);
  }
}

async function main() {
  await seedDatabase();
}

if (process.argv[1]?.endsWith("seed.ts")) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await getPrisma().$disconnect();
    });
}
