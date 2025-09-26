import { Router } from "express";
import { ChatController } from "../controllers/chatController.js";
import { HealthController } from "../controllers/healthController.js";
import { ThreadsController } from "../controllers/threadsController.js";
import { createChatRoutes } from "./chat.js";
import { createHealthRoutes } from "./health.js";
import { createThreadsRouter } from "./threads.js";

export function createRoutes(
  chatController: ChatController,
  healthController: HealthController,
  threadsController: ThreadsController
): Router {
  const router = Router();

  // Mount route modules
  router.use(createChatRoutes(chatController));
  router.use(createHealthRoutes(healthController));
  router.use("/threads", createThreadsRouter(threadsController));

  return router;
}
