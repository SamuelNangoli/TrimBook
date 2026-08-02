/**
 * Database seed.
 *
 * Creates a super admin, a demo barbershop (owner + trial subscription + a
 * barber and services) and a demo customer. Idempotent: safe to run repeatedly.
 *
 * Run with:  npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123";

async function hash(pw: string) {
  return bcrypt.hash(pw, 12);
}

async function main() {
  const passwordHash = await hash(DEMO_PASSWORD);

  // --- Super admin ----------------------------------------------------------
  await prisma.user.upsert({
    where: { email: "admin@trimbook.app" },
    update: {},
    create: {
      email: "admin@trimbook.app",
      name: "Platform Admin",
      role: "SUPER_ADMIN",
      passwordHash,
    },
  });

  // --- Demo shop owner + shop + trial subscription --------------------------
  const owner = await prisma.user.upsert({
    where: { email: "owner@trimbook.app" },
    update: {},
    create: {
      email: "owner@trimbook.app",
      name: "Sam the Owner",
      role: "OWNER",
      phone: "+256700000001",
      passwordHash,
    },
  });

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const shop = await prisma.shop.upsert({
    where: { slug: "fresh-cuts-kampala" },
    update: {},
    create: {
      name: "Fresh Cuts Kampala",
      slug: "fresh-cuts-kampala",
      description: "Premium grooming in the heart of Kampala.",
      city: "Kampala",
      phone: "+256700000001",
      email: "owner@trimbook.app",
      ownerId: owner.id,
      subscription: {
        create: {
          plan: "STARTER",
          status: "TRIAL",
          amount: 25000,
          trialEndsAt,
          currentPeriodStart: now,
          currentPeriodEnd: trialEndsAt,
        },
      },
    },
  });

  // Bind the owner to the shop.
  await prisma.user.update({
    where: { id: owner.id },
    data: { shopId: shop.id },
  });

  // --- A barber (with login) ------------------------------------------------
  const barberUser = await prisma.user.upsert({
    where: { email: "barber@trimbook.app" },
    update: {},
    create: {
      email: "barber@trimbook.app",
      name: "Bruno the Barber",
      role: "BARBER",
      shopId: shop.id,
      passwordHash,
    },
  });

  await prisma.barber.upsert({
    where: { userId: barberUser.id },
    update: {},
    create: {
      shopId: shop.id,
      userId: barberUser.id,
      name: "Bruno the Barber",
      speciality: "Fades & beard sculpting",
      status: "ACTIVE",
    },
  });

  // --- Services -------------------------------------------------------------
  const services = [
    { name: "Haircut", price: 15000, durationMinutes: 30 },
    { name: "Beard Trim", price: 8000, durationMinutes: 20 },
    { name: "Kids Haircut", price: 10000, durationMinutes: 30 },
    { name: "Hair Wash", price: 5000, durationMinutes: 15 },
    { name: "VIP Grooming", price: 40000, durationMinutes: 60 },
  ];

  for (const s of services) {
    const exists = await prisma.service.findFirst({
      where: { shopId: shop.id, name: s.name },
      select: { id: true },
    });
    if (!exists) {
      await prisma.service.create({ data: { ...s, shopId: shop.id } });
    }
  }

  // --- Demo customer --------------------------------------------------------
  await prisma.user.upsert({
    where: { email: "customer@trimbook.app" },
    update: {},
    create: {
      email: "customer@trimbook.app",
      name: "Carol the Customer",
      role: "CUSTOMER",
      phone: "+256700000002",
      passwordHash,
    },
  });

  console.log("✅ Seed complete. Demo logins (password: %s):", DEMO_PASSWORD);
  console.log("   super admin : admin@trimbook.app");
  console.log("   shop owner  : owner@trimbook.app");
  console.log("   barber      : barber@trimbook.app");
  console.log("   customer    : customer@trimbook.app");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
