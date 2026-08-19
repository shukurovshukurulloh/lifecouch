import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { verifyAccessToken } from "../auth/tokens.js";
import { prisma } from "../db.js";
import { captureError } from "../monitoring/sentry.js";

interface SendMessagePayload {
  receiverId: string;
  content: string;
}

export function createChatServer(httpServer: HttpServer, corsOrigin: string): Server {
  const io = new Server(httpServer, {
    cors: { origin: corsOrigin, credentials: true },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;
    if (!token) {
      next(new Error("Avtorizatsiya talab qilinadi"));
      return;
    }
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Token yaroqsiz yoki muddati o'tgan"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    void socket.join(userId);

    socket.on("message:send", (payload: SendMessagePayload, ack?: (message: unknown) => void) => {
      if (!payload?.receiverId || !payload.content?.trim()) {
        return;
      }
      prisma.message
        .create({ data: { senderId: userId, receiverId: payload.receiverId, content: payload.content.trim() } })
        .then((message) => {
          io.to(userId).to(payload.receiverId).emit("message:new", message);
          ack?.(message);
        })
        .catch((err: unknown) => captureError(err, "[chat] xabar saqlanmadi:"));
    });
  });

  return io;
}
