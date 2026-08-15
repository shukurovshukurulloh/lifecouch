import http from "node:http";
import { createApp } from "./app.js";
import { createChatServer } from "./chat/socket.js";
import { env } from "./env.js";
import { scheduleDailyReminders } from "./reminders/job.js";

const app = createApp();

scheduleDailyReminders();

const httpServer = http.createServer(app);
createChatServer(httpServer, env.webOrigin);

httpServer.listen(env.port, () => {
  console.log(`Lifecouch API listening on port ${env.port}`);
});
