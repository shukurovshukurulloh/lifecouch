import { defineConfig } from "vitest/config";

// Integratsion testlar haqiqiy Postgres'ga ulanadi — lekin dev bazasini (`lifecouch`)
// EMAS, alohida `lifecouch_test` bazasini ishlatadi (globalSetup uni yaratadi/sxemani
// push qiladi). Shu tufayli testlar hech qachon lokal dev ma'lumotlarini o'chirmaydi.
const TEST_DATABASE_URL = "postgresql://lifecouch:lifecouch123@localhost:5432/lifecouch_test?schema=public";

export default defineConfig({
  test: {
    environment: "node",
    globalSetup: ["./test/globalSetup.ts"],
    setupFiles: ["./test/setup.ts"],
    fileParallelism: false, // bitta test bazasini bo'lishishadi — parallel fayllar bir-birining yozuvlarini tozalab yuborishi mumkin
    testTimeout: 15000,
    hookTimeout: 30000,
    env: {
      NODE_ENV: "test",
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: "test-jwt-secret",
      WEB_ORIGIN: "http://localhost:5173",
      PORT: "4001",
      // STRIPE_SECRET_KEY va ANTHROPIC_API_KEY ataylab bo'sh qoldirilgan — shu bilan
      // billing/stripeClient.ts va ai/client.ts lokal stub rejimida ishlaydi.
    },
  },
});
