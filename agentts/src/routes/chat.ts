import { Router } from "express";
import { ChatController } from "../controllers/chatController.js";
import { validateChatRequest, validateThreadId } from "../middleware/validator.js";

export function createChatRoutes(chatController: ChatController): Router {
  const router = Router();

  router.post("/chat", validateChatRequest, (req, res, next) => 
    chatController.handleChatMessage(req, res, next)
  );

  router.get("/threads/:threadId", validateThreadId, (req, res, next) =>
    chatController.getThreadHistory(req, res, next)
  );

  return router;
}
