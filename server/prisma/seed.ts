import { getPrisma } from "../src/prisma.js";
import { Priority, TicketStatus } from "@prisma/client";

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

  // 4. Seed Realistic Tickets for Jennifer Anderson (Pagination & Filter testing)
  const jennifer = await prisma.requesterUser.findUnique({
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
        summary: "VPN client crashes on macOS Sequoia during login",
        description: "Whenever I click connect on the corporate VPN client after entering 2FA, the application terminates abruptly.",
        priority: Priority.P0_URGENT,
        status: TicketStatus.NEW,
        categoryId: netCat!,
        relatedSystemId: vpn?.id,
        createdAt: new Date("2026-02-05T14:20:00Z"),
      },
      {
        ticketNo: "TKT-2026-00004",
        summary: "Email password reset link expired prematurely",
        description: "Requested an email password reset, but the link indicated expired within 2 minutes instead of 24 hours.",
        priority: Priority.P1_HIGH,
        status: TicketStatus.RESOLVED,
        categoryId: accCat!,
        relatedSystemId: email?.id,
        createdAt: new Date("2026-02-07T08:45:00Z"),
      },
      {
        ticketNo: "TKT-2026-00005",
        summary: "LEB2 App session timeout is too short during lecture",
        description: "The platform logs out after only 10 minutes of inactivity while presenting slides to students.",
        priority: Priority.P3_LOW,
        status: TicketStatus.NEW,
        categoryId: swCat!,
        relatedSystemId: leb2?.id,
        createdAt: new Date("2026-02-09T11:00:00Z"),
      },
      {
        ticketNo: "TKT-2026-00006",
        summary: "Grade Submission App returns 500 error when uploading CSV",
        description: "Uploading the midterm grade spreadsheet results in an internal server error response with HTTP 500.",
        priority: Priority.P0_URGENT,
        status: TicketStatus.IN_PROGRESS,
        categoryId: swCat!,
        relatedSystemId: grade?.id,
        createdAt: new Date("2026-02-11T16:15:00Z"),
      },
      {
        ticketNo: "TKT-2026-00007",
        summary: "Second monitor not detected via USB-C dock",
        description: "DisplayPort over USB-C dock only powers the laptop but does not output video signal to Dell monitor.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.RESOLVED,
        categoryId: hwCat!,
        relatedSystemId: laptop?.id,
        createdAt: new Date("2026-02-13T13:00:00Z"),
      },
      {
        ticketNo: "TKT-2026-00008",
        summary: "Request access to Engineering Git repository",
        description: "Need read/write permission to the department curriculum repository for course material updates.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.IN_PROGRESS,
        categoryId: accCat!,
        relatedSystemId: email?.id,
        createdAt: new Date("2026-02-15T09:00:00Z"),
      },
      {
        ticketNo: "TKT-2026-00009",
        summary: "Slow Wi-Fi speed during peak hours in Library",
        description: "Bandwidth drops below 1 Mbps between 1 PM and 3 PM in the quiet study zone.",
        priority: Priority.P3_LOW,
        status: TicketStatus.RESOLVED,
        categoryId: netCat!,
        relatedSystemId: wifi?.id,
        createdAt: new Date("2026-02-17T15:40:00Z"),
      },
      {
        ticketNo: "TKT-2026-00010",
        summary: "Request 16GB RAM upgrade for development workstation",
        description: "Local Docker containers and IDE require more memory than current 8GB allocation.",
        priority: Priority.P1_HIGH,
        status: TicketStatus.NEW,
        categoryId: hwCat!,
        relatedSystemId: laptop?.id,
        createdAt: new Date("2026-02-19T10:10:00Z"),
      },
      {
        ticketNo: "TKT-2026-00011",
        summary: "Cannot access staging server via VPN",
        description: "Route to 10.20.0.0/16 is not resolving after the latest firewall policy update.",
        priority: Priority.P1_HIGH,
        status: TicketStatus.IN_PROGRESS,
        categoryId: netCat!,
        relatedSystemId: vpn?.id,
        createdAt: new Date("2026-02-21T14:50:00Z"),
      },
      {
        ticketNo: "TKT-2026-00012",
        summary: "LEB2 App quiz submission button disabled unexpectedly",
        description: "Students report the submit quiz button remained disabled even after answering all required questions.",
        priority: Priority.P0_URGENT,
        status: TicketStatus.RESOLVED,
        categoryId: swCat!,
        relatedSystemId: leb2?.id,
        createdAt: new Date("2026-02-23T11:25:00Z"),
      },
      {
        ticketNo: "TKT-2026-00013",
        summary: "Outlook 365 2FA prompt looping repeatedly",
        description: "Microsoft Authenticator approval succeeds on phone but desktop client continues prompting for approval.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.NEW,
        categoryId: accCat!,
        relatedSystemId: email?.id,
        createdAt: new Date("2026-02-25T08:30:00Z"),
      },
      {
        ticketNo: "TKT-2026-00014",
        summary: "Laptop battery draining abnormally fast",
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
          priority: t.priority,
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
          priority: t.priority,
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

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
