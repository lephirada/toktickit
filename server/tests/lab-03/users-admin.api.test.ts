import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";
import { createTestSessionCookie } from "../helpers/auth.js";
import { hashPassword, verifyPassword } from "../../src/utils/password.js";
import { Priority, TicketStatus, UserRole } from "@prisma/client";

describe("Issue 16 — Administrator User Management API Suite (users-admin.api.test.ts)", () => {
  const prisma = getPrisma();

  const createdUserIds: number[] = [];
  const createdTicketIds: number[] = [];

  let adminA: any;
  let adminB: any;
  let staffUser: any;
  let requesterUser: any;
  let inactiveAdminUser: any;
  let mustChangePasswordAdminUser: any;

  let cookieAdminA: string;
  let cookieAdminB: string;
  let cookieStaff: string;
  let cookieRequester: string;
  let cookieInactiveAdmin: string;
  let cookieMustChangeAdmin: string;

  beforeAll(async () => {
    const defaultPassword = "AdminTestPassword123!";
    const dummyHash = await hashPassword(defaultPassword);
    const now = Date.now();

    // 1. Create test admin personas
    adminA = await prisma.user.create({
      data: {
        email: `admin_a_${now}@toktickit.com`,
        fullName: "Primary Test Admin",
        role: UserRole.ADMINISTRATOR,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(adminA.id);
    cookieAdminA = createTestSessionCookie(adminA);

    adminB = await prisma.user.create({
      data: {
        email: `admin_b_${now}@toktickit.com`,
        fullName: "Secondary Test Admin",
        role: UserRole.ADMINISTRATOR,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(adminB.id);
    cookieAdminB = createTestSessionCookie(adminB);

    staffUser = await prisma.user.create({
      data: {
        email: `admin_staff_${now}@toktickit.com`,
        fullName: "Standard IT Staff",
        role: UserRole.IT_STAFF,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(staffUser.id);
    cookieStaff = createTestSessionCookie(staffUser);

    requesterUser = await prisma.user.findFirstOrThrow({
      where: { email: "john.doe@toktickit.com" },
    });
    cookieRequester = createTestSessionCookie(requesterUser);

    inactiveAdminUser = await prisma.user.create({
      data: {
        email: `admin_inactive_${now}@toktickit.com`,
        fullName: "Inactive Admin",
        role: UserRole.ADMINISTRATOR,
        passwordHash: dummyHash,
        isActive: false,
        mustChangePassword: false,
      },
    });
    createdUserIds.push(inactiveAdminUser.id);
    cookieInactiveAdmin = createTestSessionCookie(inactiveAdminUser);

    mustChangePasswordAdminUser = await prisma.user.create({
      data: {
        email: `admin_mustchange_${now}@toktickit.com`,
        fullName: "Must Change Password Admin",
        role: UserRole.ADMINISTRATOR,
        passwordHash: dummyHash,
        isActive: true,
        mustChangePassword: true,
      },
    });
    createdUserIds.push(mustChangePasswordAdminUser.id);
    cookieMustChangeAdmin = createTestSessionCookie(mustChangePasswordAdminUser);
  });

  afterAll(async () => {
    if (createdTicketIds.length > 0) {
      await prisma.ticketActivity.deleteMany({ where: { ticketId: { in: createdTicketIds } } });
      await prisma.ticket.deleteMany({ where: { id: { in: createdTicketIds } } });
    }
    if (createdUserIds.length > 0) {
      await prisma.ticketActivity.deleteMany({ where: { actorId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
  });

  // ==========================================
  // 1. RBAC & Authentication Matrix
  // ==========================================
  describe("1. RBAC & Authentication Enforcement", () => {
    it("AC-16-01: returns 200 for active ADMINISTRATOR on GET /api/admin/users", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookieAdminA);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("AC-16-01: returns 403 FORBIDDEN_ROLE for IT_STAFF", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookieStaff);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("AC-16-01: returns 403 FORBIDDEN_ROLE for REQUESTER", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookieRequester);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN_ROLE");
    });

    it("AC-16-01: returns 401 UNAUTHORIZED when no session cookie is provided", async () => {
      const res = await request(app).get("/api/admin/users");

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("AC-16-01: returns 401 ACCOUNT_DEACTIVATED for deactivated admin session", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookieInactiveAdmin);

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("ACCOUNT_DEACTIVATED");
    });

    it("AC-16-01: returns 403 PASSWORD_CHANGE_REQUIRED for admin with mustChangePassword=true", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookieMustChangeAdmin);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });
  });

  // ==========================================
  // 2. GET /api/admin/users Listing & Filtering
  // ==========================================
  describe("2. GET /api/admin/users (Listing, Filters, Projection)", () => {
    it("AC-16-02: returns required fields without passwordHash", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookieAdminA);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);

      const user = res.body.data.find((u: any) => u.id === adminA.id);
      expect(user).toBeDefined();
      expect(user).toHaveProperty("id");
      expect(user).toHaveProperty("fullName");
      expect(user).toHaveProperty("email");
      expect(user).toHaveProperty("role", "ADMINISTRATOR");
      expect(user).toHaveProperty("isActive", true);
      expect(user).toHaveProperty("mustChangePassword", false);
      expect(user).toHaveProperty("createdAt");
      expect(user).toHaveProperty("updatedAt");
      expect(user).not.toHaveProperty("passwordHash");
      expect(user).not.toHaveProperty("password");
    });

    it("AC-16-02: lists both active and inactive users", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookieAdminA);

      expect(res.status).toBe(200);
      const activeFound = res.body.data.some((u: any) => u.isActive === true);
      const inactiveFound = res.body.data.some((u: any) => u.isActive === false);
      expect(activeFound).toBe(true);
      expect(inactiveFound).toBe(true);
    });

    it("AC-16-02: filters by role accurately", async () => {
      const resStaff = await request(app)
        .get("/api/admin/users?role=IT_STAFF")
        .set("Cookie", cookieAdminA);

      expect(resStaff.status).toBe(200);
      expect(resStaff.body.data.every((u: any) => u.role === "IT_STAFF")).toBe(true);
      expect(resStaff.body.data.some((u: any) => u.id === staffUser.id)).toBe(true);

      const resAdmin = await request(app)
        .get("/api/admin/users?role=ADMINISTRATOR")
        .set("Cookie", cookieAdminA);

      expect(resAdmin.status).toBe(200);
      expect(resAdmin.body.data.every((u: any) => u.role === "ADMINISTRATOR")).toBe(true);

      const resReq = await request(app)
        .get("/api/admin/users?role=REQUESTER")
        .set("Cookie", cookieAdminA);

      expect(resReq.status).toBe(200);
      expect(resReq.body.data.every((u: any) => u.role === "REQUESTER")).toBe(true);
    });

    it("AC-16-02: returns 422 VALIDATION_ERROR for invalid role filter", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=SUPER_USER")
        .set("Cookie", cookieAdminA);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("AC-16-02: performs case-insensitive search by name and email", async () => {
      // Search by partial lower-case email
      const searchEmail = adminA.email.substring(0, 10).toLowerCase();
      const resEmail = await request(app)
        .get(`/api/admin/users?search=${searchEmail}`)
        .set("Cookie", cookieAdminA);

      expect(resEmail.status).toBe(200);
      expect(resEmail.body.data.some((u: any) => u.id === adminA.id)).toBe(true);

      // Search by upper-case name fragment
      const resName = await request(app)
        .get("/api/admin/users?search=PRIMARY")
        .set("Cookie", cookieAdminA);

      expect(resName.status).toBe(200);
      expect(resName.body.data.some((u: any) => u.id === adminA.id)).toBe(true);
    });
  });

  // ==========================================
  // 3. POST /api/admin/users (Creation)
  // ==========================================
  describe("3. POST /api/admin/users (Account Creation)", () => {
    it("AC-16-03: creates active account with mustChangePassword=true and returns projection without passwordHash", async () => {
      const newUserPayload = {
        fullName: "New Junior Tech",
        email: `new_tech_${Date.now()}@toktickit.com`,
        role: "IT_STAFF",
        initialPassword: "InitialSecurePassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", cookieAdminA)
        .send(newUserPayload);

      expect(res.status).toBe(201);
      if (res.body.data?.id) {
        createdUserIds.push(res.body.data.id);
      }
      expect(res.body.data).toBeDefined();
      expect(res.body.data.fullName).toBe(newUserPayload.fullName);
      expect(res.body.data.email).toBe(newUserPayload.email.toLowerCase());
      expect(res.body.data.role).toBe("IT_STAFF");
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.data.mustChangePassword).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data).not.toHaveProperty("passwordHash");

      // Verify DB state and password hash
      const dbUser = await prisma.user.findUnique({
        where: { id: res.body.data.id },
      });
      expect(dbUser).toBeDefined();
      expect(dbUser!.isActive).toBe(true);
      expect(dbUser!.mustChangePassword).toBe(true);
      expect(await verifyPassword(newUserPayload.initialPassword, dbUser!.passwordHash)).toBe(true);
    });

    it("AC-16-03: ignores isActive=false in POST body and creates user as active", async () => {
      const newUserPayload = {
        fullName: "Always Active User",
        email: `always_active_${Date.now()}@toktickit.com`,
        role: "IT_STAFF",
        initialPassword: "InitialSecurePassword123!",
        isActive: false, // attempt to create inactive user
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", cookieAdminA)
        .send(newUserPayload);

      expect(res.status).toBe(201);
      if (res.body.data?.id) {
        createdUserIds.push(res.body.data.id);
      }
      expect(res.body.data.isActive).toBe(true);

      const dbUser = await prisma.user.findUnique({
        where: { id: res.body.data.id },
      });
      expect(dbUser!.isActive).toBe(true);
    });

    it("AC-16-03: rejects duplicate email with 409 DUPLICATE_EMAIL", async () => {
      const payload = {
        fullName: "Duplicate User",
        email: adminA.email, // already exists
        role: "REQUESTER",
        initialPassword: "InitialSecurePassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", cookieAdminA)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
    });

    it("AC-16-03: rejects duplicate email with case-insensitive check", async () => {
      const payload = {
        fullName: "Duplicate Case User",
        email: adminA.email.toUpperCase(), // already exists in lowercase
        role: "REQUESTER",
        initialPassword: "InitialSecurePassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", cookieAdminA)
        .send(payload);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
    });

    it("AC-16-03: rejects weak initial password with 422 VALIDATION_ERROR", async () => {
      const payload = {
        fullName: "Weak Pass User",
        email: `weak_pass_${Date.now()}@toktickit.com`,
        role: "REQUESTER",
        initialPassword: "weak",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", cookieAdminA)
        .send(payload);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("AC-16-03: rejects invalid role with 422 VALIDATION_ERROR", async () => {
      const payload = {
        fullName: "Invalid Role User",
        email: `invalid_role_${Date.now()}@toktickit.com`,
        role: "ROOT_SUPERUSER",
        initialPassword: "InitialSecurePassword123!",
      };

      const res = await request(app)
        .post("/api/admin/users")
        .set("Cookie", cookieAdminA)
        .send(payload);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ==========================================
  // 4. PATCH /api/admin/users/:id (Editing & Inactive State)
  // ==========================================
  describe("4. PATCH /api/admin/users/:id (Profile Updates & Status)", () => {
    it("AC-16-04: updates fullName, role, and isActive successfully", async () => {
      // Create user to update
      const target = await prisma.user.create({
        data: {
          email: `patch_target_${Date.now()}@toktickit.com`,
          fullName: "Original Name",
          role: UserRole.IT_STAFF,
          passwordHash: await hashPassword("ValidPass123!"),
          isActive: true,
          mustChangePassword: false,
        },
      });
      createdUserIds.push(target.id);

      const res = await request(app)
        .patch(`/api/admin/users/${target.id}`)
        .set("Cookie", cookieAdminA)
        .send({
          fullName: "Updated Full Name",
          role: "ADMINISTRATOR",
          isActive: false,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.fullName).toBe("Updated Full Name");
      expect(res.body.data.role).toBe("ADMINISTRATOR");
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.data).not.toHaveProperty("passwordHash");

      const dbUser = await prisma.user.findUnique({ where: { id: target.id } });
      expect(dbUser!.fullName).toBe("Updated Full Name");
      expect(dbUser!.role).toBe(UserRole.ADMINISTRATOR);
      expect(dbUser!.isActive).toBe(false);
    });

    it("AC-16-04: returns 422 VALIDATION_ERROR when email modification is attempted", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${staffUser.id}`)
        .set("Cookie", cookieAdminA)
        .send({
          email: "modified_email@toktickit.com",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("Email address cannot be modified");
    });

    it("AC-16-04: returns 422 VALIDATION_ERROR when department modification is attempted", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${staffUser.id}`)
        .set("Cookie", cookieAdminA)
        .send({
          department: "Engineering",
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.message).toContain("Department modification is not supported");
    });

    it("AC-16-04: returns 404 USER_NOT_FOUND when updating non-existent user", async () => {
      const res = await request(app)
        .patch("/api/admin/users/9999999")
        .set("Cookie", cookieAdminA)
        .send({ fullName: "Ghost" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  // ==========================================
  // 5. Self-Deactivation Guard (400 CANNOT_DEACTIVATE_SELF)
  // ==========================================
  describe("5. Self-Deactivation Guard", () => {
    it("AC-16-05: blocks administrator from deactivating self with 400 CANNOT_DEACTIVATE_SELF", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminA.id}`)
        .set("Cookie", cookieAdminA)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("CANNOT_DEACTIVATE_SELF");

      // Verify adminA remains active
      const dbAdmin = await prisma.user.findUnique({ where: { id: adminA.id } });
      expect(dbAdmin!.isActive).toBe(true);
    });
  });

  // ==========================================
  // 6. Self-Demotion Session Revocation
  // ==========================================
  describe("6. Self-Demotion Session Revocation", () => {
    it("AC-16-06: demoting self to IT_STAFF succeeds, but immediately revokes admin access on next call", async () => {
      // Create a dedicated third admin to demote so we don't disturb adminA or adminB
      const adminC = await prisma.user.create({
        data: {
          email: `admin_c_${Date.now()}@toktickit.com`,
          fullName: "Self Demoting Admin",
          role: UserRole.ADMINISTRATOR,
          passwordHash: await hashPassword("ValidPass123!"),
          isActive: true,
          mustChangePassword: false,
        },
      });
      createdUserIds.push(adminC.id);
      const cookieAdminC = createTestSessionCookie(adminC);

      // Verify adminC can access admin endpoint
      const beforeRes = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookieAdminC);
      expect(beforeRes.status).toBe(200);

      // Demote self to IT_STAFF
      const demoteRes = await request(app)
        .patch(`/api/admin/users/${adminC.id}`)
        .set("Cookie", cookieAdminC)
        .send({ role: "IT_STAFF" });

      expect(demoteRes.status).toBe(200);
      expect(demoteRes.body.data.role).toBe("IT_STAFF");

      // Verify immediately revoked on next request with existing session cookie
      const afterRes = await request(app)
        .get("/api/admin/users")
        .set("Cookie", cookieAdminC);

      expect(afterRes.status).toBe(403);
      expect(afterRes.body.error.code).toBe("FORBIDDEN_ROLE");
    });
  });

  // ==========================================
  // 7. Last Active Administrator Protection & Concurrency
  // ==========================================
  describe("7. Last Active Administrator Protection & Concurrency", () => {
    it("AC-16-07: prevents deactivating or demoting the last remaining active admin with 409 LAST_ADMIN_PROTECTED", async () => {
      // Find all currently active administrators with mustChangePassword=false
      const currentActiveAdmins = await prisma.user.findMany({
        where: { role: UserRole.ADMINISTRATOR, isActive: true, mustChangePassword: false },
      });

      const soleAdmin = currentActiveAdmins[0];

      // Deactivate all OTHER active admins temporarily so soleAdmin is the only active admin
      const allOtherActive = await prisma.user.findMany({
        where: { role: UserRole.ADMINISTRATOR, isActive: true, id: { not: soleAdmin.id } },
      });

      await prisma.user.updateMany({
        where: { id: { in: allOtherActive.map((u) => u.id) } },
        data: { isActive: false },
      });

      try {
        const soleCookie = createTestSessionCookie(soleAdmin);

        // Attempting to demote the sole admin must return 409 LAST_ADMIN_PROTECTED
        const demoteRes = await request(app)
          .patch(`/api/admin/users/${soleAdmin.id}`)
          .set("Cookie", soleCookie)
          .send({ role: "IT_STAFF" });

        expect(demoteRes.status).toBe(409);
        expect(demoteRes.body.error.code).toBe("LAST_ADMIN_PROTECTED");
      } finally {
        // Restore others to active
        await prisma.user.updateMany({
          where: { id: { in: allOtherActive.map((u) => u.id) } },
          data: { isActive: true },
        });
      }
    });

    it("AC-16-07: handles simultaneous demotion race gracefully (last-admin protection under concurrency)", async () => {
      // Setup: exactly 2 active administrators exist
      const now = Date.now();
      const adminRace1 = await prisma.user.create({
        data: {
          email: `race1_${now}@toktickit.com`,
          fullName: "Race Admin 1",
          role: UserRole.ADMINISTRATOR,
          passwordHash: await hashPassword("ValidPass123!"),
          isActive: true,
          mustChangePassword: false,
        },
      });
      createdUserIds.push(adminRace1.id);

      const adminRace2 = await prisma.user.create({
        data: {
          email: `race2_${now}@toktickit.com`,
          fullName: "Race Admin 2",
          role: UserRole.ADMINISTRATOR,
          passwordHash: await hashPassword("ValidPass123!"),
          isActive: true,
          mustChangePassword: false,
        },
      });
      createdUserIds.push(adminRace2.id);

      // Deactivate all OTHER active admins so exactly adminRace1 and adminRace2 are active
      const allActive = await prisma.user.findMany({
        where: {
          role: UserRole.ADMINISTRATOR,
          isActive: true,
          id: { notIn: [adminRace1.id, adminRace2.id] },
        },
      });

      await prisma.user.updateMany({
        where: { id: { in: allActive.map((u) => u.id) } },
        data: { isActive: false },
      });

      const cookieRace1 = createTestSessionCookie(adminRace1);

      try {
        // Both requests executed concurrently by adminRace1 attempting to demote both admins
        const [res1, res2] = await Promise.all([
          request(app)
            .patch(`/api/admin/users/${adminRace2.id}`)
            .set("Cookie", cookieRace1)
            .send({ role: "IT_STAFF" }),
          request(app)
            .patch(`/api/admin/users/${adminRace1.id}`)
            .set("Cookie", cookieRace1)
            .send({ role: "IT_STAFF" }),
        ]);

        const statuses = [res1.status, res2.status].sort();
        // One must succeed (200) and the second must be rejected (409)
        expect(statuses).toEqual([200, 409]);

        const errorRes = res1.status === 409 ? res1 : res2;
        expect(errorRes.body.error.code).toBe("LAST_ADMIN_PROTECTED");

        // Confirm active admin count in DB is exactly 1 (never dropped to 0)
        const remainingAdmins = await prisma.user.count({
          where: { role: UserRole.ADMINISTRATOR, isActive: true },
        });
        expect(remainingAdmins).toBe(1);
      } finally {
        // Restore all deactivated admins
        await prisma.user.updateMany({
          where: { id: { in: allActive.map((u) => u.id) } },
          data: { isActive: true },
        });
      }
    });
  });

  // ==========================================
  // 8. POST /api/admin/users/:id/initial-password
  // ==========================================
  describe("8. POST /api/admin/users/:id/initial-password (Reset Password)", () => {
    it("AC-16-08: resets password, enforces mustChangePassword=true, and leaves isActive unchanged", async () => {
      // Target user that is inactive
      const inactiveTarget = await prisma.user.create({
        data: {
          email: `reset_target_${Date.now()}@toktickit.com`,
          fullName: "Reset Target Inactive",
          role: UserRole.IT_STAFF,
          passwordHash: await hashPassword("OldPass123!"),
          isActive: false, // remains false!
          mustChangePassword: false,
        },
      });
      createdUserIds.push(inactiveTarget.id);

      const newPassword = "BrandNewSecurePassword123!";
      const res = await request(app)
        .post(`/api/admin/users/${inactiveTarget.id}/initial-password`)
        .set("Cookie", cookieAdminA)
        .send({ initialPassword: newPassword });

      expect(res.status).toBe(200);
      expect(res.body.data.message).toContain("Initial password updated successfully");

      // Verify DB state
      const updatedUser = await prisma.user.findUnique({
        where: { id: inactiveTarget.id },
      });
      expect(updatedUser!.isActive).toBe(false); // Invariant: isActive preserved!
      expect(updatedUser!.mustChangePassword).toBe(true);
      expect(await verifyPassword(newPassword, updatedUser!.passwordHash)).toBe(true);
    });

    it("AC-16-08: validates password policy on initial password reset", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${requesterUser.id}/initial-password`)
        .set("Cookie", cookieAdminA)
        .send({ initialPassword: "123" });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("AC-16-08: returns 404 USER_NOT_FOUND when resetting password for non-existent user", async () => {
      const res = await request(app)
        .post("/api/admin/users/9999999/initial-password")
        .set("Cookie", cookieAdminA)
        .send({ initialPassword: "ValidNewPassword123!" });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe("USER_NOT_FOUND");
    });
  });

  // ==========================================
  // 9. Cross-Functional Inactive Owner Guardrails
  // ==========================================
  describe("9. Inactive Staff Assignment & Queue Guardrails", () => {
    it("AC-16-09: deactivated staff cannot be assigned to tickets (422 INACTIVE_OWNER) and is excluded from /api/staff/users", async () => {
      // 1. Create active staff
      const now = Date.now();
      const techUser = await prisma.user.create({
        data: {
          email: `tech_deact_${now}@toktickit.com`,
          fullName: "Tech To Deactivate",
          role: UserRole.IT_STAFF,
          passwordHash: await hashPassword("ValidPass123!"),
          isActive: true,
          mustChangePassword: false,
        },
      });
      createdUserIds.push(techUser.id);

      // Create a category and open ticket
      const category = await prisma.category.findFirstOrThrow();
      const ticket = await prisma.ticket.create({
        data: {
          ticketNo: `TKT-DEACT-${now}-001`,
          summary: "Deactivated Staff Assign Test",
          description: "Testing assignment guard on deactivated staff.",
          requestedPriority: Priority.P2_MEDIUM,
          status: TicketStatus.OPEN,
          categoryId: category.id,
          requesterId: requesterUser.id,
        },
      });
      createdTicketIds.push(ticket.id);

      // Verify techUser is present in /api/staff/users
      const staffListBefore = await request(app)
        .get("/api/staff/users")
        .set("Cookie", cookieStaff);
      expect(staffListBefore.status).toBe(200);
      expect(staffListBefore.body.data.some((u: any) => u.id === techUser.id)).toBe(true);

      // 2. Admin deactivates techUser
      const deactRes = await request(app)
        .patch(`/api/admin/users/${techUser.id}`)
        .set("Cookie", cookieAdminA)
        .send({ isActive: false });
      expect(deactRes.status).toBe(200);
      expect(deactRes.body.data.isActive).toBe(false);

      // 3. Verify techUser is now EXCLUDED from /api/staff/users
      const staffListAfter = await request(app)
        .get("/api/staff/users")
        .set("Cookie", cookieStaff);
      expect(staffListAfter.status).toBe(200);
      expect(staffListAfter.body.data.some((u: any) => u.id === techUser.id)).toBe(false);

      // 4. Attempting to assign ticket to deactivated techUser must fail with 422 INACTIVE_OWNER
      const assignRes = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/assign`)
        .set("Cookie", cookieStaff)
        .send({ ownerId: techUser.id });

      expect(assignRes.status).toBe(422);
      expect(assignRes.body.error.code).toBe("INACTIVE_OWNER");
    });
  });
});
