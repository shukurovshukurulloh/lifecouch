import http from "node:http";
import { createApp } from "./app.js";
import { createChatServer } from "./chat/socket.js";
import { env } from "./env.js";
import { captureError } from "./monitoring/sentry.js";
import { scheduleDailyReminders } from "./reminders/job.js";

// createApp() ichida initMonitoring() chaqiriladi — shu yerdan keyin Sentry
// sozlangan bo'lsa (SENTRY_DSN mavjud bo'lsa) process darajasidagi kutilmagan
// xatolar ham kuzatiladi, bo'lmasa faqat konsolga yoziladi (stub rejim).
const app = createApp();

process.on("unhandledRejection", (reason) => {
  captureError(reason, "[process] unhandledRejection");
});
process.on("uncaughtException", (err) => {
  captureError(err, "[process] uncaughtException");
});

scheduleDailyReminders();

const httpServer = http.createServer(app);
createChatServer(httpServer, env.webOrigin);

httpServer.listen(env.port, () => {
  console.log(`Lifecouch API listening on port ${env.port}`);
});
