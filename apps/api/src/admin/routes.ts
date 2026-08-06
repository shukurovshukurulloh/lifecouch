import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";

export const adminRouter = Router();

/** RBAC middleware'ning ADMIN roliga cheklanganini tekshirish uchun minimal marshrut. */
adminRouter.get("/ping", requireAuth, requireRole(Role.ADMIN), (_req, res) => {
  res.json({ ok: true });
});
