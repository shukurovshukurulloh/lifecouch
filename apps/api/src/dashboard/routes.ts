import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { asyncHandler } from "../lib/asyncHandler.js";
import { buildDashboardSummary } from "./summary.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const summary = await buildDashboardSummary(req.user!.id);
    res.json({ summary });
  }),
);
