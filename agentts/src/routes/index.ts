import { Router } from "express";
import { ChatController } from '../controllers/chatController.ts';
import { HealthController } from '../controllers/healthController.ts';
import { ThreadsController } from '../controllers/threadsController.ts';
import { createChatRoutes } from './chat.ts';
import { createHealthRoutes } from './health.ts';
import { createThreadsRouter } from './threads.ts';

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
