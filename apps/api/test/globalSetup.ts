import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const apiRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const TEST_DATABASE_URL = "postgresql://lifecouch:lifecouch123@localhost:5432/lifecouch_test?schema=public";

/**
 * Test to'plami boshlanishidan oldin BIR MARTA ishga tushadi: `lifecouch_test` bazasini
 * (agar mavjud bo'lmasa) yaratadi va Prisma sxemasini u bilan sinxronlashtiradi.
 * Hech qachon lokal dev bazasiga (`lifecouch`) tegmaydi — vitest.config.ts'dagi izohga qarang.
 */
export default function globalSetup(): void {
  execSync("npx prisma db push --skip-generate --accept-data-loss", {
    cwd: apiRoot,
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: "inherit",
  });
}
