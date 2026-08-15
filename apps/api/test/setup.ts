import { afterAll, beforeEach } from "vitest";
import { prisma } from "../src/db.js";

// User — deyarli barcha modellarning FK zanjiri boshlanadigan joy, shuning uchun uni
// CASCADE bilan tozalash barcha bog'liq jadvallarni (Coach, Session, Goal, ...) ham tozalaydi.
beforeEach(async () => {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" RESTART IDENTITY CASCADE;');
});

afterAll(async () => {
  await prisma.$disconnect();
});
