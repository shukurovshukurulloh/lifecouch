import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import { attachExpressErrorHandler, captureError, initMonitoring } from "./monitoring/sentry.js";
import { sessionsRouter } from "./sessions/routes.js";
import { usersRouter } from "./users/routes.js";

/**
 * Express ilovasini quradi va qaytaradi — HTTP serverga ulash yoki test
 * muhitida (supertest bilan, port ochmasdan) ishlatish uchun ajratilgan.
 * Server bootstrap (listen, socket.io, cron) — index.ts'da.
 */
export function createApp(): express.Express {
  initMonitoring();

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

  // Production'da bitta Render web-service ham API'ni, ham build qilingan frontendni
  // xizmat qiladi (alohida statik-sayt/CDN xizmati emas) — shu bilan brauzer nuqtai
  // nazaridan hammasi bitta origin bo'lib qoladi, /api va /socket.io nisbiy yo'llar
  // (apps/web/src/lib/api.ts, lib/socket.ts) hech qanday o'zgarishsiz ishlaydi va
  // cross-site cookie/CORS murakkabligi umuman kerak bo'lmaydi. Lokal dev'da web o'z
  // Vite serverida (5173-port, proksi bilan) alohida ishlaydi — bu blok shunda ishlamaydi.
  if (env.nodeEnv === "production") {
    const webDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../web/dist");
    if (fs.existsSync(webDist)) {
      app.use(express.static(webDist));
      app.get("*", (req, res, next) => {
        if (req.path.startsWith("/api") || req.path.startsWith("/socket.io") || req.path === "/health") {
          next();
          return;
        }
        res.sendFile(path.join(webDist, "index.html"));
      });
    } else {
      console.warn(`[app] web/dist topilmadi (${webDist}) — frontend xizmat qilinmaydi, faqat API ishlaydi.`);
    }
  }

  attachExpressErrorHandler(app);

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    captureError(err, `[app] ${req.method} ${req.path}`);
    res.status(500).json({ error: "Server xatosi, keyinroq urinib ko'ring" });
  });

  return app;
}
