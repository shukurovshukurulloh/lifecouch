import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { prisma } from "../db.js";
import { asyncHandler } from "../lib/asyncHandler.js";

export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.get(
  "/:otherUserId/messages",
  asyncHandler(async (req, res) => {
    const { otherUserId } = req.params;
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: req.user!.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: req.user!.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
    res.json({ messages });
  }),
);
