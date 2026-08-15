import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import { adminRouter } from "./admin/routes.js";
import { aiRouter } from "./ai/routes.js";
import { authRouter } from "./auth/routes.js";
import { billingRouter, billingWebhookHandler } from "./billing/routes.js";
import { chatRouter } from "./chat/routes.js";
import { coachesRouter } from "./coaches/routes.js";
import { dashboardRouter } from "./dashboard/routes.js";
import { env } from "./env.js";
import { goalsRouter } from "./goals/routes.js";
import { sessionsRouter } from "./sessions/routes.js";
import { usersRouter } from "./users/routes.js";

/**
 * Express ilovasini quradi va qaytaradi — HTTP serverga ulash yoki test
 * muhitida (supertest bilan, port ochmasdan) ishlatish uchun ajratilgan.
 * Server bootstrap (listen, socket.io, cron) — index.ts'da.
 */
export function createApp(): express.Express {
  const app = express();

  app.use(cors({ origin: env.webOrigin, credentials: true }));
  app.use(cookieParser());

  // Stripe webhook imzosi xom (raw) body'ga muhtoj — shuning uchun express.json()dan OLDIN,
  // alohida raw parser bilan ulanadi.
  app.post("/api/billing/webhook", express.raw({ type: "application/json" }), billingWebhookHandler);

  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRouter);
  app.use("/api/users", usersRouter);
  app.use("/api/admin", adminRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/goals", goalsRouter);
  app.use("/api/coaches", coachesRouter);
  app.use("/api/sessions", sessionsRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/billing", billingRouter);
  app.use("/api/ai", aiRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Server xatosi, keyinroq urinib ko'ring" });
  });

  return app;
}
