import { Router } from "express";
import { ThreadsController } from "../controllers/threadsController.js";

export function createThreadsRouter(threadsController: ThreadsController): Router {
  const router = Router();

  // GET /threads/stats - Get thread storage statistics (must be before /:threadId)
  router.get("/stats", threadsController.getThreadStats.bind(threadsController));

  // GET /threads - Get all threads
  router.get("/", threadsController.getAllThreads.bind(threadsController));

  // POST /threads - Create new thread (optional)
  router.post("/", threadsController.createThread.bind(threadsController));

  // PATCH /threads/:threadId - Update thread (e.g., rename)
  router.patch("/:threadId", threadsController.updateThread.bind(threadsController));

  // DELETE /threads/:threadId - Delete thread
  router.delete("/:threadId", threadsController.deleteThread.bind(threadsController));

  return router;
}
