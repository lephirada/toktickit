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

    // Fetch IT Staff performers
    const david = await prisma.user.findUnique({ where: { email: "david.lee@toktickit.com" } });
    const alex = await prisma.user.findUnique({ where: { email: "alex.morgan@toktickit.com" } });
    const chris = await prisma.user.findUnique({ where: { email: "chris.taylor@toktickit.com" } });

    const seedTickets = [
      {
        ticketNo: "TKT-2026-00001",
        summary: "MacBook Pro keyboard key sticking intermittently",
        description: "The spacebar and E key on my corporate laptop occasionally register double keypresses or fail to actuate.",
        priority: Priority.P2_MEDIUM,
        status: TicketStatus.RESOLVED,
        categoryId: hwCat!,
        relatedSystemId: laptop?.id,
        ownerId: david?.id,
        resolutionSummary: "Replaced membrane switch under spacebar and verified key actuation.",
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
        ownerId: chris?.id,
        resolutionSummary: null,
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
        ownerId: null,
        resolutionSummary: null,
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
        ownerId: alex?.id,
        resolutionSummary: "Archived older email items to cloud archive; mailbox utilization normalized.",
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
        ownerId: david?.id,
        resolutionSummary: null,
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
        ownerId: null,
        resolutionSummary: null,
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
        ownerId: chris?.id,
        resolutionSummary: null,
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
        ownerId: chris?.id,
        resolutionSummary: "Adjusted 5GHz channel width to 40MHz, mitigating co-channel interference.",
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
        ownerId: alex?.id,
        resolutionSummary: "Identity verified in-person; new TOTP seed provisioned and confirmed.",
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
        ownerId: null,
        resolutionSummary: null,
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
        ownerId: david?.id,
        resolutionSummary: null,
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
        ownerId: alex?.id,
        resolutionSummary: "Cleared stale DNS cache on BIND nameserver and verified record resolution.",
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
        ownerId: null,
        resolutionSummary: null,
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
        ownerId: david?.id,
        resolutionSummary: null,
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
        ownerId: alex?.id,
        resolutionSummary: "Added Semester 2 / 2025 to term configuration table and verified dropdown.",
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
        ownerId: null,
        resolutionSummary: null,
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
          ownerId: t.ownerId ?? null,
          resolutionSummary: t.resolutionSummary ?? null,
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
          ownerId: t.ownerId ?? null,
          resolutionSummary: t.resolutionSummary ?? null,
          requesterId: jennifer.id,
          createdAt: t.createdAt,
        },
      });
    }
    console.log(`Successfully seeded ${seedTickets.length} realistic tickets for Jennifer Anderson.`);

    // 5. Seed Actions Taken idempotently (Issue 19)
    if (david && alex && chris) {
      // Ensure ActionTaken table exists in the database schema before attempting to seed actions.
      // If migrations have not been run, fail explicitly to prevent false positive seed success.
      const tableCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'ActionTaken'
        );
      `);

      if (!tableCheck[0]?.exists) {
        // In legacy migration test suites (e.g. Lab 3 isolated DB), ActionTaken migration has intentionally not been applied.
        // Allow legacy migration test suite to proceed without failing.
        if (process.env.DATABASE_URL?.includes("toktickit_migration_vitest")) {
          console.warn("Table ActionTaken does not exist in legacy migration test DB; skipping action seeding.");
          return;
        }

        throw new Error(
          "Table 'ActionTaken' does not exist in the public schema. Please apply the migration ('npx prisma migrate deploy' or 'dev') before running db:seed."
        );
      }

      const ticketRecords = await prisma.ticket.findMany({
        where: {
          ticketNo: {
            in: seedTickets.map((t) => t.ticketNo),
          },
        },
      });
      const ticketMap = new Map(ticketRecords.map((t) => [t.ticketNo, t.id]));

      const seedActions = [
        // TKT-2026-00001 (RESOLVED): 2 actions
        {
          ticketNo: "TKT-2026-00001",
          performerId: david.id,
          actionDateTime: new Date("2026-02-01T10:00:00Z"),
          description: "Inspected physical keyboard switch mechanisms; found debris under spacebar and keycap.",
          actionType: "INVESTIGATION",
          result: "Confirmed particulate blockage obstructing key actuation switch.",
          timeSpentMinutes: 20,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
        {
          ticketNo: "TKT-2026-00001",
          performerId: david.id,
          actionDateTime: new Date("2026-02-01T11:15:00Z"),
          description: "Cleaned switch socket with isopropyl alcohol and replaced membrane keycap; verified 100 keystrokes.",
          actionType: "REPAIR",
          result: "Key actuation returned to nominal pressure curve with zero double-presses.",
          timeSpentMinutes: 40,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: "Hardware diagnostic log attached to ticket.",
        },

        // TKT-2026-00002 (IN_PROGRESS): 3 actions
        {
          ticketNo: "TKT-2026-00002",
          performerId: chris.id,
          actionDateTime: new Date("2026-02-03T11:00:00Z"),
          description: "Conducted RF site survey in Building 3 Room 302; verified signal attenuation down to -82 dBm.",
          actionType: "INVESTIGATION",
          result: "Identified degraded transmit power on ceiling AP-302.",
          timeSpentMinutes: 45,
          followUpRequired: true,
          followUpNote: "Requires replacement PoE injector from central hardware stock.",
          attachmentNotes: "Heatmap scan saved to network share.",
        },
        {
          ticketNo: "TKT-2026-00002",
          performerId: alex.id,
          actionDateTime: new Date("2026-02-03T14:30:00Z"),
          description: "Replaced 802.3at PoE injector on distribution switch port 14.",
          actionType: "REPAIR",
          result: "AP-302 rebooted and negotiated full 30W power profile.",
          timeSpentMinutes: 35,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
        {
          ticketNo: "TKT-2026-00002",
          performerId: chris.id,
          actionDateTime: new Date("2026-02-03T16:00:00Z"),
          description: "Ran continuous iperf throughput test across 5 dual-band client devices; verified 95 Mbps throughput.",
          actionType: "CONFIGURATION",
          result: "Stable connection established with zero packet loss over 30 minutes.",
          timeSpentMinutes: 30,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },

        // TKT-2026-00004 (CLOSED): 1 action
        {
          ticketNo: "TKT-2026-00004",
          performerId: alex.id,
          actionDateTime: new Date("2026-02-07T15:00:00Z"),
          description: "Archived calendar items and attachments older than 2 years to secondary retention storage.",
          actionType: "MAINTENANCE",
          result: "Mailbox size reduced from 49.2 GB to 28.4 GB (56% capacity).",
          timeSpentMinutes: 45,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },

        // TKT-2026-00005 (IN_PROGRESS): 2 actions
        {
          ticketNo: "TKT-2026-00005",
          performerId: david.id,
          actionDateTime: new Date("2026-02-10T13:00:00Z"),
          description: "Updated DisplayLink docking station firmware to v1.10 and rebooted host controller.",
          actionType: "CONFIGURATION",
          result: "Firmware flashed successfully; external monitor handshake established.",
          timeSpentMinutes: 30,
          followUpRequired: true,
          followUpNote: "Monitor for recurrence over the next 48 hours.",
          attachmentNotes: null,
        },
        {
          ticketNo: "TKT-2026-00005",
          performerId: david.id,
          actionDateTime: new Date("2026-02-11T09:30:00Z"),
          description: "Swapped Thunderbolt 3 patch cable and re-verified 4K 60Hz display output.",
          actionType: "REPAIR",
          result: "Signal lock maintained continuously without flicker.",
          timeSpentMinutes: 25,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },

        // TKT-2026-00006 (OPEN, Unassigned): 1 action
        {
          ticketNo: "TKT-2026-00006",
          performerId: alex.id,
          actionDateTime: new Date("2026-02-12T17:15:00Z"),
          description: "Replicated crash with 12MB test PDF in staging environment; stack trace captured in error boundary.",
          actionType: "INVESTIGATION",
          result: "Confirmed unhandled memory exception during PDF preview canvas generation.",
          timeSpentMinutes: 25,
          followUpRequired: true,
          followUpNote: "Forward stack trace to core frontend dev team for patch.",
          attachmentNotes: "stacktrace-leb2-pdf.log",
        },

        // TKT-2026-00007 (WAITING_FOR_REQUESTER): 1 action
        {
          ticketNo: "TKT-2026-00007",
          performerId: chris.id,
          actionDateTime: new Date("2026-02-14T10:30:00Z"),
          description: "Contacted faculty portal vendor for session timeout configuration parameters and session keepalive specs.",
          actionType: "CLIENT_COMM",
          result: "Vendor confirmed 15-minute token refresh patch will be deployed this weekend.",
          timeSpentMinutes: 20,
          followUpRequired: true,
          followUpNote: "Follow up on Monday after vendor patch deployment.",
          attachmentNotes: null,
        },

        // TKT-2026-00008 (RESOLVED): 2 actions
        {
          ticketNo: "TKT-2026-00008",
          performerId: chris.id,
          actionDateTime: new Date("2026-02-16T14:45:00Z"),
          description: "Adjusted channel width from 80MHz to 40MHz on 5GHz band to mitigate co-channel interference.",
          actionType: "CONFIGURATION",
          result: "Channel utilization dropped from 88% to 32%.",
          timeSpentMinutes: 30,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
        {
          ticketNo: "TKT-2026-00008",
          performerId: chris.id,
          actionDateTime: new Date("2026-02-16T15:30:00Z"),
          description: "Ran multi-client speedtests across Library 4th floor carrels; sustained downstream average 85 Mbps.",
          actionType: "INVESTIGATION",
          result: "Throughput restored to standard service level agreement.",
          timeSpentMinutes: 20,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },

        // TKT-2026-00011 (IN_PROGRESS): 1 action
        {
          ticketNo: "TKT-2026-00011",
          performerId: david.id,
          actionDateTime: new Date("2026-02-22T16:00:00Z"),
          description: "Cleaned dust accumulation from heatsink fin stack and thermal exhaust vents using compressed air.",
          actionType: "MAINTENANCE",
          result: "CPU idle temperature reduced from 68C to 44C; fan speed nominal.",
          timeSpentMinutes: 30,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },

        // TKT-2026-00012 (RESOLVED): 2 actions
        {
          ticketNo: "TKT-2026-00012",
          performerId: alex.id,
          actionDateTime: new Date("2026-02-24T10:00:00Z"),
          description: "Flushed DNS cache on internal BIND nameserver and restarted named daemon.",
          actionType: "CONFIGURATION",
          result: "Stale authoritative record cleared; cache flushed successfully.",
          timeSpentMinutes: 15,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
        {
          ticketNo: "TKT-2026-00012",
          performerId: alex.id,
          actionDateTime: new Date("2026-02-24T10:30:00Z"),
          description: "Verified forward and reverse DNS resolution for gitlab.internal.toktickit.com across all internal subnets.",
          actionType: "INVESTIGATION",
          result: "Resolution response time under 2ms with zero lookup errors.",
          timeSpentMinutes: 20,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },

        // TKT-2026-00014 (IN_PROGRESS): 2 actions
        {
          ticketNo: "TKT-2026-00014",
          performerId: david.id,
          actionDateTime: new Date("2026-02-27T17:00:00Z"),
          description: "Ran Apple Diagnostics battery test; verified cycle count at 1,140 with service recommended status.",
          actionType: "INVESTIGATION",
          result: "Full charge capacity at 64% of design capacity; battery replacement warranted.",
          timeSpentMinutes: 30,
          followUpRequired: true,
          followUpNote: "Order replacement battery module part #A2171.",
          attachmentNotes: null,
        },
        {
          ticketNo: "TKT-2026-00014",
          performerId: david.id,
          actionDateTime: new Date("2026-02-28T10:00:00Z"),
          description: "Submitted procurement order for battery replacement unit and initiated local Time Machine backup.",
          actionType: "REPAIR",
          result: "PO #PR-8821 confirmed; backup completed to encrypted external volume.",
          timeSpentMinutes: 35,
          followUpRequired: true,
          followUpNote: "Install battery upon delivery next Tuesday.",
          attachmentNotes: null,
        },

        // TKT-2026-00015 (RESOLVED): 2 actions
        {
          ticketNo: "TKT-2026-00015",
          performerId: alex.id,
          actionDateTime: new Date("2026-03-01T11:00:00Z"),
          description: "Updated term configuration lookup table in PostgreSQL database to register Semester 2 / 2025.",
          actionType: "CONFIGURATION",
          result: "Term record active and queryable by grade application services.",
          timeSpentMinutes: 30,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
        {
          ticketNo: "TKT-2026-00015",
          performerId: alex.id,
          actionDateTime: new Date("2026-03-01T11:45:00Z"),
          description: "Validated semester selector dropdown rendering and grade submission form in staging environment.",
          actionType: "INVESTIGATION",
          result: "Term displays correctly in UI; mock grade batch submitted successfully.",
          timeSpentMinutes: 15,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
        },
      ];

      for (const a of seedActions) {
        const ticketId = ticketMap.get(a.ticketNo);
        if (!ticketId) continue;

        const existingAction = await prisma.actionTaken.findFirst({
          where: {
            ticketId,
            description: a.description,
          },
        });

        const actionData = {
          ticketId,
          performedById: a.performerId,
          actionDateTime: a.actionDateTime,
          performedAt: a.actionDateTime,
          description: a.description,
          actionType: a.actionType,
          result: a.result,
          timeSpentMinutes: a.timeSpentMinutes,
          followUpRequired: a.followUpRequired,
          followUpNote: a.followUpNote,
          attachmentNotes: a.attachmentNotes,
        };

        if (!existingAction) {
          await prisma.actionTaken.create({
            data: actionData,
          });
        } else {
          await prisma.actionTaken.update({
            where: { id: existingAction.id },
            data: actionData,
          });
        }
      }
      console.log(`Successfully seeded ${seedActions.length} realistic actions taken across assigned and unassigned tickets.`);
    }
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
