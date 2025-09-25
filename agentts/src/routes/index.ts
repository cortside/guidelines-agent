import { Router } from "express";
import { ChatController } from "../controllers/chatController.js";
import { HealthController } from "../controllers/healthController.js";
import { createChatRoutes } from "./chat.js";
import { createHealthRoutes } from "./health.js";

export function createRoutes(
  chatController: ChatController,
  healthController: HealthController
): Router {
  const router = Router();

  // Mount route modules
  router.use(createChatRoutes(chatController));
  router.use(createHealthRoutes(healthController));

  return router;
}
